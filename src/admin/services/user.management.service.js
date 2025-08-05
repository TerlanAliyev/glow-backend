const prisma = require('../../config/prisma');
const redis = require('../../config/redis'); 
const { createAdminLog } = require('./audit.service'); // Diqqət: audit servisinə istinad edirik


const getUsersList = async () => {
    const users = await prisma.user.findMany({
        where: {
            // Rolunun adı 'ADMIN' OLMAYAN istifadəçiləri seçirik
            role: {
                name: {
                    not: 'ADMIN'
                }
            }
        },
        include: {
            profile: true,
            role: true
        },
        orderBy: {
            createdAt: 'desc'
        },
    });

    // Hər bir istifadəçinin şifrəsini cavabdan silirik
    return users.map(u => {
        delete u.password;
        return u;
    });
};

const getUsers = async (queryParams) => {
    const { search, sortBy = 'createdAt', order = 'desc', isActive } = queryParams;
    let page = parseInt(queryParams.page, 10) || 1;
    let limit = parseInt(queryParams.limit, 10) || 10;

    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    const skip = (page - 1) * limit;

    // ADMIN rolunu case-insensitive şəkildə istisna etmək üçün bütün mümkün variantları daxil edin
    const adminVariants = ['ADMIN', 'admin', 'Admin'];

    const whereConditions = [
        {
            role: {
                name: {
                    notIn: adminVariants,
                },
            },
        },
    ];

    if (search) {
        whereConditions.push({
            OR: [
                { profile: { name: { contains: search, mode: 'insensitive' } } },
                { email: { contains: search, mode: 'insensitive' } },
                {
                    profile: {
                        interests: {
                            some: { name: { contains: search, mode: 'insensitive' } },
                        },
                    },
                },
            ],
        });
    }

    if (isActive !== undefined) {
        whereConditions.push({ isActive: isActive === 'true' });
    }

    const where = { AND: whereConditions };

    const users = await prisma.user.findMany({
        where,
        include: { profile: true, role: true },
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
    });

    const totalUsers = await prisma.user.count({ where });

    // Passwordu silirik cavabdan
    const data = users.map((u) => {
        const user = { ...u };
        delete user.password;
        return user;
    });

    return {
        data,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: page,
    };
};

const getRoles = async () => {
    return prisma.role.findMany({
        orderBy: {
            id: 'asc'
        }
    });
};

const updateUserRole = async (userId, roleId, adminId) => {
    const user = await prisma.user.update({
        where: { id: userId },
        data: { roleId: parseInt(roleId) },
    });

    // Admin hərəkətini loglayırıq
    await createAdminLog(adminId, 'USER_ROLE_CHANGED', {
        targetUserId: userId,
        newRoleId: roleId
    });

    // YENİ ADDIM: Dəyişiklik olan istifadəçinin keşini təmizləyirik
    const cacheKey = `user_profile:${userId}`;
    await redis.del(cacheKey).catch(err => console.error("Redis-dən silmə xətası:", err));
    console.log(`[CACHE INVALIDATION] 🗑️ Admin tərəfindən yenilənən istifadəçi (${userId}) üçün keş təmizləndi.`);

    return user;
};

const updateUserStatus = async (userId, isActive, adminId) => {
    const user = await prisma.user.update({
        where: { id: userId },
        data: { isActive: isActive },
    });

    // Admin hərəkətini loglayırıq
    await createAdminLog(adminId, 'USER_STATUS_CHANGED', {
        targetUserId: userId,
        newStatus: isActive
    });

    // YENİ ADDIM: Dəyişiklik olan istifadəçinin keşini təmizləyirik
    const cacheKey = `user_profile:${userId}`;
    await redis.del(cacheKey).catch(err => console.error("Redis-dən silmə xətası:", err));
    console.log(`[CACHE INVALIDATION] 🗑️ Admin tərəfindən yenilənən istifadəçi (${userId}) üçün keş təmizləndi.`);

    return user;
};

