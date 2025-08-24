
const prisma = require('../config/prisma');
const { redisClient } = require('../config/redis');

// Fayl: src/chat/chat.service.js

const redis = require('../config/redis');



const getMessagesForConnection = async (userId, connectionId, { page = 1, limit = 30 }) => {
    // 1. Təhlükəsizlik yoxlaması
    const connection = await prisma.connection.findFirst({
        where: { id: connectionId, OR: [{ userAId: userId }, { userBId: userId }] }
    });
    if (!connection) throw new Error('Bu söhbətə baxmaq üçün icazəniz yoxdur.');

    const cacheKey = `chat_history:${connectionId}:page:${page}:limit:${limit}`;
    const cacheTTL = 300; // 5 dəqiqə

    // 2. Keşdə axtarış
    try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log(`[CACHE HIT] ✅ Söhbət tarixçəsi keşdən tapıldı: ${cacheKey}`);
            return JSON.parse(cachedData);
        }
    } catch (error) {
        console.error("Redis-dən oxuma xətası:", error);
    }

    console.log(`[CACHE MISS] ❌ Söhbət tarixçəsi keşdə tapılmadı. Verilənlər bazasından alınır...`);

    // 3. Verilənlər bazasına sorğu
    const skip = (page - 1) * limit;
    const [messages, total] = await prisma.$transaction([
        prisma.message.findMany({
            where: { connectionId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: { sender: { include: { profile: { select: { name: true } } } } } // Yalnız ad məlumatını çəkirik
        }),
        prisma.message.count({ where: { connectionId } })
    ]);

    const result = {
        data: messages.reverse(),
        totalPages: Math.ceil(total / limit),
        currentPage: page
    };

    // 4. Nəticəni Redis-ə yazırıq
    try {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', cacheTTL);
    } catch (error) {
        console.error("Redis-ə yazma xətası:", error);
    }

    return result;
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
    
    // YENİ ƏLAVƏ OLUNMUŞ BLOK
    // Yeni mesaj yaradılmadan əvvəl mövcud keşlər silinir.
    // Bu, mesaj göndərilərkən bir az gecikmə yarada bilər,
    // lakin keşin hər zaman ən son məlumatı əks etdirməsini təmin edir.
    const connectionCacheKeys = await redis.keys(`chat_history:${connectionId}:*`);
    if (connectionCacheKeys.length > 0) {
        await redis.del(connectionCacheKeys).catch(err => console.error(err));
        console.log(`[CACHE INVALIDATION] Chat ${connectionId} üçün keş təmizləndi.`);
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
    getGroupMessagesForVenue, deleteOwnMessage, createMessage, createGroupMessage, reportGroupMessage, addOrUpdateGroupReaction
};