
const prisma = require('../config/prisma');
const { createAndSendNotification } = require('../notification/notification.service');


const ruleImplementations = {
    CONNECTION_COUNT: (userId, tx) => tx.connection.count({
        where: { OR: [{ userAId: userId }, { userBId: userId }] }
    }),
    DISTINCT_CHECKIN_COUNT: async (userId, tx) => {
        const checkIns = await tx.checkInHistory.findMany({
            where: { userId: userId },
            distinct: ['venueId']
        });
        return checkIns.length;
    },
    MESSAGES_COUNT_24H: async (userId, tx) => {
        const twentyFourHoursAgo = new Date(new Date() - 24 * 60 * 60 * 1000);
        const privateCount = await tx.message.count({ where: { senderId: userId, createdAt: { gte: twentyFourHoursAgo } } });
        const groupCount = await tx.venueGroupMessage.count({ where: { senderId: userId, createdAt: { gte: twentyFourHoursAgo } } });
        return privateCount + groupCount;
    },
     PROFILE_HAS_BIO: async (userId, tx) => {
        const profile = await tx.profile.findUnique({ where: { userId } });
        // Əgər bio varsa və boş deyilsə 1 (doğru), əks halda 0 (yanlış) qaytarır
        return (profile && profile.bio && profile.bio.trim() !== "") ? 1 : 0;
    },

    // Profilin şəkil sayı
    PHOTO_COUNT: (userId, tx) => tx.photo.count({
        where: { profile: { userId: userId } }
    }),
     PROFILE_COMPLETION_PERCENTAGE: async (userId) => {
        const completionData = await getProfileCompletion(userId);
        return completionData.percentage;
    },
    // GƏLƏCƏKDƏ YENİ BİR QAYDA YAZSANIZ, SADƏCƏ ONU BURAYA ƏLAVƏ EDƏCƏKSİNİZ
};

// Bu funksiya gələcəkdə bütün nişan yoxlamalarını idarə edəcək
const checkAndGrantBadges = async (userId, action, tx) => {
    const prismaClient = tx || prisma;
    try {
        const relevantBadges = await prismaClient.badge.findMany({
            where: { rule: { triggerAction: action } },
            include: { rule: true }
        });
        if (relevantBadges.length === 0) return;

        const userBadges = await prismaClient.userBadge.findMany({
            where: { userId: userId },
            include: { badge: { select: { code: true } } }
        });
        const userBadgeCodes = new Set(userBadges.map(ub => ub.badge.code));

        for (const badge of relevantBadges) {
            if (userBadgeCodes.has(badge.code) || !badge.rule) continue;

            const ruleFunction = ruleImplementations[badge.rule.code];
            if (!ruleFunction) continue; // Əgər qayda üçün kod yazılmayıbsa, ötür

            const currentCount = await ruleFunction(userId, prismaClient);

            if (currentCount >= badge.checkValue) {
                await grantBadge(userId, badge.code, prismaClient, true);
            }
        }
    } catch (error) {
        console.error(`[GAMIFICATION_ENGINE_ERROR] ${action} üçün nişanlar yoxlanılarkən xəta baş verdi:`, error);
    }
};

const getAllBadges = () => {
    return prisma.badge.findMany({
        orderBy: { createdAt: 'desc' }
    });
};

const createBadge = async(data) => {
    // DÜZƏLİŞ: Artıq ruleId və checkValue-nu da datadan götürürük
    const { code, name, description, iconUrl, ruleId, checkValue } = data;
    if (ruleId) {
        const ruleExists = await prisma.badgeRule.findUnique({
            where: { id: Number(ruleId) }
        });
        if (!ruleExists) {
            const error = new Error(`Bu ID (${ruleId}) ilə heç bir qayda tapılmadı.`);
            error.statusCode = 400; // Bad Request
            throw error;
        }
    }
    return prisma.badge.create({
        data: { 
            code, 
            name, 
            description, 
            iconUrl, 
            // Və onları databazaya yazırıq.
            // Formdan gələn datalar string ola biləcəyi üçün onları rəqəmə çevirmək daha təhlükəsizdir.
           ruleId: ruleId ? Number(ruleId) : null, 
            checkValue: checkValue ? Number(checkValue) : null 
        }
    });
};