const getUserConnections = async (userId, { page = 1, limit = 10 }) => {
    // Addım 1: İstifadəçinin mövcudluğunu yoxlayırıq
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        const error = new Error('Bu ID ilə istifadəçi tapılmadı.');
        error.statusCode = 404;
        throw error;
    }

    const skip = (page - 1) * limit;
    const where = { OR: [{ userAId: userId }, { userBId: userId }] };

    // Eyni anda həm bağlantıları, həm də ümumi sayı alırıq
    const [connections, total] = await prisma.$transaction([
        prisma.connection.findMany({
            where,
            include: {
                userA: { include: { profile: true } },
                userB: { include: { profile: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.connection.count({ where })
    ]);

    return {
        data: connections,
        totalPages: Math.ceil(total / limit),
        currentPage: page
    };
};

const getUserReports = async (userId, { page = 1, limit = 10 }) => {
    // İstifadəçinin mövcudluğunu yoxlayırıq
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        const error = new Error('Bu ID ilə istifadəçi tapılmadı.');
        error.statusCode = 404;
        throw error;
    }

    const skip = (page - 1) * limit;
    const where = { reportedUserId: userId };

    const [reports, total] = await prisma.$transaction([
        prisma.report.findMany({
            where,
            include: {
                reporter: { select: { id: true, email: true, profile: { select: { name: true } } } }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.report.count({ where })
    ]);

    return {
        data: reports,
        totalPages: Math.ceil(total / limit),
        currentPage: page
    };
};

const getUserActivity = async (userId) => {
    // Addım 1: İstifadəçinin mövcudluğunu yoxlayırıq
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        const error = new Error('Bu ID ilə istifadəçi tapılmadı.');
        error.statusCode = 404;
        throw error;
    }

    // Addım 2: Əgər istifadəçi varsa, fəaliyyəti axtarırıq
    const [lastSignal, lastMessage, lastCheckIn] = await prisma.$transaction([
        prisma.signal.findFirst({ where: { senderId: userId }, orderBy: { createdAt: 'desc' } }),
        prisma.message.findFirst({ where: { senderId: userId }, orderBy: { createdAt: 'desc' } }),
        prisma.activeSession.findFirst({ where: { userId: userId }, orderBy: { createdAt: 'desc' } })
    ]);

    return {
        lastLogin: user.updatedAt,
        lastSignal: lastSignal?.createdAt || null,
        lastMessage: lastMessage?.createdAt || null,
        lastCheckIn: lastCheckIn?.createdAt || null,
    };
};

const getBannedUsers = async (queryParams) => {
    const { page = 1, limit = 10 } = queryParams;
    
    const cacheKey = `admin:banned_users:page:${page}:limit:${limit}`;
    try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log(`[CACHE HIT] ✅ Banlanmış istifadəçilər siyahısı keşdən tapıldı.`);
            return JSON.parse(cachedData);
        }
    } catch (error) { console.error("Redis-dən oxuma xətası:", error); }

    console.log(`[CACHE MISS] ❌ Banlanmış istifadəçilər siyahısı keşdə tapılmadı.`);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { isActive: false };

    const [users, total] = await prisma.$transaction([
        prisma.user.findMany({ where, include: { profile: true, role: true }, orderBy: { updatedAt: 'desc' }, skip, take: parseInt(limit) }),
        prisma.user.count({ where })
    ]);
    
    const data = users.map(u => { delete u.password; return u; });
    const result = { data, totalPages: Math.ceil(total / parseInt(limit)), currentPage: parseInt(page) };

    try {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600); // 1 saatlıq keş
    } catch (error) { console.error("Redis-ə yazma xətası:", error); }
    
    return result;
};

const deleteUser = async (targetUserId, adminId) => {
    // Adminin özünü silməsinin qarşısını alırıq
    if (targetUserId === adminId) {
        const error = new Error('Admin öz hesabını silə bilməz.');
        error.statusCode = 400;
        throw error;
    }

    // Bu, çox mürəkkəb bir əməliyyatdır. Prisma Transaction istifadə edirik ki,
    // bütün silmə əməliyyatları ya birlikdə uğurlu olsun, ya da heç biri olmasın.
    return prisma.$transaction(async (tx) => {
        // İstifadəçiyə aid olan bütün asılılıqları silirik
        await tx.signal.deleteMany({ where: { OR: [{ senderId: targetUserId }, { receiverId: targetUserId }] } });
        await tx.connection.deleteMany({ where: { OR: [{ userAId: targetUserId }, { userBId: targetUserId }] } });
        await tx.report.deleteMany({ where: { OR: [{ reporterId: targetUserId }, { reportedUserId: targetUserId }] } });
        await tx.block.deleteMany({ where: { OR: [{ blockerId: targetUserId }, { blockedId: targetUserId }] } });
        await tx.activeSession.deleteMany({ where: { userId: targetUserId } });
        await tx.device.deleteMany({ where: { userId: targetUserId } });
        await tx.notification.deleteMany({ where: { userId: targetUserId } });
        await tx.feedback.deleteMany({ where: { authorId: targetUserId } });
        await tx.checkInHistory.deleteMany({ where: { userId: targetUserId } });
        await tx.message.deleteMany({ where: { senderId: targetUserId } });
        await tx.adminLog.deleteMany({ where: { adminId: targetUserId } });

        // Asılılıqlar silindikdən sonra profili silirik
        await tx.profile.deleteMany({ where: { userId: targetUserId } });

        // Nəhayət, istifadəçinin özünü silirik
        const deletedUser = await tx.user.delete({ where: { id: targetUserId } });

        // Bu hərəkəti loglayırıq
        await tx.adminLog.create({
            data: {
                adminId: adminId,
                action: 'USER_DELETED',
                details: { targetUserId: deletedUser.id, email: deletedUser.email }
            }
        });
    });
};

const updateUserContact = async (userId, data, adminId) => { // adminId parametrini qəbul edir
    const { email, phoneNumber } = data;
    const updates = [];

    if (email) {
        updates.push(prisma.user.update({ where: { id: userId }, data: { email } }));
    }
    if (phoneNumber !== undefined) {
        updates.push(prisma.profile.updateMany({ where: { userId }, data: { phoneNumber } }));
    }

    if (updates.length > 0) {
        await prisma.$transaction(updates);
    }

    // Admin hərəkətini qeydə alırıq
    await createAdminLog(adminId, 'USER_CONTACT_CHANGED', { targetUserId: userId, changes: data });

    return { message: "Məlumatlar uğurla yeniləndi." };
};

const updateUserSubscription = async (userId, subscriptionType) => {
    if (!['FREE', 'PREMIUM'].includes(subscriptionType.toUpperCase())) {
        throw new Error('Yanlış abunəlik tipi.');
    }
    return prisma.user.update({
        where: { id: userId },
        data: { subscription: subscriptionType.toUpperCase() },
    });
};

module.exports = {
    getUsers,
    getRoles,
    updateUserRole,
    updateUserStatus,
    getUserConnections,
    getUserReports,
    getUserActivity,
    getBannedUsers,
    deleteUser,
    updateUserContact,
    getUsersList,
    updateUserSubscription
};