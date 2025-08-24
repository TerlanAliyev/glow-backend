// Fayl: src/chat/chat.service.js

const prisma = require('../config/prisma');
const { redisClient } = require('../config/redis');
const redis = require('../config/redis');

const clearAdminReportsCache = async () => {
    try {
        const keys = await redis.keys('admin:reports:page:*');
        if (keys.length > 0) {
            await redis.del(keys);
            console.log('[CACHE INVALIDATION] Admin Reports keş təmizləndi.');
        }
    } catch (error) {
        console.error('Admin Reports keşini təmizləmə xətası:', error);
    }
};


const getMessagesForConnection = async (userId, connectionId, { page = 1, limit = 30 }) => {
    const connection = await prisma.connection.findFirst({
        where: { id: connectionId, OR: [{ userAId: userId }, { userBId: userId }] }
    });
    if (!connection) throw new Error('Bu söhbətə baxmaq üçün icazəniz yoxdur.');

    const cacheKey = `chat_history:${connectionId}:page:${page}:limit:${limit}`;
    const cacheTTL = 300; // 5 dəqiqə

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

    const skip = (page - 1) * limit;
    const [messages, total] = await prisma.$transaction([
        prisma.message.findMany({
            where: { connectionId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: { sender: { include: { profile: { select: { name: true } } } } }
        }),
        prisma.message.count({ where: { connectionId } })
    ]);

    const result = {
        data: messages.reverse(),
        totalPages: Math.ceil(total / limit),
        currentPage: page
    };

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
    await clearAdminReportsCache();

    return prisma.report.create({
        data: {
            reporterId,
            reportedMessageId: messageId,
            reportedUserId: message.senderId,
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
    await clearAdminReportsCache();

    return prisma.report.create({
        data: {
            reporterId,
            reportedGroupMessageId: Number(messageId),
            reportedUserId: message.senderId,
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
            reactions: {
                select: { emoji: true, user: { select: { profile: { select: { name: true } } } } }
            }
        }
    });
};
const deleteOwnMessage = async (userId, messageId) => {
    const messageIdNum = Number(messageId);

    const message = await prisma.message.findUnique({
        where: { id: messageIdNum },
    });

    if (!message) {
        const error = new Error('Mesaj tapılmadı.');
        error.statusCode = 404;
        throw error;
    }

    if (message.senderId !== userId) {
        const error = new Error('Bu mesajı silməyə icazəniz yoxdur.');
        error.statusCode = 403;
        throw error;
    }

    await prisma.message.delete({
        where: { id: messageIdNum },
    });

    return { message: 'Mesaj uğurla silindi.' };
};

const createMessage = async (senderId, connectionId, data) => {
    // data obyektindən encryptedContent-i çıxarırıq
    const { encryptedContent, imageUrl, audioUrl } = data;

    // Şərtə encryptedContent-i əlavə edirik
    if (!encryptedContent && !imageUrl && !audioUrl) {
        throw new Error("Mesajın mətni, şəkli və ya səsi olmalıdır.");
    }
    
    // Keş təmizlənməsi
    const connectionCacheKeys = await redis.keys(`chat_history:${connectionId}:*`);
    if (connectionCacheKeys.length > 0) {
        await redis.del(connectionCacheKeys).catch(err => console.error(err));
        console.log(`[CACHE INVALIDATION] Chat ${connectionId} üçün keş təmizləndi.`);
    }

    return prisma.message.create({
        data: {
            // content-i encryptedContent ilə əvəz edirik
            content: encryptedContent,
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
    // data obyektindən encryptedContent-i çıxarırıq
    const { encryptedContent, imageUrl, audioUrl, videoUrl } = data;

    // Şərtə encryptedContent-i əlavə edirik
    if (!encryptedContent && !imageUrl && !audioUrl && !videoUrl) {
        throw new Error("Mesaj boş ola bilməz.");
    }

    return prisma.venueGroupMessage.create({
        data: {
            // content-i encryptedContent ilə əvəz edirik
            content: encryptedContent,
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