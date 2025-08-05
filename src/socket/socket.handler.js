const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');
const { sendPushNotification, createAndSendNotification } = require('../notification/notification.service');
const chatService = require('../chat/chat.service');
const forbiddenWords = ['sik', 'sikdir','amciq'].filter(word => word.trim() !== ''); // Bu, boş elementləri avtomatik təmizləyir
const profanityRegex = new RegExp(`\\b(${forbiddenWords.join('|')})\\b`, 'i');

const initializeSocket = (io) => {
  const mainNamespace = io.of("/");

  // Middleware for authentication
  mainNamespace.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token not provided'));
    }
    jwt.verify(token, process.env.JWT_SECRET || 'super_gizli_bir_acar_stringi', (err, decoded) => {
      if (err) {
        return next(new Error('Authentication error: Invalid token'));
      }
      socket.userId = decoded.userId;
      next();
    });
  });

  // Helper function to send notifications (push + app notification)
  const notifyUser = (userId, title, message) => {
    sendPushNotification(userId, title, message);
    createAndSendNotification(userId, title.replace('_', ' '), message);
  };

  mainNamespace.on('connection', (socket) => {
    console.log(`İstifadəçi qoşuldu: ${socket.id} (User ID: ${socket.userId})`);
    socket.join(socket.userId); // Join user's personal room

    let currentVenueRoom = null;


    socket.on('join_venue', async (venueId, filters = {}) => {
      console.log(`\n--- [START] join_venue çağırıldı. User: ${socket.userId}, Venue: ${venueId}, Filters:`, filters);
      try {
        const user = await prisma.user.findUnique({
          where: { id: socket.userId },
          include: { profile: true }
        });
        if (user && user.profile) {
          socket.userName = user.profile.name;
        }
      } catch (error) {
        console.error("Socket-ə istifadəçi adı əlavə edilərkən xəta:", error);
      }
      try {
        // ADDIM 1: LAZIMI MƏLUMATLARI BİR DƏFƏYƏ VƏ PARALEL ALAQ
        const [joiningUserProfile, connections] = await Promise.all([
          prisma.profile.findUnique({
            where: { userId: socket.userId },
            include: {
              interests: true,
              photos: true,
              _count: { select: { photos: true } },
              user: {
                select: {
                  subscription: true
                }
              }
            },
          }),
          prisma.connection.findMany({
            where: { OR: [{ userAId: socket.userId }, { userBId: socket.userId }] },
          }),
        ]);

        // ADDIM 2: İLKİN YOXLAMALARI EDƏK
        if (!joiningUserProfile) {
          throw new Error(`Qoşulan istifadəçinin (ID: ${socket.userId}) profili tapılmadı.`);
        }
        if (joiningUserProfile._count.photos < 2) {
          return socket.emit('error', {
            message: 'Məkana daxil olmaq üçün ən az 2 profil şəkli yükləməlisiniz.',
            errorCode: 'INSUFFICIENT_PHOTOS'
          });
        }
        console.log(`[OK] Yoxlamalar uğurludur. İstifadəçi: ${joiningUserProfile.name}`);

        // ADDIM 3: SOCKET OTAĞINA QOŞULAQ
        const roomName = `venue-${venueId}`;
        if (currentVenueRoom && currentVenueRoom !== roomName) {
          socket.to(currentVenueRoom).emit('user_left', { userId: socket.userId });
          socket.leave(currentVenueRoom);
          const oldVenueId = currentVenueRoom.split('-')[1];
          socket.leave(`group-chat-${oldVenueId}`);
        }
        socket.join(roomName);
        currentVenueRoom = roomName;
        const groupChatRoom = `group-chat-${venueId}`;
        socket.join(groupChatRoom);
        console.log(`[OK] İstifadəçi həm də "${groupChatRoom}" otağına qoşuldu.`);

        // ADDIM 4: FİLTRLƏRƏ UYĞUN OLARAQ DİGƏR İSTİFADƏÇİLƏRİ TAPAQ
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
          interestIds: filters.interestIds // Maraqları hələlik saxlamırıq
        };
        // Filtrləri təhlükəsiz şəkildə tətbiq edək
        if (finalFilters.minAge) whereConditions.user.profile.age = { gte: Number(finalFilters.minAge) };
        if (finalFilters.maxAge) whereConditions.user.profile.age = { ...whereConditions.user.profile.age, lte: Number(finalFilters.maxAge) };
        if (finalFilters.interestIds && finalFilters.interestIds.length > 0) {
          whereConditions.user.profile.interests = { some: { id: { in: finalFilters.interestIds.map(id => Number(id)) } } };
        }

        const otherSessionsInRoom = await prisma.activeSession.findMany({
          where: whereConditions,
          include: { user: { include: { profile: { include: { interests: true, photos: true } } } } }
        });
        console.log(`[OK] Filtrlərə uyğun ${otherSessionsInRoom.length} istifadəçi tapıldı.`);

        // YARDIMÇI FUNKSİYA: Təkrar kodun qarşısını almaq üçün xal hesablamanı funksiyaya çıxaraq
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

        // ADDIM 5: QOŞULAN İSTİFADƏÇİYƏ KOMPAS MƏLUMATINI GÖNDƏRƏK
        const compassData = otherSessionsInRoom.map(session => {
          const otherProfile = session.user.profile;
          const primaryPhoto = otherProfile.photos?.find(p => p.isAvatar) || otherProfile.photos?.[0];
          return {
            userId: session.userId,
            name: otherProfile.name,
            subscription: session.user.subscription,
            avatarUrl: primaryPhoto?.url || null,
            compatibilityScore: calculateScore(joiningUserProfile, otherProfile)
          };
        });
        socket.emit('compass_update', compassData);
        console.log(`[EMIT] 'compass_update' ${socket.userId}-ə göndərildi.`);

        // ADDIM 6: MƏKANDAKI DİGƏR İSTİFADƏÇİLƏRƏ YENİ GƏLƏN HAQDA MƏLUMAT GÖNDƏRƏK
        const joiningUserPrimaryPhoto = joiningUserProfile.photos?.find(p => p.isAvatar) || joiningUserProfile.photos?.[0];
        for (const session of otherSessionsInRoom) {
          const otherUserSocket = (await mainNamespace.in(session.userId).fetchSockets())[0];
          if (otherUserSocket) {
            const payloadForOtherUser = {
              userId: socket.userId,
              name: joiningUserProfile.name,
              avatarUrl: joiningUserPrimaryPhoto?.url || null,
              compatibilityScore: calculateScore(session.user.profile, joiningUserProfile)
            };
            otherUserSocket.emit('user_joined', payloadForOtherUser);
            console.log(`[EMIT] 'user_joined' ${session.userId}-ə göndərildi.`);
          }
        }

        console.log(`--- [SUCCESS] Proses ${socket.userId} üçün uğurla tamamlandı. ---\n`);

      } catch (error) {
        console.error(`--- [FATAL ERROR in join_venue] ---`, error);
        socket.emit('error', { message: `Serverdə kritik bir xəta baş verdi.`, details: error.message });
      }
    });

    socket.on('send_signal', async ({ receiverId }) => {
      try {
        const senderId = socket.userId;
        if (senderId === receiverId) return;

        // ADDIM 1: Siqnalı göndərən istifadəçinin məlumatlarını (və abunəlik statusunu) alaq
        const sender = await prisma.user.findUnique({ where: { id: senderId } });
        if (!sender) {
          return socket.emit('error', { message: 'İstifadəçi tapılmadı.' });
        }

        // ADDIM 2: İstifadəçinin abunəlik statusunu yoxlayaq
        if (sender.subscription === 'FREE') {
          const twentyFourHoursAgo = new Date(new Date() - 24 * 60 * 60 * 1000);
          const DAILY_LIMIT = 2; // Gündəlik limiti burada təyin edirik

          const signalCount = await prisma.signal.count({
            where: {
              senderId: senderId,
              createdAt: {
                gte: twentyFourHoursAgo,
              },
            },
          });

          if (signalCount >= DAILY_LIMIT) {
            // Limit aşıb, amma MÜKAFAT KREDİTİ var mı?
            if (sender.profile.extraSignalCredits > 0) {
              // Əgər kredit varsa, birini istifadə et
              await prisma.profile.update({
                where: { userId: senderId },
                data: { extraSignalCredits: { decrement: 1 } }
              });
              // və prosesə davam etməyə icazə ver
            } else {
              // Əgər kredit də yoxdursa, xəta göndər
              return socket.emit('error', {
                message: `Gündəlik limitiniz bitib və əlavə siqnal kreditiniz yoxdur. Video izləyərək yeni kreditlər qazana bilərsiniz.`,
                errorCode: 'SIGNAL_LIMIT_REACHED'
              });
            }
          }
        }

        // ADDIM 3: Limit aşmayıbsa (və ya istifadəçi Premiumdursa), siqnalı göndər
        await prisma.$transaction(async (tx) => {
          await tx.signal.create({ data: { senderId, receiverId } });

          const mutualSignal = await tx.signal.findFirst({
            where: { senderId: receiverId, receiverId: senderId }
          });

          const senderProfile = await tx.profile.findUnique({ where: { userId: senderId } });

          if (mutualSignal) {
            // ... (match yaranma məntiqi dəyişməz qalıb)
            const [userAId, userBId] = [senderId, receiverId].sort((a, b) => a.localeCompare(b));
            const existingConnection = await tx.connection.findFirst({ where: { userAId, userBId } });
            if (existingConnection) return;

            const newConnection = await tx.connection.create({ data: { userAId, userBId } });
            const receiverProfile = await tx.profile.findUnique({ where: { userId: receiverId } });

            if (receiverProfile) {
              mainNamespace.to(senderId).emit('new_connection', {
                connection: newConnection,
                partner: receiverProfile
              });
              notifyUser(senderId, 'Yeni Bağlantı!', `${receiverProfile.name} ilə yeni bir bağlantı qurdunuz!`, {}, 'NEW_MATCH');
            }
            if (senderProfile) {
              mainNamespace.to(receiverId).emit('new_connection', {
                connection: newConnection,
                partner: senderProfile
              });
              notifyUser(receiverId, 'Yeni Bağlantı!', `${senderProfile.name} ilə yeni bir bağlantı qurdunuz!`, {}, 'NEW_MATCH');
            }
          } else {
            if (senderProfile) {
              mainNamespace.to(receiverId).emit('signal_received', { from: senderProfile });
              notifyUser(receiverId, 'Yeni Siqnal!', `${senderProfile.name} sizə siqnal göndərdi!`, {}, 'NEW_SIGNAL');
            }
          }
        });
      } catch (error) {
        if (error.code !== 'P2002') { // Təkrarlanan siqnal xətasını gizlədirik
          console.error("[SIGNAL] 'send_signal' xətası:", error.message, error.stack);
          socket.emit('error', { message: 'Siqnal göndərilərkən xəta baş verdi.' });
        }
      }
    });

    socket.on('disconnect', async () => {
      console.log(`İstifadəçi ayrıldı: ${socket.id} (User ID: ${socket.userId})`);

      if (currentVenueRoom) {
        socket.to(currentVenueRoom).emit('user_left', { userId: socket.userId });
      }

      try {
        await prisma.activeSession.delete({ where: { userId: socket.userId } });
      } catch (error) {
        if (error.code !== 'P2025') {
          console.error(`[LEAVE] Disconnect zamanı sessiyanı silərkən xəta:`, error.message);
        }
      }

      currentVenueRoom = null;
    });


    socket.on('send_message', async (payload) => {
      try {
        const { connectionId, content, imageUrl, audioUrl } = payload;
        const senderId = socket.userId;

        const connection = await prisma.connection.findFirst({
          where: { id: connectionId, OR: [{ userAId: senderId }, { userBId: senderId }] }
        });
        if (!connection) {
          return socket.emit('error', { message: 'Bu söhbətə mesaj göndərə bilməzsiniz.' });
        }

        // DÜZƏLİŞ: Servisə məlumatları vahid bir obyekt kimi ötürürük
        const newMessage = await chatService.createMessage(senderId, connectionId, { content, imageUrl, audioUrl });

        const receiverId = connection.userAId === senderId ? connection.userBId : connection.userAId;
        mainNamespace.to(senderId).emit('receive_message', newMessage);
        mainNamespace.to(receiverId).emit('receive_message', newMessage);

        // Push bildiriş məntiqi (dəyişməz qalır)
        const senderName = newMessage.sender.profile.name;
        await sendPushNotification(
          receiverId,
          `Yeni Mesaj: ${senderName}`,
          content || "📷 Şəkil" || "🎵 Səsli Mesaj", // Məzmuna uyğun bildiriş
          { connectionId: connectionId.toString() },
          'NEW_MESSAGE'
        );

      } catch (error) {
        console.error("[MESSAGE] 'send_message' xətası:", error.message, error.stack);
        socket.emit('error', { message: 'Mesaj göndərmək mümkün olmadı.' });
      }
    });

    // "Yazır" statusunu göndərmək üçün
    socket.on('start_typing', async ({ connectionId }) => {
      try {
        const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
        if (!connection) return;

        const receiverId = connection.userAId === socket.userId ? connection.userBId : connection.userAId;

        // Mesajı birbaşa digər istifadəçinin otağına göndəririk
        mainNamespace.to(receiverId).emit('user_is_typing', { connectionId });
      } catch (error) {
        console.error("[TYPING] 'start_typing' xətası:", error.message);
      }
    });

    // "Yazmağı dayandırdı" statusunu göndərmək üçün
    socket.on('stop_typing', async ({ connectionId }) => {
      try {
        const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
        if (!connection) return;

        const receiverId = connection.userAId === socket.userId ? connection.userBId : connection.userAId;

        mainNamespace.to(receiverId).emit('user_stopped_typing', { connectionId });
      } catch (error) {
        console.error("[TYPING] 'stop_typing' xətası:", error.message);
      }
    });

    // Mesajları oxundu kimi işarələmək üçün (simulyasiya)
    socket.on('mark_as_read', async ({ connectionId }) => {
      try {
        // Gələcəkdə burada verilənlər bazası əməliyyatı olacaq:
        // await prisma.message.updateMany({ where: { connectionId, receiverId: socket.userId }, data: { isRead: true } });

        const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
        if (!connection) return;

        const receiverId = connection.userAId === socket.userId ? connection.userBId : connection.userAId;

        mainNamespace.to(receiverId).emit('messages_were_read', { connectionId });
      } catch (error) {
        console.error("[READ] 'mark_as_read' xətası:", error.message);
      }
    });

    socket.on('send_venue_group_message', async ({ venueId, content, imageUrl,audioUrl, videoUrl }) => {
      try {
        const senderId = socket.userId;
      if (content) {
            const hasForbiddenWord = profanityRegex.test(content);

            if (hasForbiddenWord) {
                console.log(`[MODERATION] İstifadəçi ${senderId} nalayiq ifadə işlətdi: "${content}"`);

                // DƏYİŞİKLİK: Artıq xüsusi bir sistem mesajı hazırlayıb YALNIZ göndərənə yollayırıq.
                // Bu mesaj bazaya yazılmır, sadəcə anlıq bir bildirişdir.
                const systemWarningMessage = {
                    id: `warning-${Date.now()}`, // Təkrarlanmayan müvəqqəti ID
                    content: 'İstifadə etdiyiniz ifadələr icma qaydalarına ziddir. Mesajınız göndərilmədi.',
                    sender: {
                        id: 'lyra-bot-id', // Lyra Botunun xüsusi ID-si
                        profile: { name: 'Lyra Moderator' }
                    },
                    isSystemWarning: true // Frontend-in bunu tanıması üçün xüsusi bayraq
                };
                
                // Xəbərdarlığı yalnız mesajı yazan istifadəçiyə göndəririk
                socket.emit('receive_venue_group_message', systemWarningMessage);
                
                return; // Prosesi dayandırırıq
            }
        }
        

        // 1. Mesajı verilənlər bazasına yadda saxlayırıq
        const newMessage = await chatService.createGroupMessage(senderId, venueId, content, imageUrl,audioUrl, videoUrl);


        // 2. Mesajı həmin məkandakı bütün istifadəçilərə göndəririk
        const groupChatRoom = `group-chat-${venueId}`;
        mainNamespace.to(groupChatRoom).emit('receive_venue_group_message', newMessage);

      } catch (error) {
        console.error("[GROUP_CHAT] 'send_venue_group_message' xətası:", error);
        socket.emit('error', { message: 'Qrup mesajı göndərilərkən xəta baş verdi.' });
      }
    });

    socket.on('start_group_typing', ({ venueId }) => {
      // Siqnalı göndərən şəxs xaric, otaqdakı hər kəsə "yazır..." bildirişi göndəririk.
      const groupChatRoom = `group-chat-${venueId}`;
      socket.to(groupChatRoom).emit('user_is_group_typing', {
        userId: socket.userId,
        userName: socket.userName // Bu sahəni əlavə etmək üçün qoşulma məntiqini bir az dəyişəcəyik
      });
    });

    socket.on('stop_group_typing', ({ venueId }) => {
      const groupChatRoom = `group-chat-${venueId}`;
      socket.to(groupChatRoom).emit('user_stopped_group_typing', { userId: socket.userId });
    });
    socket.on('send_group_reaction', async ({ venueId, messageId, reactionEmoji }) => {
      try {
        // Reaksiyanı bazaya yazırıq və yenilənmiş tam siyahını alırıq
        const allReactionsForMessage = await chatService.addOrUpdateGroupReaction(socket.userId, messageId, reactionEmoji);

        const groupChatRoom = `group-chat-${venueId}`;

        // DÜZƏLİŞ: Artıq "mainNamespace" ilə hər kəsə (göndərən daxil) göndəririk
        mainNamespace.to(groupChatRoom).emit('update_group_reactions', {
          messageId: messageId,
          reactions: allReactionsForMessage
        });
      } catch (error) {
        console.error("[REACTION] 'send_group_reaction' xətası:", error);
      }
    });
  });
};

module.exports = {
  initializeSocket,
};
