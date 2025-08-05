
const prisma = require('../config/prisma');
const { calculateVenueStatistics } = require('../scheduler/scheduler.service');

const getStatsSummary = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
        totalUsers, newUsersToday, activeSessions, totalConnections, pendingReports
    ] = await prisma.$transaction([
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: today } } }),
        prisma.activeSession.count(),
        prisma.connection.count(),
        prisma.report.count({ where: { status: 'PENDING' } })
    ]);

    return { totalUsers, newUsersToday, activeSessions, totalConnections, pendingReports };
};

//User Menagement
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
const updateUserRole = async (userId, roleId) => {
    return prisma.user.update({
        where: { id: userId },
        data: { roleId: parseInt(roleId) },
    });
    await createAdminLog(adminId, 'USER_ROLE_CHANGED', { targetUserId, newRoleId: roleId });
    return user;
};
const getRoles = async () => {
    return prisma.role.findMany({
        orderBy: {
            id: 'asc'
        }
    });
};
const updateUserStatus = async (userId, isActive) => {
    return prisma.user.update({
        where: { id: userId },
        data: { isActive: isActive },
    });
    await createAdminLog(adminId, 'USER_STATUS_CHANGED', { targetUserId, newStatus: isActive });
    return user;
};

const getReports = async () => {
    return prisma.report.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            reporter: { include: { profile: true } },
            reportedUser: { include: { profile: true } },
            reportedMessage: true,        // Şəxsi mesaj məlumatları
            reportedGroupMessage: true,   // YENİ: Qrup mesajı məlumatları
        }
    });
};

const updateReportStatus = async (reportId, status) => {
    // Statusun Enum-a uyğun olduğunu yoxlayırıq
    if (!['PENDING', 'RESOLVED', 'REJECTED'].includes(status)) {
        throw new Error('Yanlış status dəyəri.');
    }
    return prisma.report.update({
        where: { id: reportId },
        data: { status: status },
    });
};

