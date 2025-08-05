
const prisma = require('../config/prisma');
const redis = require('../config/redis');

const unmatchUser = async (userId, connectionId) => {
    // 1. Bağlantının mövcudluğunu və istifadəçiyə aid olduğunu yoxlayırıq
    const connection = await prisma.connection.findUnique({
        where: { id: connectionId },
    });

    if (!connection) {
        const error = new Error('Bu ID ilə bağlantı tapılmadı.');
        error.statusCode = 404;
        throw error;
    }

    if (connection.userAId !== userId && connection.userBId !== userId) {
        const error = new Error('Bu bağlantını silmək üçün icazəniz yoxdur.');
        error.statusCode = 403;
        throw error;
    }

    // 2. Bağlantını verilənlər bazasından silirik
    await prisma.connection.delete({
        where: { id: connectionId },
    });

    // 3. Hər iki istifadəçinin bağlantı keşini (bütün səhifələri ilə birlikdə) təmizləyirik
    try {
        const userAId = connection.userAId;
        const userBId = connection.userBId;

        // A istifadəçisinin bütün bağlantı keşi açarlarını tapırıq (məs: connections:userA-id:page:1...)
        const keysA = await redis.keys(`connections:${userAId}:*`);
        if (keysA.length > 0) {
            await redis.del(keysA); // Tapılan bütün açarları silirik
        }

        // B istifadəçisinin bütün bağlantı keşi açarlarını tapırıq
        const keysB = await redis.keys(`connections:${userBId}:*`);
        if (keysB.length > 0) {
            await redis.del(keysB);
        }
        
        console.log(`[CACHE INVALIDATION] 🗑️ "Unmatch" səbəbi ilə ${userAId} və ${userBId} üçün bağlantı keşi təmizləndi.`);
    } catch (error) {
        console.error("Redis-dən keş təmizlənərkən xəta baş verdi:", error);
    }

    return { success: true };
};


const getConnectionsForUser = async (userId, { page = 1, limit = 20 }) => {
    const cacheKey = `connections:${userId}:page:${page}:limit:${limit}`;
    
    // 1. Əvvəlcə Redis-i yoxlayırıq
    try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log(`[CACHE HIT] ✅ İstifadəçi (${userId}) bağlantıları keşdən tapıldı.`);
            return JSON.parse(cachedData);
        }
    } catch (error) {
        console.error("Redis-dən oxuma xətası:", error);
    }

    console.log(`[CACHE MISS] ❌ İstifadəçi (${userId}) bağlantıları keşdə tapılmadı. Verilənlər bazasına sorğu göndərilir...`);
    
    // 2. Keşdə yoxdursa, verilənlər bazasından oxuyuruq (səhifələmə ilə)
    const skip = (page - 1) * limit;
    const where = { OR: [{ userAId: userId }, { userBId: userId }] };

    const [connections, total] = await prisma.$transaction([
        prisma.connection.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                userA: { include: { profile: true } },
                userB: { include: { profile: true } },
            },
        }),
        prisma.connection.count({ where })
    ]);
    
    const formattedConnections = connections.map(conn => {
        const partner = conn.userAId === userId ? conn.userB : conn.userA;
        delete partner.password;
        return {
            connectionId: conn.id,
            createdAt: conn.createdAt,
            partner: partner.profile,
        };
    });
    
    const result = { data: formattedConnections, totalPages: Math.ceil(total / limit), currentPage: page };

    // 3. Nəticəni Redis-ə yazırıq
    try {
        // Bu siyahı tez-tez dəyişə biləcəyi üçün qısa bir TTL (10 dəqiqə) veririk
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 600); 
    } catch (error) {
        console.error("Redis-ə yazma xətası:", error);
    }

    return result;
};

module.exports = {
    unmatchUser,
    getConnectionsForUser,
};