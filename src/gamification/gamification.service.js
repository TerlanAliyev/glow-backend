
const prisma = require('../config/prisma');
const { createAndSendNotification } = require('../notification/notification.service');

// Bu funksiya gələcəkdə bütün nişan yoxlamalarını idarə edəcək
const checkAndGrantBadges = async (userId, action, tx) => {
    // tx, Prisma transaction client-dir. Bu, əməliyyatların atomik olmasını təmin edir.
    const prismaClient = tx || prisma;

    if (action === 'NEW_MATCH') {
        await checkSocialButterflyBadge(userId, prismaClient);
    }
    // Gələcəkdə bura yeni yoxlamalar əlavə ediləcək
    // if (action === 'NEW_CHECKIN') { ... }
};

const checkSocialButterflyBadge = async (userId, prismaClient) => {
    try {
        const badgeCode = 'SOCIAL_BUTTERFLY_1';
        const requiredMatches = 10;

        // 1. İstifadəçinin bu nişanı artıq qazanıb-qazanmadığını yoxlayırıq
        const existingBadge = await prismaClient.userBadge.findFirst({
            where: {
                userId: userId,
                badge: { code: badgeCode }
            }
        });
        if (existingBadge) return; // Əgər artıq varsa, heç nə etmirik

        // 2. İstifadəçinin ümumi "match" sayını hesablayırıq
        const matchCount = await prismaClient.connection.count({
            where: {
                OR: [{ userAId: userId }, { userBId: userId }]
            }
        });

        // 3. Əgər şərt ödənilirsə, nişanı veririk
        if (matchCount >= requiredMatches) {
            const badge = await prismaClient.badge.findUnique({ where: { code: badgeCode } });
            if (badge) {
                await prismaClient.userBadge.create({
                    data: {
                        userId: userId,
                        badgeId: badge.id
                    }
                });

                // İstifadəçiyə bildiriş göndəririk
                await createAndSendNotification(
                    userId,
                    'NEW_BADGE_UNLOCKED',
                    `Yeni Nişan qazandınız: ${badge.name}! 🎉`,
                    { badgeCode: badge.code }
                );
            }
        }
    } catch (error) {
        // Bu xəta əsas prosesi dayandırmamalıdır, ona görə də sadəcə loglayırıq
        console.error(`[GAMIFICATION_ERROR] "${badgeCode}" nişanı verilərkən xəta baş verdi:`, error);
    }
};
const getAllBadges = () => {
    return prisma.badge.findMany({
        orderBy: { createdAt: 'desc' }
    });
};

const createBadge = (data) => {
    const { code, name, description, iconUrl } = data;
    return prisma.badge.create({
        data: { code, name, description, iconUrl }
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
module.exports = {
    checkAndGrantBadges,
    getAllBadges,
    createBadge,
    updateBadge,
    deleteBadge,
    checkSocialButterflyBadge,
    getBadgesForUser

};