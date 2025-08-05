
const prisma = require('../config/prisma');
const { sendAccountDeletionEmail } = require('../config/mailer'); // Bunu faylın yuxarısına əlavə edin

const blockUser = async (blockerId, blockedId) => {
    if (blockerId === blockedId) {
        throw new Error('İstifadəçi özünü bloklaya bilməz.');
    }

    return prisma.$transaction(async (tx) => {
        // Blok qeydinin təkrar olub-olmadığını yoxlayırıq
        const existingBlock = await tx.block.findUnique({
            where: { blockerId_blockedId: { blockerId, blockedId } }
        });
        if (existingBlock) return; // Əgər artıq bloklanıbsa, heç nə etmirik

        await tx.block.create({
            data: { blockerId, blockedId },
        });

        await tx.connection.deleteMany({
            where: {
                OR: [
                    { userAId: blockerId, userBId: blockedId },
                    { userAId: blockedId, userBId: blockerId },
                ],
            },
        });
    });
};

const unblockUser = async (blockerId, blockedId) => {
    // Blok qeydini silirik
    return prisma.block.deleteMany({
        where: {
            blockerId: blockerId,
            blockedId: blockedId,
        },
    });
};

const getBlockedUsers = async (userId) => {
    const blocks = await prisma.block.findMany({
        where: {
            blockerId: userId,
        },
        // Bloklanan istifadəçilərin profil məlumatlarını da gətiririk
        include: {
            blocked: {
                include: {
                    profile: true,
                },
            },
        },
    });

    // Nəticəni səliqəli bir formata salırıq
    return blocks.map(block => {
        // Təhlükəsizlik üçün gizli məlumatları silirik
        delete block.blocked.password;
        return block.blocked;
    });
};

const reportUser = async (reporterId, reportedId, reason) => {
    if (reporterId === reportedId) {
        throw new Error('İstifadəçi özünü şikayət edə bilməz.');
    }

    // === YENİ RATE LIMITING MƏNTİQİ ===
    // Son 24 saat üçün bir tarix obyekti yaradırıq
    const twentyFourHoursAgo = new Date(new Date() - 24 * 60 * 60 * 1000);

    // Bu istifadəçinin digərini son 24 saatda şikayət edib-etmədiyini yoxlayırıq
    const recentReport = await prisma.report.findFirst({
        where: {
            reporterId: reporterId,
            reportedId: reportedId,
            createdAt: {
                gte: twentyFourHoursAgo, // "greater than or equal to"
            },
        },
    });

    // Əgər son 24 saatda bir şikayət varsa, xəta atırıq
    if (recentReport) {
        const error = new Error('Bu istifadəçini artıq şikayət etmisiniz. Zəhmət olmasa, 24 saat sonra yenidən cəhd edin.');
        error.statusCode = 429; // 429 Too Many Requests status kodu
        throw error;
    }

    // Əgər limit keçilməyibsə, əvvəlki məntiqlə davam edirik
    return prisma.$transaction(async (tx) => {
        // 1. Şikayət qeydini yaradırıq
        await tx.report.create({
            data: {
                reporterId,
                reportedId,
                reason,
            },
        });

        // 2. Avtomatik olaraq blok qeydini yaradırıq
        const existingBlock = await tx.block.findUnique({
            where: {
                blockerId_blockedId: {
                    blockerId: reporterId,
                    blockedId: reportedId,
                }
            }
        });

        if (!existingBlock) {
            await tx.block.create({
                data: {
                    blockerId: reporterId,
                    blockedId: reportedId,
                },
            });
        }

        // 3. Əgər aralarında bir bağlantı varsa, onu silirik
        await tx.connection.deleteMany({
            where: {
                OR: [
                    { userAId: reporterId, userBId: reportedId },
                    { userAId: reportedId, userBId: reporterId },
                ],
            },
        });
    });
};

//Premium function to get profile and log view

