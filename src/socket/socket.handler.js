const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');
const { sendPushNotification, createAndSendNotification } = require('../notification/notification.service');

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
      try {
        const roomName = `venue-${venueId}`;
        if (currentVenueRoom && currentVenueRoom !== roomName) {
          socket.to(currentVenueRoom).emit('user_left', { userId: socket.userId });
          socket.leave(currentVenueRoom);
        }
        socket.join(roomName);
        currentVenueRoom = roomName;
        console.log(`[JOIN] İstifadəçi ${socket.userId}, "${roomName}" otağına qoşuldu.`);

        // 1. Paralel olaraq profil və bağlantıları əldə et
        const [joiningUserProfile, connections] = await Promise.all([
          prisma.profile.findUnique({
            where: { userId: socket.userId },
            include: { interests: true, photos: true },
          }),
          prisma.connection.findMany({
            where: {
              OR: [{ userAId: socket.userId }, { userBId: socket.userId }],
            },
          }),
        ]);

        if (!joiningUserProfile) throw new Error("Qoşulan istifadəçinin profili tapılmadı.");

        // 2. Bağlantıları Set şəklində al
        const connectedUserIds = new Set(connections.map(conn => conn.userAId === socket.userId ? conn.userBId : conn.userAId));

        // 3. Digər istifadəçiləri otaqdan filtrlə
        const otherUsersInRoom = await prisma.activeSession.findMany({
          where: {
            venueId: Number(venueId),
            userId: {
              not: socket.userId,
              notIn: Array.from(connectedUserIds),
            },
          },
          include: {
            user: {
              include: {
                profile: {
                  include: { interests: true, photos: true }
                }
              }
            }
          }
        });

        // 4. Compatibility scoring və avatar URL tapmaq
        const compassData = otherUsersInRoom.map(session => {
          let score = 0;
          const otherProfile = session.user.profile;

          const commonInterests = joiningUserProfile.interests.filter(i =>
            otherProfile.interests.some(oi => oi.id === i.id)
          );

          score += commonInterests.length * 10;

          if (joiningUserProfile.university && joiningUserProfile.university === otherProfile.university) {
            score += 20;
          }

          const avatar = otherProfile.photos?.find(p => p.isAvatar)?.url || null;

          return {
            userId: session.user.id,
            name: otherProfile.name,
            avatarUrl: avatar,
            compatibilityScore: score
          };
        });

        socket.emit('compass_update', compassData);

        // 5. Otaqda olan digər socket-lərə user_joined mesajı göndəririk
        const allSocketsInRoom = await mainNamespace.in(roomName).fetchSockets();

        for (const otherSocket of allSocketsInRoom) {
          if (otherSocket.id === socket.id) continue;

          const otherUserProfile = await prisma.profile.findUnique({
            where: { userId: otherSocket.userId },
            include: { interests: true, photos: true }
          });
          if (!otherUserProfile) continue;

          const otherUserInterestIds = new Set(otherUserProfile.interests.map(i => i.id));
          const joiningUserInterestIds = new Set(joiningUserProfile.interests.map(i => i.id));

          const commonInterests = [...joiningUserInterestIds].filter(id => otherUserInterestIds.has(id));
          const compatibility = commonInterests.length >= 2 ? 'high' : 'normal';

          const avatar = joiningUserProfile.photos?.find(p => p.isAvatar)?.url || null;

          otherSocket.emit('user_joined', {
            userId: socket.userId,
            name: joiningUserProfile.name,
            avatarUrl: avatar,
            compatibility
          });
        }

      } catch (error) {
        console.error("[JOIN] 'join_venue' xətası:", error.message, error.stack);
      }
    });

    socket.on('send_signal', async ({ receiverId }) => {
      try {
        const senderId = socket.userId;
        if (senderId === receiverId) return;

        await prisma.$transaction(async (tx) => {
          await tx.signal.create({ data: { senderId, receiverId } });

          const mutualSignal = await tx.signal.findUnique({
            where: { senderId_receiverId: { senderId: receiverId, receiverId: senderId } }
          });

          const senderProfile = await tx.profile.findUnique({ where: { userId: senderId } });

          if (mutualSignal) {
            const [userAId, userBId] = [senderId, receiverId].sort((a, b) => a - b);

            const existingConnection = await tx.connection.findUnique({
              where: { userAId_userBId: { userAId, userBId } }
            });

            if (existingConnection) return;

            const newConnection = await tx.connection.create({ data: { userAId, userBId } });
            const receiverProfile = await tx.profile.findUnique({ where: { userId: receiverId } });

            if (receiverProfile) {
              mainNamespace.to(senderId).emit('new_connection', { connection: newConnection, partner: receiverProfile });
              notifyUser(senderId, 'Yeni Bağlantı!', `${receiverProfile.name} ilə yeni bir bağlantı qurdunuz!`);
            }

            if (senderProfile) {
              mainNamespace.to(receiverId).emit('new_connection', { connection: newConnection, partner: senderProfile });
              notifyUser(receiverId, 'Yeni Bağlantı!', `${senderProfile.name} ilə yeni bir bağlantı qurdunuz!`);
            }

          } else {
            if (senderProfile) {
              mainNamespace.to(receiverId).emit('signal_received', { from: senderProfile });
              notifyUser(receiverId, 'Yeni Siqnal!', `${senderProfile.name} sizə siqnal göndərdi!`);
            }
          }
        });
      } catch (error) {
        if (error.code !== 'P2002') {
          console.error("[SIGNAL] 'send_signal' xətası:", error.message, error.stack);
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

    socket.on('send_message', async ({ connectionId, content }) => {
      console.log('[RECEIVED send_message]', { connectionId, content, senderId: socket.userId });

      try {
        const senderId = socket.userId;

        // 1. İstifadəçinin bu söhbətə aid olub-olmadığını yoxlayırıq
        const connection = await prisma.connection.findFirst({
          where: {
            id: connectionId,
            OR: [{ userAId: senderId }, { userBId: senderId }]
          }
        });

        if (!connection) {
          socket.emit('error', { message: 'Bu söhbətə mesaj göndərə bilməzsiniz.' });
          return;
        }

        // 2. Mesajı yaradıb daxil edirik
        const newMessage = await prisma.message.create({
          data: {
            content,
            senderId,
            connectionId,
          },
          include: { sender: { include: { profile: true } } }
        });

        // 3. Mesajın alıcısını tapırıq
        const receiverId = connection.userAId === senderId ? connection.userBId : connection.userAId;

        // 4. Hər iki tərəfə real vaxtda mesaj göndəririk
        mainNamespace.to(senderId).emit('receive_message', newMessage);
        mainNamespace.to(receiverId).emit('receive_message', newMessage);

        console.log(`[MESSAGE] ${senderId} -> ${receiverId}: ${content}`);

      } catch (error) {
        console.error("[MESSAGE] 'send_message' xətası:", error.message, error.stack);
        socket.emit('error', { message: 'Mesaj göndərmək mümkün olmadı.' });
      }
    });
  });
};

module.exports = {
  initializeSocket,
};
