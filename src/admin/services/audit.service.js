const prisma = require('../../config/prisma');

const createAdminLog = async (adminId, action, details = {}) => {
    return prisma.adminLog.create({
        data: { adminId, action, details }
    });
};

const getAdminLogs = async (queryParams) => {
    let page = parseInt(queryParams.page, 10);
    let limit = parseInt(queryParams.limit, 10);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 20;

    const skip = (page - 1) * limit;

    const logs = await prisma.adminLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limit,
        include: {
            admin: {
                include: {
                    profile: { select: { name: true } }
                }
            }
        }
    });

    // DƏYİŞİKLİK BURADA BAŞLAYIR
    // Hər bir log üçün əlavə məlumatları (hədəf adını) çəkmək üçün yeni bir məntiq
    const enrichedLogs = await Promise.all(
        logs.map(async (log) => {
            const details = log.details; // Prisma JSON-u avtomatik olaraq obyektə çevirir
            let targetName = null;

            // Əgər hədəf istifadəçidirsə, onun adını tapırıq
            if (details && details.targetUserId) {
                const user = await prisma.user.findUnique({
                    where: { id: details.targetUserId },
                    select: { profile: { select: { name: true } } }
                });
                targetName = user?.profile?.name || null;
            }
            // Gələcəkdə digər tiplər üçün də yoxlamalar əlavə edə bilərsiniz
            // else if (details && details.targetVenueId) {
            //     const venue = await prisma.venue.findUnique({ where: { id: details.targetVenueId }, select: { name: true } });
            //     targetName = venue?.name || null;
            // }

            // Orijinal log obyektinə yeni "details" sahəsi əlavə edirik
            return {
                ...log,
                details: {
                    ...details,
                    targetName: targetName || 'N/A (Silinib və ya tapılmadı)'
                }
            };
        })
    );
    // DƏYİŞİKLİK BURADA BİTİR

    const totalLogs = await prisma.adminLog.count();

    return {
        data: enrichedLogs, // Frontend-ə zənginləşdirilmiş datanı göndəririk
        totalPages: Math.ceil(totalLogs / limit),
        currentPage: page
    };
};

module.exports = {
    createAdminLog,
    getAdminLogs
};