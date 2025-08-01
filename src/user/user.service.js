
const prisma = require('../config/prisma');

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
    // Mənim blokladığım bütün qeydləri tapırıq
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

module.exports = {
    blockUser,
    unblockUser,
    getBlockedUsers,
    reportUser
};