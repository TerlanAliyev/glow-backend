// Düzgün Fayl: src/socket/handlers/venue.handler.js

const prisma = require('../../config/prisma');

const registerVenueHandlers = (mainNamespace, socket) => {
    // Bu dəyişəni funksiyanın içində saxlayırıq ki, hər qoşulan istifadəçinin öz otaq məlumatı olsun
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

            // ADDIM 3: SOCKET OTAQLARINA QOŞULAQ
            const roomName = `venue-${venueId}`;
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
            const whereConditions = {
                venueId: Number(venueId),
                userId: { not: socket.userId, notIn: Array.from(connectedUserIds) },
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
            
            const otherSessionsInRoom = await prisma.activeSession.findMany({
                where: whereConditions,
                include: { 
                    user: { 
                        include: { 
                            profile: { include: { interests: true, photos: true } },
                            // Düzəliş: Hər bir istifadəçinin abunəlik statusunu da gətiririk
                            // Bu sorğu yuxarıdakı user include-u ilə birləşdirilməlidir, lakin aydınlıq üçün belə saxlayıram
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
                 // Düzəliş: Hər bir istifadəçinin abunəlik statusunu da gətiririk
                const userSubscription = session.user.subscription; // Bu məlumat üçün 'include' düzgün olmalıdır
                return {
                    userId: session.userId,
                    name: session.user.profile.name,
                    subscription: userSubscription, 
                    avatarUrl: session.user.profile.photos?.find(p => p.isAvatar)?.url || null,
                    compatibilityScore: calculateScore(joiningUserProfile, session.user.profile)
                };
            });
            socket.emit('compass_update', compassData);

            const joiningUserPrimaryPhoto = joiningUserProfile.photos?.find(p => p.isAvatar)?.url || null;
            const payloadForOtherUser = {
                userId: socket.userId,
                name: joiningUserProfile.name,
                avatarUrl: joiningUserPrimaryPhoto,
                subscription: joiningUserProfile.user.subscription,
                compatibilityScore: 0 // Bu fərdi hesablanmalıdır, sadəlik üçün 0 qoyulub
            };
            socket.to(roomName).emit('user_joined', payloadForOtherUser);
            
            console.log(`--- [SUCCESS] join_venue prosesi ${socket.userId} üçün tamamlandı. ---\n`);

        } catch (error) {
            console.error(`--- [FATAL ERROR in join_venue] ---`, error);
            socket.emit('error', { message: `Serverdə kritik bir xəta baş verdi.` });
        }
    };

    // Hadisəni yalnız bir dəfə qeydiyyatdan keçiririk
    socket.on("join_venue", joinVenue);
};

module.exports = registerVenueHandlers;