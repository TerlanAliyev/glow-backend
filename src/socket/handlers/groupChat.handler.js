// Fayl: src/socket/handlers/groupChat.handler.js

const chatService = require('../../chat/chat.service');
const prisma = require('../../config/prisma');

// Qadağan olunmuş sözlər və onlardan yaradılmış RegEx

const registerGroupChatHandlers = (mainNamespace, socket) => {

    const sendGroupMessage = async (payload) => {
        try {
            const senderId = socket.userId;
            const { venueId, encryptedContent, imageUrl, audioUrl, videoUrl } = payload;
            const groupChatRoom = `group-chat-${venueId}`;
            const senderProfile = await prisma.profile.findUnique({
                where: { userId: senderId },
                select: { isVerified: true }
            });

            const newMessage = await chatService.createGroupMessage(senderId, venueId, { encryptedContent, imageUrl, audioUrl, videoUrl });
            mainNamespace.to(groupChatRoom).emit('receive_venue_group_message', newMessage);

        } catch (error) {
            console.error("[GROUP_CHAT] 'send_venue_group_message' xətası:", error);
            socket.emit('error', { message: 'Qrup mesajı göndərilərkən xəta baş verdi.' });
        }
    };

    const startGroupTyping = ({ venueId }) => {
        const groupChatRoom = `group-chat-${venueId}`;
        socket.to(groupChatRoom).emit('user_is_group_typing', {
            userId: socket.userId,
            userName: socket.userName
        });
    };

    const stopGroupTyping = ({ venueId }) => {
        const groupChatRoom = `group-chat-${venueId}`;
        socket.to(groupChatRoom).emit('user_stopped_group_typing', { userId: socket.userId });
    };

    const sendGroupReaction = async ({ venueId, messageId, reactionEmoji }) => {
        try {
            const allReactionsForMessage = await chatService.addOrUpdateGroupReaction(socket.userId, messageId, reactionEmoji);
            const groupChatRoom = `group-chat-${venueId}`;
            mainNamespace.to(groupChatRoom).emit('update_group_reactions', {
                messageId: messageId,
                reactions: allReactionsForMessage
            });
        } catch (error) {
            console.error("[REACTION] 'send_group_reaction' xətası:", error);
        }
    };

    socket.on('send_venue_group_message', sendGroupMessage);
    socket.on('start_group_typing', startGroupTyping);
    socket.on('stop_group_typing', stopGroupTyping);
    socket.on('send_group_reaction', sendGroupReaction);
};

module.exports = registerGroupChatHandlers;