const updateUserContact = async (userId, data) => {
    const { email, phoneNumber } = data;
    const updates = [];

    // Əgər email göndərilibsə, User modelini yeniləmək üçün hazırlıq gör
    if (email) {
        updates.push(prisma.user.update({
            where: { id: userId },
            data: { email: email },
        }));
    }

    // Əgər telefon nömrəsi göndərilibsə, Profile modelini yeniləmək üçün hazırlıq gör
    if (phoneNumber !== undefined) { // Boş string göndərilə bilər (nömrəni silmək üçün)
        updates.push(prisma.profile.update({
            where: { userId: userId },
            data: { phoneNumber: phoneNumber },
        }));
    }

    // Bütün yeniləmələri tək bir tranzaksiyada icra et
    if (updates.length > 0) {
        return prisma.$transaction(updates);
    }

    return { message: "Yeniləmək üçün heç bir məlumat göndərilmədi." };
};
// src/admin/admin.service.js

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
// src/admin/admin.service.js

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
const getBannedUsers = async ({ page = 1, limit = 10 }) => {
    const skip = (page - 1) * limit;
    const where = { isActive: false };
    const [users, total] = await prisma.$transaction([
        prisma.user.findMany({ where, include: { profile: true, role: true }, orderBy: { updatedAt: 'desc' }, skip, take: limit }),
        prisma.user.count({ where })
    ]);
    const data = users.map(u => { delete u.password; return u; });
    return { data, totalPages: Math.ceil(total / limit), currentPage: page };
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

//stats
const getUsageOverTime = async () => {
    const result = await prisma.$queryRaw`
        SELECT 
            DATE("createdAt") as date, 
            COUNT(id) as count 
        FROM "User" 
        WHERE "createdAt" >= NOW() - INTERVAL '30 days' 
        GROUP BY DATE("createdAt") 
        ORDER BY date ASC;
    `;

    // === DÜZƏLİŞ BURADADIR ===
    // Databazadan gələn `BigInt` tipini JSON-un anladığı `Number`-a çeviririk.
    return result.map(row => ({
        ...row,
        count: Number(row.count)
    }));
};
const getPopularVenues = async () => {
    // Artıq `ActiveSession` yox, `CheckInHistory` cədvəlindən oxuyuruq.
    const result = await prisma.checkInHistory.groupBy({
        by: ['venueId'],
        _count: {
            venueId: true,
        },
        orderBy: {
            _count: {
                venueId: 'desc',
            },
        },
        take: 10,
    });

    if (result.length === 0) return [];

    const venueIds = result.map(item => item.venueId);
    const venues = await prisma.venue.findMany({
        where: { id: { in: venueIds } },
        select: { id: true, name: true }
    });
    const venueMap = new Map(venues.map(v => [v.id, v.name]));

    return result.map(item => ({
        venueName: venueMap.get(item.venueId) || 'Bilinməyən Məkan',
        checkInCount: item._count.venueId,
    }));
};



// Venues
const getVenues = async ({ page = 1, limit = 10 }) => {
    const skip = (page - 1) * limit;
    const [venues, total] = await prisma.$transaction([
        prisma.venue.findMany({ orderBy: { name: 'asc' }, skip, take: limit }),
        prisma.venue.count()
    ]);
    return { data: venues, totalPages: Math.ceil(total / limit), currentPage: page };
};

const createVenue = async (data) => {
    // Artıq 'category' sahəsini də qəbul edirik
    const { name, address, latitude, longitude, description, category } = data;
    return prisma.venue.create({ 
        data: { name, address, latitude, longitude, description, category } 
    });
};
const updateVenue = async (id, data) => {
    // Frontend-dən gələ biləcək bütün mümkün sahələri qeyd edirik
    const { name, address, latitude, longitude, description, category } = data;
    
    // Yalnız göndərilən sahələrdən ibarət yeni bir obyekt yaradırıq
    const dataToUpdate = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (address !== undefined) dataToUpdate.address = address;
    if (latitude !== undefined) dataToUpdate.latitude = parseFloat(latitude);
    if (longitude !== undefined) dataToUpdate.longitude = parseFloat(longitude);
    if (description !== undefined) dataToUpdate.description = description;
    if (category !== undefined) dataToUpdate.category = category;

    return prisma.venue.update({ 
        where: { id: id }, 
        data: dataToUpdate 
    });
};
const deleteVenue = async (id) => prisma.venue.delete({ where: { id } });
const getVenueActivity = async (venueId) => {
    const twentyFourHoursAgo = new Date(new Date() - 24 * 60 * 60 * 1000);
    
    const checkInCount = await prisma.activeSession.count({
        where: {
            venueId: venueId,
            createdAt: {
                gte: twentyFourHoursAgo,
            }
        }
    });

    return { venueId, checkInsLast24Hours: checkInCount };
};

const updateVenueStatus = async (id, isActive) => {
    return prisma.venue.update({
        where: { id },
        data: { isActive },
    });
};

const updateVenueFeatureStatus = async (id, isFeatured) => {
    return prisma.venue.update({
        where: { id },
        data: { isFeatured },
    });
};

// Interests
const getCategories = async () => prisma.category.findMany({ include: { interests: true }, orderBy: { name: 'asc' } });
const createCategory = async (name) => prisma.category.create({ data: { name } });

const updateCategory = async (id, name) => {
    return prisma.category.update({
        where: { id },
        data: { name },
    });
};

const deleteCategory = async (id) => {
    // Bir kateqoriyanı silməzdən əvvəl, ona bağlı olan bütün maraqları
    // silməliyik ki, databazada "yetim" data qalmasın.
    // Transaction istifadə edirik ki, hər iki əməliyyat birlikdə baş versin.
    return prisma.$transaction(async (tx) => {
        // 1. Bu kateqoriyaya aid bütün maraqları sil
        await tx.interest.deleteMany({
            where: { categoryId: id },
        });

        // 2. Maraqlar silindikdən sonra kateqoriyanın özünü sil
        await tx.category.delete({
            where: { id },
        });
    });
};

const createInterest = async (data) => prisma.interest.create({ data });
const deleteInterest = async (id) => prisma.interest.delete({ where: { id } });

//Admin Logs
const createAdminLog = async (adminId, action, details = {}) => {
    return prisma.adminLog.create({
        data: { adminId, action, details }
    });
};

const getAdminLogs = async (queryParams) => {
    let page = parseInt(queryParams.page, 10);
    let limit = parseInt(queryParams.limit, 10);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 20;

    const skip = (page - 1) * limit;

    const logs = await prisma.adminLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limit,
        include: {
            admin: {
                include: {
                    profile: { select: { name: true } }
                }
            }
        }
    });

    // DƏYİŞİKLİK BURADA BAŞLAYIR
    // Hər bir log üçün əlavə məlumatları (hədəf adını) çəkmək üçün yeni bir məntiq
    const enrichedLogs = await Promise.all(
        logs.map(async (log) => {
            const details = log.details; // Prisma JSON-u avtomatik olaraq obyektə çevirir
            let targetName = null;

            // Əgər hədəf istifadəçidirsə, onun adını tapırıq
            if (details && details.targetUserId) {
                const user = await prisma.user.findUnique({
                    where: { id: details.targetUserId },
                    select: { profile: { select: { name: true } } }
                });
                targetName = user?.profile?.name || null;
            }
            // Gələcəkdə digər tiplər üçün də yoxlamalar əlavə edə bilərsiniz
            // else if (details && details.targetVenueId) {
            //     const venue = await prisma.venue.findUnique({ where: { id: details.targetVenueId }, select: { name: true } });
            //     targetName = venue?.name || null;
            // }

            // Orijinal log obyektinə yeni "details" sahəsi əlavə edirik
            return {
                ...log,
                details: {
                    ...details,
                    targetName: targetName || 'N/A (Silinib və ya tapılmadı)'
                }
            };
        })
    );
    // DƏYİŞİKLİK BURADA BİTİR

    const totalLogs = await prisma.adminLog.count();
    
    return {
        data: enrichedLogs, // Frontend-ə zənginləşdirilmiş datanı göndəririk
        totalPages: Math.ceil(totalLogs / limit),
        currentPage: page
    };
};

