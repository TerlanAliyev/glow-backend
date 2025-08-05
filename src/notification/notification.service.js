const admin = require('firebase-admin');
const prisma = require('../config/prisma');

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

// Cihaz tokenini qeydiyyat
const registerDevice = async (userId, deviceToken) => {
  return prisma.device.upsert({
    where: { token: deviceToken },
    update: { userId: userId },
    create: { userId: userId, token: deviceToken },
  });
};

// Push bildiriş göndər

const sendPushNotification = async (userId, title, body, data = {}, notificationType) => {
    try {
        // ADDIM 1: Əgər bildirişin növü verilibsə, istifadəçinin ayarlarını yoxla
        if (notificationType) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { profile: true }
            });

            // Əgər istifadəçi və ya profili yoxdursa, heç nə etmə
            if (!user || !user.profile) return;

            // İstifadəçinin bu növ bildirişə icazə verib-vermədiyini yoxla
            const canSend = 
                (notificationType === 'NEW_SIGNAL' && user.profile.notifyOnNewSignal) ||
                (notificationType === 'NEW_MATCH' && user.profile.notifyOnNewMatch) ||
                (notificationType === 'NEW_MESSAGE' && user.profile.notifyOnNewMessage);

            // Əgər icazə yoxdursa, funksiyanı dayandır
            if (!canSend) {
                console.log(`Bildiriş göndərilmədi: İstifadəçi ${userId} "${notificationType}" növ bildirişləri deaktiv edib.`);
                return;
            }
        }

        // ADDIM 2: İcazə varsa (və ya yoxlama tələb olunmursa), cihazları tap və bildirişi göndər
        const devices = await prisma.device.findMany({ where: { userId } });
        if (devices.length === 0) {
            console.log(`Bildiriş göndərilmədi: İstifadəçi ${userId} üçün heç bir cihaz tapılmadı.`);
            return;
        }
        const tokens = devices.map(device => device.token);

        if (tokens.length === 0) return;

        // Firebase-ə göndərmə məntiqi (bu hissə dəyişməz qalıb)
        const tokenChunks = [];
        for (let i = 0; i < tokens.length; i += 500) {
            tokenChunks.push(tokens.slice(i, i + 500));
        }

        for (const chunk of tokenChunks) {
            const message = {
                notification: { title, body },
                data,
                tokens: chunk,
            };
            await admin.messaging().sendMulticast(message);
        }

    } catch (error) {
        console.error(`Push bildiriş zamanı xəta:`, error);
    }
};
const createAndSendNotification = async (userId, type, content, data = {}) => {
  // 1. Bildirişi databazada yaradırıq
  await prisma.notification.create({
    data: {
      userId,
      type,
      content,
    },
  });

  // 2. Push bildirişi göndəririk
  // Başlıq və məzmunu content-dən ayıra bilərik
  const [title, ...bodyParts] = content.split('!');
  const body = bodyParts.join('!').trim();
  await sendPushNotification(userId, title, body, data);
};
// src/notification/notification.service.js

const getNotificationsForUser = async (userId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;

    // Eyni anda həm bildirişləri, həm də ümumi sayı alırıq
    const [notifications, total] = await prisma.$transaction([
        prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip: skip,

            take: limit,
        }),
        prisma.notification.count({ where: { userId } })
    ]);

    return {
        data: notifications,
        totalPages: Math.ceil(total / limit),
        currentPage: page
    };
};
 const markAsRead = async (userId, notificationId) => {
  // Əvvəlcə bildirişin bu istifadəçiyə aid olduğunu yoxlayırıq
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

  // Bildirişi yeniləyirik
  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
};

module.exports = {
  registerDevice,
  sendPushNotification,
  createAndSendNotification, // Yeni funksiyanı export edirik
  getNotificationsForUser,
  markAsRead
};