const getProfileAndLogView = async (targetUserId, viewerId) => {
    
    // ADDIM 1: İstifadəçinin başqasının profilinə baxıb-baxmadığını yoxlayaq
    if (targetUserId !== viewerId) {
        // Əgər başqasının profilinə baxırsa, baxan şəxsin (viewer) məxfiliyini yoxlayaq
        const viewer = await prisma.user.findUnique({
            where: { id: viewerId },
            include: { profile: true }
        });

        if (viewer) {
            const isPremium = viewer.subscription === 'PREMIUM' || (viewer.premiumExpiresAt && viewer.premiumExpiresAt > new Date());
            const hidesFootprints = viewer.profile?.hideViewFootprints || false;

            // Yalnız əgər istifadəçi premium DEYİLSƏ və ya premium olub ayaq izini GİZLƏTMİRSƏ, baxışı qeydə al.
            if (!isPremium || !hidesFootprints) {
                await prisma.profileView.upsert({
                    where: { viewerId_viewedId: { viewerId, viewedId: targetUserId } },
                    update: { createdAt: new Date() },
                    create: { viewerId, viewedId: targetUserId },
                });
            }
        }
    }

    // ADDIM 2: Hər iki halda (istər özünə, istərsə də başqasına baxsın), baxılan şəxsin profilini qaytaraq
    const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
            id: true,
            subscription: true, // Baxılan şəxsin premium olub-olmadığını bilmək üçün
            profile: {
                include: {
                    photos: true,
                    interests: true
                }
            }
        }
    });

    if (!targetUser) {
        const error = new Error('İstifadəçi tapılmadı.');
        error.statusCode = 404;
        throw error;
    }

    return targetUser;
};
const deleteOwnAccount = async (userId, otp) => {
    const deletionRequest = await prisma.accountDeletionToken.findFirst({
        where: {
            userId: userId,
            token: otp,
        }
    });
    if (!deletionRequest || deletionRequest.expiresAt < new Date()) {
        const error = new Error('Təsdiq kodu yanlışdır və ya vaxtı bitib.');
        error.statusCode = 400;
        throw error;
    }
    // Prisma Transaction: Bu əməliyyatların hamısı ya birlikdə uğurlu olur, ya da heç biri icra edilmir.
    return prisma.$transaction(async (tx) => {
        // İstifadəçiyə aid olan bütün asılılıqları silirik
        await tx.signal.deleteMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } });
        await tx.connection.deleteMany({ where: { OR: [{ userAId: userId }, { userBId: userId }] } });
        await tx.report.deleteMany({ where: { OR: [{ reporterId: userId }, { reportedUserId: userId }] } });
        await tx.block.deleteMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } });
        await tx.activeSession.deleteMany({ where: { userId: userId } });
        await tx.device.deleteMany({ where: { userId: userId } });
        await tx.notification.deleteMany({ where: { userId: userId } });
        await tx.feedback.deleteMany({ where: { authorId: userId } });
        await tx.checkInHistory.deleteMany({ where: { userId: userId } });
        await tx.message.deleteMany({ where: { senderId: userId } });
        await tx.profileView.deleteMany({ where: { OR: [{ viewerId: userId }, { viewedId: userId }] } });
        await tx.venueGroupMessage.deleteMany({ where: { senderId: userId } });

        // İstifadəçiyə bağlı şəkilləri silirik (əvvəlcə profili tapmalıyıq)
        const userProfile = await tx.profile.findUnique({ where: { userId: userId } });
        if (userProfile) {
            await tx.photo.deleteMany({ where: { profileId: userProfile.id } });
        }

        // Asılılıqlar silindikdən sonra profili silirik
        await tx.profile.deleteMany({ where: { userId: userId } });

        // Nəhayət, istifadəçinin özünü silirik
        const deletedUser = await tx.user.delete({ where: { id: userId } });

        return deletedUser;
    });
};
const initiateAccountDeletion = async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('İstifadəçi tapılmadı.');

    // Köhnə tokenləri silirik
    await prisma.accountDeletionToken.deleteMany({ where: { userId: userId } });

    // Yeni 6 rəqəmli OTP yaradırıq
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(new Date().getTime() + 10 * 60 * 1000); // 10 dəqiqə sonra

    await prisma.accountDeletionToken.create({
        data: {
            token,
            expiresAt,
            userId: userId,
        }
    });

    // E-poçt göndəririk
    await sendAccountDeletionEmail(user.email, token);
};
const getCheckInHistory = async (userId, { page = 1, limit = 20 }) => {
    const skip = (page - 1) * limit;
    const where = { userId };
    const [history, total] = await prisma.$transaction([
        prisma.checkInHistory.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: { venue: { select: { name: true, address: true } } }
        }),
        prisma.checkInHistory.count({ where })
    ]);
    return { data: history, totalPages: Math.ceil(total / limit), currentPage: page };
};

const deleteCheckInHistory = async (userId) => {
    return prisma.checkInHistory.deleteMany({
        where: { userId },
    });
};
module.exports = {
    blockUser,
    unblockUser,
    getBlockedUsers,
    reportUser,
    getProfileAndLogView,
    deleteOwnAccount,
    initiateAccountDeletion,deleteCheckInHistory,
    getCheckInHistory,
};