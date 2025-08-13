
const prisma = require('../config/prisma');

const getMessagesForConnection = async (userId, connectionId,{ page = 1, limit = 30 }) => {
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
    
    const skip = (page - 1) * limit;
     const [messages, total] = await prisma.$transaction([
        prisma.message.findMany({
            where: { connectionId },
            orderBy: { createdAt: 'desc' }, // Tarixçəni sondan əvvələ yükləmək daha məntiqlidir
            skip,
            take: limit,
            include: { sender: { include: { profile: true } } }
        }),
        prisma.message.count({ where: { connectionId } })
    ]);
    return { data: messages.reverse(), totalPages: Math.ceil(total / limit), currentPage: page };
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
const reportGroupMessage = async (reporterId, messageId, reason) => {
    const message = await prisma.venueGroupMessage.findUnique({ where: { id: Number(messageId) } });
    if (!message) {
        const error = new Error('Şikayət üçün belə bir qrup mesajı tapılmadı.');
        error.statusCode = 404;
        throw error;
    }

    return prisma.report.create({
        data: {
            reporterId,
            reportedGroupMessageId: Number(messageId),
            reportedUserId: message.senderId, // Mesajı göndərən avtomatik şikayət olunur
            reason,
        }
    });
};
const getRandomIcebreakers = async (count = 3) => {
    const questions = await prisma.$queryRaw`
        SELECT * FROM \`IcebreakerQuestion\`
        ORDER BY RAND()
        LIMIT ${count};
    `;
    return questions;
};
const getGroupMessagesForVenue = async (venueId) => {
    return prisma.venueGroupMessage.findMany({
        where: { venueId: Number(venueId) },
        orderBy: { createdAt: 'asc' },
        take: 50,
        include: {
            sender: { include: { profile: true } },
            reactions: { // YENİ: Hər mesaja aid reaksiyaları da gətiririk
                select: { emoji: true, user: { select: { profile: { select: { name: true } } } } }
            }
        }
    });
};
const deleteOwnMessage = async (userId, messageId) => {
    const messageIdNum = Number(messageId);

    // 1. Mesajı tapırıq
    const message = await prisma.message.findUnique({
        where: { id: messageIdNum },
    });

    // 2. Mesajın mövcudluğunu və istifadəçiyə aid olub-olmadığını yoxlayırıq
    if (!message) {
        const error = new Error('Mesaj tapılmadı.');
        error.statusCode = 404;
        throw error;
    }

    if (message.senderId !== userId) {
        const error = new Error('Bu mesajı silməyə icazəniz yoxdur.');
        error.statusCode = 403; // Forbidden
        throw error;
    }

    // 3. Mesajı silirik
    await prisma.message.delete({
        where: { id: messageIdNum },
    });

    // Gələcəkdə WebSocket vasitəsilə qarşı tərəfə mesajın silindiyini bildirmək olar
    // mainNamespace.to(receiverId).emit('message_deleted', { messageId });

    return { message: 'Mesaj uğurla silindi.' };
};
const createMessage = async (senderId, connectionId, data) => {
    // Gələn məlumatları bir obyektdən çıxarırıq
    const { content, imageUrl, audioUrl } = data;

    // Yoxlama: Məlumatlardan ən azı biri mövcud olmalıdır
    if (!content && !imageUrl && !audioUrl) {
        throw new Error("Mesajın mətni, şəkli və ya səsi olmalıdır.");
    }

    return prisma.message.create({
        data: {
            content,
            imageUrl,
            audioUrl,
            senderId,
            connectionId: Number(connectionId),
        },
        include: {
            sender: {
                include: {
                    profile: { include: { photos: true } }
                }
            }
        }
    });
};

const createGroupMessage = async (senderId, venueId, data) => {
    // Gələn məlumatları vahid bir "data" obyektindən çıxarırıq
    const { content, imageUrl, audioUrl, videoUrl } = data;

    if (!content && !imageUrl && !audioUrl && !videoUrl) {
        throw new Error("Mesaj boş ola bilməz.");
    }

    return prisma.venueGroupMessage.create({
        data: {
            content,
            imageUrl,
            audioUrl,
            videoUrl,
            senderId,
            venueId: Number(venueId),
        },
        include: {
            sender: {
                include: {
                    profile: { include: { photos: true } }
                }
            }
        }
    });
};
const addOrUpdateGroupReaction = async (userId, messageId, emoji) => {
    // Upsert: Əgər istifadəçi bu mesaja bu emoji ilə reaksiya veribsə, heç nə etmə,
    // yoxdursa, yeni reaksiya yarat. Bu, təkrarlanmanın qarşısını alır.
    await prisma.groupMessageReaction.upsert({
        where: {
            messageId_userId_emoji: {
                messageId: Number(messageId),
                userId,
                emoji
            }
        },
        update: {},
        create: {
            messageId: Number(messageId),
            userId,
            emoji
        }
    });

    // Həmin mesaja aid BÜTÜN reaksiyaları qaytarırıq
    return prisma.groupMessageReaction.findMany({
        where: { messageId: Number(messageId) },
        select: { emoji: true, user: { select: { profile: { select: { name: true } } } } }
    });
};
module.exports = {
    getMessagesForConnection,
    reportMessage,
    getRandomIcebreakers,
    getGroupMessagesForVenue,deleteOwnMessage,createMessage,createGroupMessage,reportGroupMessage,addOrUpdateGroupReaction
};