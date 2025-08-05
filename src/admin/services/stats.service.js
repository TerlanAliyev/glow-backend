const prisma = require('../../config/prisma');
const { calculateVenueStatistics } = require('../../scheduler/scheduler.service');


const getStatsSummary = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
        totalUsers, newUsersToday, activeSessions, totalConnections, pendingReports
    ] = await prisma.$transaction([
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: today } } }),
        prisma.activeSession.count(),
        prisma.connection.count(),
        prisma.report.count({ where: { status: 'PENDING' } })
    ]);

    return { totalUsers, newUsersToday, activeSessions, totalConnections, pendingReports };
};

const getUsageOverTime = async () => {
    const result = await prisma.$queryRaw`
        SELECT 
            DATE("createdAt") as date, 
            COUNT(id) as count 
        FROM "User" 
        WHERE "createdAt" >= NOW() - INTERVAL '30 days' 
        GROUP BY DATE("createdAt") 
        ORDER BY date ASC;
    `;

    // === DÜZƏLİŞ BURADADIR ===
    // Databazadan gələn `BigInt` tipini JSON-un anladığı `Number`-a çeviririk.
    return result.map(row => ({
        ...row,
        count: Number(row.count)
    }));
};

const getPopularVenues = async () => {
    // Artıq `ActiveSession` yox, `CheckInHistory` cədvəlindən oxuyuruq.
    const result = await prisma.checkInHistory.groupBy({
        by: ['venueId'],
        _count: {
            venueId: true,
        },
        orderBy: {
            _count: {
                venueId: 'desc',
            },
        },
        take: 10,
    });

    if (result.length === 0) return [];

    const venueIds = result.map(item => item.venueId);
    const venues = await prisma.venue.findMany({
        where: { id: { in: venueIds } },
        select: { id: true, name: true }
    });
    const venueMap = new Map(venues.map(v => [v.id, v.name]));

    return result.map(item => ({
        venueName: venueMap.get(item.venueId) || 'Bilinməyən Məkan',
        checkInCount: item._count.venueId,
    }));
};

const triggerVenueStatCalculation = async () => {
    // Birbaşa scheduler-dəki funksiyanı çağırırıq
    calculateVenueStatistics();
    return { message: "Məkan statistikalarının hesablanması prosesi arxa planda başladıldı. Nəticələrin görünməsi bir neçə dəqiqə çəkə bilər." };
};

module.exports = {
    getStatsSummary,
    getUsageOverTime,
    getPopularVenues,
    triggerVenueStatCalculation
};