//Message Management
const deleteMessage = async (messageId) => {
    return prisma.message.delete({ where: { id: messageId } });
};

//Notification & Marketing
const broadcastNotification = async (adminId, title, body) => {
    // 1. Göndərilən bildirişi tarixçə üçün databazada saxlayırıq
    await prisma.broadcastNotification.create({
        data: {
            title,
            body,
            sentById: adminId,
        }
    });

    // 2. Bütün aktiv istifadəçilərin cihaz tokenlərini tapırıq
    // Təkrar tokenlərin olmaması üçün `distinct` istifadə edirik
    const allDevices = await prisma.device.findMany({
        distinct: ['token'],
    });

    const allTokens = allDevices.map(device => device.token);

    if (allTokens.length === 0) {
        return { message: "Bildiriş göndərmək üçün heç bir aktiv cihaz tapılmadı." };
    }

    // 3. Push bildiriş servisinə göndəririk
    // `sendPushNotification` funksiyasını təkrar istifadə edirik, amma bu dəfə
    // `userId` yerinə birbaşa token siyahısı göndəririk. Bunun üçün
    // `notification.service.js`-də kiçik bir dəyişiklik edəcəyik.
    const result = await sendPushNotification(null, title, body, {}, allTokens);

    return result;
};

const getBroadcastHistory = async () => {
    return prisma.broadcastNotification.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            sentBy: {
                select: { profile: { select: { name: true } } }
            }
        }
    });
};


// Icebreaker Questions
const getIcebreakers = async () => prisma.icebreakerQuestion.findMany({ orderBy: { createdAt: 'desc' } });
const createIcebreaker = async (text,category) => prisma.icebreakerQuestion.create({ data: { text,category } });
const updateIcebreaker = async (id, data) => {
    const { text, category } = data; // Artıq 'category' də qəbul edir
    return prisma.icebreakerQuestion.update({ where: { id: Number(id) }, data: { text, category } });
};
const deleteIcebreaker = async (id) => prisma.icebreakerQuestion.delete({ where: { id: Number(id) } });


//Premium-Free
const updateUserSubscription = async (userId, subscriptionType) => {
    if (!['FREE', 'PREMIUM'].includes(subscriptionType.toUpperCase())) {
        throw new Error('Yanlış abunəlik tipi.');
    }
    return prisma.user.update({
        where: { id: userId },
        data: { subscription: subscriptionType.toUpperCase() },
    });
};

const triggerVenueStatCalculation = async () => {
    // Birbaşa scheduler-dəki funksiyanı çağırırıq
    calculateVenueStatistics();
    return { message: "Məkan statistikalarının hesablanması prosesi arxa planda başladıldı. Nəticələrin görünməsi bir neçə dəqiqə çəkə bilər." };
};

module.exports = {
     getUsers, updateUserRole, updateUserStatus, getReports, updateReportStatus,
    getVenues, createVenue, updateVenue, deleteVenue,
    getCategories, createCategory, createInterest, deleteInterest,
    createAdminLog, getAdminLogs,
    getUserConnections, getUserReports, getUserActivity,deleteMessage, getVenueActivity,
    updateVenueStatus,
    updateVenueFeatureStatus, broadcastNotification,
    getBroadcastHistory,getStatsSummary,
    getUsageOverTime,
    getPopularVenues,getRoles, getUsersList,updateCategory,
    deleteCategory,getBannedUsers,
    deleteUser,
    getIcebreakers, createIcebreaker, updateIcebreaker, deleteIcebreaker,
    updateUserSubscription,updateUserContact,triggerVenueStatCalculation
    
};
