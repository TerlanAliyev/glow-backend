// Fayl: src/socket/handlers/privateChat.handler.js

const prisma = require('../../config/prisma');
const chatService = require('../../chat/chat.service');
const { sendPushNotification } = require('../../notification/notification.service');

const registerPrivateChatHandlers = (mainNamespace, socket) => {

    const sendMessage = async (payload) => {
        try {
            const { connectionId, content, imageUrl, audioUrl } = payload;
            const senderId = socket.userId;
            const senderProfile = await prisma.profile.findUnique({
                where: { userId: senderId },
                select: { isVerified: true }
            });
            if (!senderProfile.isVerified) {
                return socket.emit('error', {
                    message: 'Mesaj göndərmək üçün profilinizi təsdiqləməlisiniz.',
                    errorCode: 'VERIFICATION_REQUIRED'
                });
            }
            const connection = await prisma.connection.findFirst({
                where: { id: connectionId, OR: [{ userAId: senderId }, { userBId: senderId }] }
            });
            if (!connection) {
                return socket.emit('error', { message: 'Bu söhbətə mesaj göndərə bilməzsiniz.' });
            }

            const newMessage = await chatService.createMessage(senderId, connectionId, { content, imageUrl, audioUrl });

            const receiverId = connection.userAId === senderId ? connection.userBId : connection.userAId;

            // Mesajı hər iki tərəfə real-zamanlı olaraq göndəririk
            mainNamespace.to(senderId).emit('receive_message', newMessage);
            mainNamespace.to(receiverId).emit('receive_message', newMessage);

            // Mesajın alıcısına push bildiriş göndəririk
            const senderName = newMessage.sender.profile.name;
            let notificationBody = content;
            if (imageUrl) notificationBody = "📷 Şəkil göndərdi";
            if (audioUrl) notificationBody = "🎵 Səsli mesaj göndərdi";

            await sendPushNotification(
                receiverId,
                `${senderName}`, // Bildiriş başlığı
                notificationBody,
                { connectionId: connectionId.toString() },
                'NEW_MESSAGE'
            );

        } catch (error) {
            console.error("[MESSAGE] 'send_message' xətası:", error.message);
            socket.emit('error', { message: 'Mesaj göndərmək mümkün olmadı.' });
        }
    };

    const startTyping = async ({ connectionId }) => {
        try {
            const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
            if (!connection) return;
            const receiverId = connection.userAId === socket.userId ? connection.userBId : connection.userAId;
            mainNamespace.to(receiverId).emit('user_is_typing', { connectionId });
        } catch (error) {
            console.error("[TYPING] 'start_typing' xətası:", error.message);
        }
    };

    const stopTyping = async ({ connectionId }) => {
        try {
            const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
            if (!connection) return;
            const receiverId = connection.userAId === socket.userId ? connection.userBId : connection.userAId;
            mainNamespace.to(receiverId).emit('user_stopped_typing', { connectionId });
        } catch (error) {
            console.error("[TYPING] 'stop_typing' xətası:", error.message);
        }
    };

    const markAsRead = async ({ connectionId }) => {
        try {
            const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
            if (!connection) return;
            const receiverId = connection.userAId === socket.userId ? connection.userBId : connection.userAId;
            mainNamespace.to(receiverId).emit('messages_were_read', { connectionId });
        } catch (error) {
            console.error("[READ] 'mark_as_read' xətası:", error.message);
        }
    };

    socket.on('send_message', sendMessage);
    socket.on('start_typing', startTyping);
    socket.on('stop_typing', stopTyping);
    socket.on('mark_as_read', markAsRead);
};

module.exports = registerPrivateChatHandlers;