const prisma = require('../../config/prisma');
const redis = require('../../config/redis'); 

const clearAdminReportsCache = async () => {
    try {
        const keys = await redis.keys('admin:reports:page:*');
        if (keys.length > 0) {
            await redis.del(keys);
            console.log('[CACHE INVALIDATION] Admin Reports keş təmizləndi.');
        }
    } catch (error) {
        console.error('Admin Reports keşini təmizləmə xətası:', error);
    }
};

const getReports = async (queryParams) => {
    const { page = 1, limit = 10 } = queryParams;

    const cacheKey = `admin:reports:page:${page}:limit:${limit}`;
    try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log(`[CACHE HIT] ✅ Admin şikayətlər siyahısı keşdən tapıldı.`);
            return JSON.parse(cachedData);
        }
    } catch (error) { console.error("Redis-dən oxuma xətası:", error); }

    console.log(`[CACHE MISS] ❌ Admin şikayətlər siyahısı keşdə tapılmadı.`);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reports, total] = await prisma.$transaction([
        prisma.report.findMany({
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit),
            include: {
                reporter: { include: { profile: true } },
                reportedUser: { include: { profile: true } },
                reportedMessage: true,
                reportedGroupMessage: true,
            }
        }),
        prisma.report.count()
    ]);

    const result = { data: reports, totalPages: Math.ceil(total / parseInt(limit)), currentPage: parseInt(page) };

    try {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 600); // 10 dəqiqəlik keş
    } catch (error) { console.error("Redis-ə yazma xətası:", error); }

    return result;
};

const updateReportStatus = async (reportId, status) => {
    // Statusun Enum-a uyğun olduğunu yoxlayırıq
    if (!['PENDING', 'RESOLVED', 'REJECTED'].includes(status)) {
        throw new Error('Yanlış status dəyəri.');
    }
        await clearAdminReportsCache();

    return prisma.report.update({
        where: { id: reportId },
        data: { status: status },
    });
};

const deleteMessage = async (messageId) => {
    return prisma.message.delete({ where: { id: messageId } });
};

module.exports = {
    getReports,
    updateReportStatus,
    deleteMessage
};  