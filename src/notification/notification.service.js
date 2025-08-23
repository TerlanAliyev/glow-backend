const admin = require('firebase-admin');
const prisma = require('../config/prisma');
const redis = require('../config/redis');

// Firebase Admin SDK başlatma
try {
  const serviceAccount = require('../../serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase Admin SDK uğurla başladıldı.");
} catch (error) {
  console.error("Firebase Admin SDK başlatmaq mümkün olmadı:", error.message);
}

// Cihaz tokenini qeydiyyatdan keçirir
const registerDevice = async (userId, deviceToken) => {
  return prisma.device.upsert({
    where: { token: deviceToken },
    update: { userId: userId },
    create: { userId: userId, token: deviceToken },
  });
};

// Push bildiriş göndərir (YENİLƏNMİŞ VƏ TAM VERSİYA)
const sendPushNotification = async (userId, title, body, data = {}, notificationTypeOrTokens) => {
    try {
        let tokens = [];

        // Əgər notificationTypeOrTokens array-dırsa, deməli broadcast üçündür
        if (Array.isArray(notificationTypeOrTokens)) {
            tokens = notificationTypeOrTokens;
        } else {
            const notificationType = notificationTypeOrTokens;

            if (!userId) {
                console.error("sendPushNotification: userId yoxdur və notificationType verilmişdir.");
                return;
            }

            // ADDIM 1: İstifadəçi bildiriş ayarlarını yoxla
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { profile: true }
            });

            if (!user || !user.profile) return;

            const canSend =
                (notificationType === 'NEW_SIGNAL' && user.profile.notifyOnNewSignal) ||
                (notificationType === 'NEW_MATCH' && user.profile.notifyOnNewMatch) ||
                (notificationType === 'NEW_MESSAGE' && user.profile.notifyOnNewMessage);

            if (!canSend) {
                console.log(`Bildiriş göndərilmədi: İstifadəçi ${userId} "${notificationType}" növ bildirişləri deaktiv edib.`);
                return;
            }

            // Cihaz tokenləri tap
            const devices = await prisma.device.findMany({ where: { userId } });
            tokens = devices.map(device => device.token);
        }

        if (tokens.length === 0) {
            console.log("Heç bir token tapılmadı, bildiriş göndərilmir.");
            return;
        }

        const message = {
            notification: { title, body },
            data,
            tokens,
        };

        const response = await admin.messaging().sendEachForMulticast(message);

        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                    console.error(`Token ${tokens[idx]} üçün bildiriş uğursuz oldu:`, resp.error);
                }
            });
            console.log('Bu tokenlərə bildiriş göndərilə bilmədi:', failedTokens);
        }
    } catch (error) {
        console.error(`Push bildiriş zamanı xəta:`, error);
    }
};

// Databazada bildiriş yaradır və push bildiriş göndərir (dəyişməz qalıb)
const createAndSendNotification = async (userId, type, content, data = {}) => {
  await prisma.notification.create({
    data: {
      userId,
      type,
      content,
    },
  });

  const [title, ...bodyParts] = content.split('!');
  const body = bodyParts.join('!').trim();
  await sendPushNotification(userId, title, body, data, type); // notificationType olaraq 'type' ötürülür
};

// İstifadəçi üçün bildirişləri gətirir (dəyişməz qalıb)
const getNotificationsForUser = async (userId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const cacheKey = `notifications:user:${userId}:page:${page}:limit:${limit}`;
    const cacheTTL = 600; // 10 dəqiqə

    // 1. Əvvəlcə Redis keşdə məlumatı axtarırıq
    try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log(`[CACHE HIT] ✅ İstifadəçi (${userId}) bildirişləri keşdən tapıldı.`);
            return JSON.parse(cachedData);
        }
    } catch (error) {
        console.error("Redis-dən oxuma xətası:", error);
    }

    console.log(`[CACHE MISS] ❌ İstifadəçi (${userId}) bildirişləri keşdə tapılmadı. Databazadan axtarılır...`);
    
    // 2. Keşdə yoxdursa, verilənlər bazasından məlumatları çəkirik
    const [notifications, total] = await prisma.$transaction([
        prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip: skip,
            take: limit,
        }),
        prisma.notification.count({ where: { userId } })
    ]);

    const result = {
        data: notifications,
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

const markAsRead = async (userId, notificationId) => {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId: userId,
    }
  });
  if (!notification) {
    const error = new Error('Bildiriş tapılmadı və ya bu bildirişə baxmaq üçün icazəniz yoxdur.');
    error.statusCode = 404;
    throw error;
  }
  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
};

module.exports = {
  registerDevice,
  sendPushNotification,
  createAndSendNotification,
  getNotificationsForUser,
  markAsRead
};