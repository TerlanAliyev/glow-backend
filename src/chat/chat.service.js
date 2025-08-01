
const prisma = require('../config/prisma');

const getMessagesForConnection = async (userId, connectionId) => {
    // 1. İstifadəçinin bu söhbətə aid olub-olmadığını yoxlayırıq (təhlükəsizlik)
    const connection = await prisma.connection.findFirst({
        where: {
            id: connectionId,
            OR: [
                { userAId: userId },
                { userBId: userId }
            ]
        }
    });

    if (!connection) {
        throw new Error('Bu söhbətə baxmaq üçün icazəniz yoxdur.');
    }

    // 2. Həmin söhbətə aid bütün mesajları gətiririk
    const messages = await prisma.message.findMany({
        where: {
            connectionId: connectionId,
        },
        orderBy: {
            createdAt: 'asc', // Köhnədən yeniyə sıralayırıq
        },
        include: {
            sender: {
                include: {
                    profile: true
                }
            }
        }
    });

    return messages;
};
const reportMessage = async (reporterId, messageId, reason) => {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new Error('Şikayət üçün belə bir mesaj tapılmadı.');

    // TODO: Gələcəkdə yoxlamaq olar ki, şikayət edən şəxs həmin söhbətin iştirakçısıdırmı.

    return prisma.report.create({
        data: {
            reporterId,
            reportedMessageId: messageId,
            reportedUserId: message.senderId, // Mesajı göndərən şəxs avtomatik şikayət olunur
            reason,
        }
    });
};
module.exports = {
    getMessagesForConnection,
    reportMessage
};