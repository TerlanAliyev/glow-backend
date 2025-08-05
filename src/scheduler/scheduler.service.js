
const prisma = require('../config/prisma');
const chatService = require('../chat/chat.service');
const notificationService = require('../notification/notification.service');


const sendReEngagementNotifications = async () => {
    console.log(`[Scheduler] Passiv istifadəçilər üçün yoxlama başladı... ${new Date().toLocaleTimeString()}`);
    try {
        // Son 3 gündə aktiv olmayan istifadəçiləri tapmaq üçün tarix
        const threeDaysAgo = new Date(new Date() - 3 * 24 * 60 * 60 * 1000);

        // Şərtlər:
        // 1. Son 3 gündə profilini yeniləməyib (login olmayıb)
        // 2. Hesabı aktivdir
        // 3. Ən az bir cihazı qeydiyyatdan keçib (tokeni var)
        const inactiveUsers = await prisma.user.findMany({
            where: {
                updatedAt: {
                    lt: threeDaysAgo // "less than" - 3 gündən daha əvvəl
                },
                isActive: true,
                devices: {
                    some: {} // Ən az bir cihazı var
                }
            }
        });

        if (inactiveUsers.length === 0) {
            return console.log('[Scheduler] Geri qaytarmaq üçün passiv istifadəçi tapılmadı.');
        }

        console.log(`[Scheduler] ${inactiveUsers.length} passiv istifadəçi tapıldı. Bildirişlər göndərilir...`);

        const notificationTitle = "Lyra-da sənin üçün darıxdılar! ✨";
        const notificationBody = "Bu axşam yeni insanlarla tanış olmaq üçün yaxınlıqdakı məkanları kəşf et!";

        for (const user of inactiveUsers) {
            // Mövcud notification servisimizi istifadə edirik
            await notificationService.sendPushNotification(
                user.id,
                notificationTitle,
                notificationBody
            );
        }

    } catch (error) {
        console.error('[Scheduler] Passiv istifadəçilərə bildiriş göndərilərkən xəta baş verdi:', error);
    }
};
const calculateVenueStatistics = async () => {
    console.log(`[Scheduler] Məkan statistikaları hesablanır... ${new Date().toLocaleTimeString()}`);
    try {
        const venues = await prisma.venue.findMany({ select: { id: true } });
        const thirtyDaysAgo = new Date(new Date() - 30 * 24 * 60 * 60 * 1000);

        for (const venue of venues) {
            // 1. Yaş qruplarını hesablayaq
            const ageGroups = await prisma.checkInHistory.groupBy({
                by: ['userId'],
                where: { venueId: venue.id, createdAt: { gte: thirtyDaysAgo } },
            });
            const userIds = ageGroups.map(item => item.userId);
            const usersWithAge = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { profile: { select: { age: true } } }
            });
            const ages = usersWithAge.map(u => u.profile.age).filter(Boolean);
            
            let dominantAgeGroup = 'N/A';
            if (ages.length > 0) {
                const totalAge = ages.reduce((acc, age) => acc + age, 0);
                const avgAge = Math.round(totalAge / ages.length);
                dominantAgeGroup = `${Math.floor(avgAge / 5) * 5}-${Math.floor(avgAge / 5) * 5 + 5}`; // Məs: 20-25
            }

            // 2. Match sayını hesablayaq (sadələşdirilmiş versiya)
            const connections = await prisma.connection.count({
                where: {
                    createdAt: { gte: thirtyDaysAgo },
                    AND: [
                        { userA: { checkInHistory: { some: { venueId: venue.id } } } },
                        { userB: { checkInHistory: { some: { venueId: venue.id } } } }
                    ]
                }
            });
            
            const stats = { dominantAgeGroup, matchCountLast30Days: connections };

            // 3. Nəticəni Venue cədvəlində yeniləyək
            await prisma.venue.update({
                where: { id: venue.id },
                data: { statsSummary: stats }
            });
        }
        console.log(`[Scheduler] ${venues.length} məkan üçün statistika uğurla yeniləndi.`);
    } catch (error) {
        console.error('[Scheduler] Məkan statistikaları hesablanarkən xəta baş verdi:', error);
    }
};

// Yeni funksiyanı da module.exports-ə əlavə edirik
module.exports = { 
    sendReEngagementNotifications,calculateVenueStatistics
};