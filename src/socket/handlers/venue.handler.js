// Düzgün Fayl: src/socket/handlers/venue.handler.js

const prisma = require('../../config/prisma');
const redis = require('../../config/redis');

const registerVenueHandlers = (mainNamespace, socket) => {
    let currentVenueRoom = null;

    const joinVenue = async (venueId, filters = {}) => {
        try {
            console.log(`\n--- [START] join_venue çağırıldı. User: ${socket.userId}, Venue: ${venueId}, Filters:`, filters);

            // ADDIM 1: LAZIMI MƏLUMATLARI ALAQ
            const [joiningUserProfile, connections] = await Promise.all([
                prisma.profile.findUnique({
                    where: { userId: socket.userId },
                    include: {
                        interests: true,
                        photos: true,
                        _count: { select: { photos: true } },
                        user: { select: { subscription: true } }
                    },
                }),
                prisma.connection.findMany({
                    where: { OR: [{ userAId: socket.userId }, { userBId: socket.userId }] }
                }),
            ]);

            // ADDIM 2: YOXLAMALARI EDƏK
            if (!joiningUserProfile) throw new Error(`Profil tapılmadı.`);
            if (joiningUserProfile._count.photos < 2) {
                return socket.emit('error', {
                    message: 'Məkana daxil olmaq üçün ən az 2 profil şəkli yükləməlisiniz.',
                    errorCode: 'INSUFFICIENT_PHOTOS'
                });
            }

            // ADDIM 3: SOCKET OTAQLARINA VƏ REDIS-ə QOŞULAQ
            const roomName = `venue-${venueId}`;
            const venueUsersKey = `venue_users:${venueId}`;

            // İstifadəçini Redis-in SET-inə əlavə edirik
            await redis.sadd(venueUsersKey, socket.userId);
            // 2 saat sonra avtomatik silinməsi üçün TTL (Time-to-Live) təyin edirik
            await redis.expire(venueUsersKey, 7200); // 7200 saniyə = 2 saat

            if (currentVenueRoom && currentVenueRoom !== roomName) {
                socket.to(currentVenueRoom).emit('user_left', { userId: socket.userId });
                socket.leave(currentVenueRoom);
                const oldVenueId = currentVenueRoom.split('-')[1];
                socket.leave(`group-chat-${oldVenueId}`);
            }
            socket.join(roomName);
            currentVenueRoom = roomName;
            socket.join(`group-chat-${venueId}`);

            // ADDIM 4: FİLTRLƏRƏ UYĞUN DİGƏR İSTİFADƏÇİLƏRİ TAPAQ
            const connectedUserIds = new Set(connections.map(conn => conn.userAId === socket.userId ? conn.userBId : conn.userAId));

            // REDIS-dən məkandakı bütün istifadəçi ID-lərini alırıq
            const allUserIdsInVenue = await redis.smembers(venueUsersKey);

            const otherActiveUserIds = allUserIdsInVenue.filter(id => id !== socket.userId && !connectedUserIds.has(id));

            const whereConditions = {
                userId: { in: otherActiveUserIds },
                isIncognito: false,
                user: { profile: {} }
            };

            const finalFilters = {
                minAge: filters.minAge || joiningUserProfile.preferredMinAge,
                maxAge: filters.maxAge || joiningUserProfile.preferredMaxAge,
                interestIds: filters.interestIds
            };

            if (finalFilters.minAge) whereConditions.user.profile.age = { gte: Number(finalFilters.minAge) };
            if (finalFilters.maxAge) whereConditions.user.profile.age = { ...whereConditions.user.profile.age, lte: Number(finalFilters.maxAge) };

            // ARTIQ DAHA KİÇİK BİR SİYAHI ÜÇÜN SORĞU EDİRİK
            const otherSessionsInRoom = await prisma.activeSession.findMany({
                where: whereConditions,
                include: {
                    user: {
                        // Artıq include yox, select istifadə edirik
                        select: {
                            // profile ilə əlaqəli məlumatları include ilə çəkirik
                            profile: {
                                include: {
                                    interests: true,
                                    photos: true
                                }
                            },
                            // Və birbaşa user modelində olan subscription sahəsini select edirik
                            subscription: true
                        }
                    }
                }
            });

            // ADDIM 5: KOMPASI VƏ DİGƏR İSTİFADƏÇİLƏRİ YENİLƏYƏK
            const calculateScore = (profileA, profileB) => {
                if (!profileA || !profileB) return 0;
                let score = 0;
                if (profileA.interests && profileB.interests) {
                    const commonInterests = profileA.interests.filter(i => profileB.interests.some(oi => oi.id === i.id));
                    score += commonInterests.length * 10;
                }
                if (profileA.university && profileA.university === profileB.university) score += 20;
                return score;
            };

            const compassData = otherSessionsInRoom.map(session => {
                const userSubscription = session.user.subscription;
                let activeStatus = null;
                if (session.user.profile.currentStatus && session.user.profile.statusExpiresAt > new Date()) {
                    activeStatus = session.user.profile.currentStatus;
                }
                return {
                    userId: session.userId,
                    name: session.user.profile.name,
                    subscription: userSubscription,
                    avatarUrl: session.user.profile.photos?.find(p => p.isAvatar)?.url || null,
                    compatibilityScore: calculateScore(joiningUserProfile, session.user.profile),
                    currentStatus: activeStatus
                };
            });
            socket.emit('compass_update', compassData);

            const joiningUserPrimaryPhoto = joiningUserProfile.photos?.find(p => p.isAvatar)?.url || null;
            const payloadForOtherUser = {
                userId: socket.userId,
                name: joiningUserProfile.name,
                avatarUrl: joiningUserPrimaryPhoto,
                subscription: joiningUserProfile.user.subscription,
                compatibilityScore: 0
            };
            socket.to(roomName).emit('user_joined', payloadForOtherUser);

            console.log(`--- [SUCCESS] join_venue prosesi ${socket.userId} üçün tamamlandı. ---\n`);

        } catch (error) {
            console.error(`--- [FATAL ERROR in join_venue] ---`, error);
            socket.emit('error', { message: `Serverdə kritik bir xəta baş verdi.` });
        }
    };

    socket.on("join_venue", joinVenue);
};

module.exports = registerVenueHandlers;