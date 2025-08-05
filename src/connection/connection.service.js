
const prisma = require('../config/prisma');

const unmatchUser = async (userId, connectionId) => {
    // 1. Əvvəlcə bağlantının mövcud olduğunu yoxlayırıq.
    const connection = await prisma.connection.findUnique({
        where: { id: connectionId },
    });

    if (!connection) {
        // Daha aydın xəta mesajı
        const error = new Error('Bu ID ilə bağlantı tapılmadı.');
        error.statusCode = 404; // Xüsusi status kodu təyin edirik
        throw error;
    }

    // 2. Sonra, istifadəçinin bu bağlantının bir tərəfi olub-olmadığını yoxlayırıq.
    if (connection.userAId !== userId && connection.userBId !== userId) {
        const error = new Error('Bu bağlantını silmək üçün icazəniz yoxdur.');
        error.statusCode = 403; // Xüsusi status kodu təyin edirik
        throw error;
    }

    // 3. Əgər bütün yoxlamalar uğurludursa, bağlantını silirik.
    await prisma.connection.delete({
        where: { id: connectionId },
    });

    return { success: true };
};

const getConnectionsForUser = async (userId, { page = 1, limit = 20 }) => {
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
        delete partner.email;

        return {
            connectionId: conn.id,
            createdAt: conn.createdAt,
            partner: partner.profile,
        };
    });
     return { data: formattedConnections, totalPages: Math.ceil(total / limit), currentPage: page };
};

module.exports = {
    unmatchUser,
    getConnectionsForUser,
};