const updateBadge = (badgeId, data) => {
    return prisma.badge.update({
        where: { id: Number(badgeId) },
        data: data
    });
};

const deleteBadge = (badgeId) => {
    return prisma.badge.delete({
        where: { id: Number(badgeId) }
    });
};

const grantBadge = async (userId, badgeCode, tx, shouldNotify = false) => {
    const prismaClient = tx || prisma;
    try {
        const existingBadge = await prismaClient.userBadge.findFirst({
            where: { userId: userId, badge: { code: badgeCode } }
        });
        if (existingBadge) return;

        const badge = await prismaClient.badge.findUnique({ where: { code: badgeCode } });
        if (badge) {
            await prismaClient.userBadge.create({
                data: { userId: userId, badgeId: badge.id }
            });

            if (shouldNotify) {
                await createAndSendNotification(
                    userId, 'NEW_BADGE_UNLOCKED',
                    `Yeni Nişan qazandınız: ${badge.name}! 🎉`,
                    { badgeCode: badge.code }
                );
            }
        }
    } catch (error) {
        console.error(`[GAMIFICATION_ERROR] "${badgeCode}" nişanı birbaşa verilərkən xəta baş verdi:`, error);
    }
};

// === RULE IMPLEMENTATIONS ===
const getAllBadgeRules = () => prisma.badgeRule.findMany();
const createBadgeRule = (data) => prisma.badgeRule.create({ data });
// === USER-FACING FUNCTIONS ===
const getBadgesForUser = async (userId) => {
    const userBadges = await prisma.userBadge.findMany({
        where: { userId: userId },
        include: {
            badge: true // Hər qazanılmış nişanın öz məlumatlarını da gətiririk
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    // Yalnız nişan məlumatlarını qaytarırıq
    return userBadges.map(ub => ub.badge);
};
const getProfileCompletion = async (userId) => {
    // 1. İstifadəçinin bütün lazımi məlumatlarını bir sorğuda çəkirik
    const userProfile = await prisma.profile.findUnique({
        where: { userId },
        include: {
            photos: { select: { id: true } },
            interests: { select: { id: true } },
        }
    });

    if (!userProfile) {
        const error = new Error('Profil tapılmadı.');
        error.statusCode = 404;
        throw error;
    }

    // 2. Qaydaları və onların "çəkisini" təyin edirik
    const completionCriteria = {
        hasAvatar: { weight: 20, satisfied: userProfile.photos.length > 0 },
        hasBio: { weight: 20, satisfied: !!userProfile.bio && userProfile.bio.trim() !== "" },
        hasThreeInterests: { weight: 20, satisfied: userProfile.interests.length >= 3 },
        hasFourPhotos: { weight: 20, satisfied: userProfile.photos.length >= 4 },
        isVerified: { weight: 20, satisfied: userProfile.isVerified },
    };

    // 3. Ümumi faizi və çatışmayan hissələri hesablayırıq
    let totalPercentage = 0;
    const missingParts = [];

    for (const key in completionCriteria) {
        if (completionCriteria[key].satisfied) {
            totalPercentage += completionCriteria[key].weight;
        } else {
            missingParts.push(key); // Məs: ['hasBio', 'isVerified']
        }
    }
    return {
        percentage: totalPercentage,
        missing: missingParts,
        suggestions: {
            hasAvatar: "Profilinə ilk şəklini əlavə et.",
            hasBio: "Bio (Haqqında) bölməsini dolduraraq özünü tanıt.",
            hasThreeInterests: "Ən azı 3 maraq sahəsi seç.",
            hasFourPhotos: "Daha çox diqqət çəkmək üçün ən az 4 şəkil yüklə.",
            isVerified: "Profilini təsdiqlədərək güvən qazan.",
        }
    };
};
module.exports = {
    checkAndGrantBadges,
    getAllBadges,
    createBadge,
    updateBadge,
    deleteBadge,
    getBadgesForUser,grantBadge,
    getAllBadgeRules,
    createBadgeRule,getProfileCompletion

};