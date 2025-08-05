// Fayl: src/socket/socket.handler.js

const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

// Bütün yeni, ixtisaslaşmış handler-lərimizi import edirik
const registerVenueHandlers = require('./handlers/venue.handler');
const registerConnectionHandlers = require('./handlers/connection.handler');
const registerPrivateChatHandlers = require('./handlers/privateChat.handler');
const registerGroupChatHandlers = require('./handlers/groupChat.handler');

const initializeSocket = (io) => {
    const mainNamespace = io.of("/");

    // Autentifikasiya Middleware-i: Hər yeni qoşulan istifadəçini yoxlayır
    mainNamespace.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error: Token not provided'));
        }
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await prisma.user.findUnique({ 
                where: { id: decoded.userId }, 
                include: { profile: true } 
            });

            if (!user || !user.profile) {
                return next(new Error('Authentication error: User not found'));
            }

            // Qoşulan istifadəçinin məlumatlarını socket obyektinə əlavə edirik ki,
            // digər handler-lər də istifadə edə bilsin.
            socket.userId = user.id;
            socket.userName = user.profile.name;
            next();
        } catch (err) {
            return next(new Error('Authentication error: Invalid token'));
        }
    });

    // Ana Qoşulma Hadisəsi: Hər bir istifadəçi üçün yalnız bir dəfə işə düşür
    mainNamespace.on('connection', (socket) => {
        console.log(`İstifadəçi qoşuldu: ${socket.id} (User ID: ${socket.userId}, Name: ${socket.userName})`);
        
        // İstifadəçini öz şəxsi otağına daxil edirik (şəxsi bildirişlər üçün)
        socket.join(socket.userId);

        // Bütün ixtisaslaşmış handler-ləri bu qoşulan socket üçün qeydiyyatdan keçiririk
        registerVenueHandlers(mainNamespace, socket);
        registerConnectionHandlers(mainNamespace, socket);
        registerPrivateChatHandlers(mainNamespace, socket);
        registerGroupChatHandlers(mainNamespace, socket);

        // Disconnect hadisəsi burada, mərkəzi yerdə idarə olunur
        socket.on('disconnect', async () => {
            console.log(`İstifadəçi ayrıldı: ${socket.id} (User ID: ${socket.userId})`);
            try {
                // İstifadəçinin aktiv sessiyasını tapırıq
                const activeSession = await prisma.activeSession.findUnique({
                    where: { userId: socket.userId },
                });

                if (activeSession) {
                    // Əgər bir məkanda idisə, digərlərinə xəbər veririk
                    const roomName = `venue-${activeSession.venueId}`;
                    socket.to(roomName).emit('user_left', { userId: socket.userId });

                    // Aktiv sessiyanı verilənlər bazasından silirik
                    await prisma.activeSession.delete({ where: { userId: socket.userId } });
                }
            } catch (error) {
                // P2025 - Qeyd tapılmadı xətasıdır, bu normal haldır.
                if (error.code !== 'P2025') {
                    console.error(`[LEAVE] Disconnect zamanı sessiyanı silərkən xəta:`, error.message);
                }
            }
        });
    });
};

module.exports = {
    initializeSocket,
};
