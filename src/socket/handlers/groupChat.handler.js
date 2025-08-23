// Fayl: src/socket/handlers/groupChat.handler.js

const chatService = require('../../chat/chat.service');
const prisma = require('../../config/prisma');

// Qadağan olunmuş sözlər və onlardan yaradılmış RegEx
const forbiddenWords = ['sik', 'sikdir', 'amciq'].filter(word => word.trim() !== '');
const profanityRegex = new RegExp(`\\b(${forbiddenWords.join('|')})\\b`, 'i');

const registerGroupChatHandlers = (mainNamespace, socket) => {

    const sendGroupMessage = async (payload) => {
        try {
            const senderId = socket.userId;
            const { venueId, content, imageUrl, audioUrl, videoUrl } = payload;
            const groupChatRoom = `group-chat-${venueId}`;
            const senderProfile = await prisma.profile.findUnique({
                where: { userId: senderId },
                select: { isVerified: true }
            });

           
            if (content) {
                if (profanityRegex.test(content)) {
                    console.log(`[MODERATION] İstifadəçi ${senderId} nalayiq ifadə işlətdi: "${content}"`);
                    const systemWarningMessage = {
                        id: `warning-${Date.now()}`,
                        content: 'İstifadə etdiyiniz ifadələr icma qaydalarına ziddir. Mesajınız göndərilmədi.',
                        sender: { id: 'lyra-bot-id', profile: { name: 'Lyra Moderator' } },
                        isSystemWarning: true
                    };
                    return socket.emit('receive_venue_group_message', systemWarningMessage);
                }
            }

            const newMessage = await chatService.createGroupMessage(senderId, venueId, { content, imageUrl, audioUrl, videoUrl });
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