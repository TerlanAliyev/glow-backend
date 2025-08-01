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
const sendPushNotification = async (userId, title, body, data = {}, tokensOverride = null) => {
  try {
    let tokens = [];
    
    // Əgər birbaşa token siyahısı verilibsə, onu istifadə edirik (broadcast üçün)
    if (tokensOverride) {
        tokens = tokensOverride;
    } 
    // Əks halda, userId-yə görə cihazları tapırıq (fərdi bildiriş üçün)
    else if (userId) {
        const devices = await prisma.device.findMany({ where: { userId } });
        if (devices.length === 0) {
            console.log(`Bildiriş göndərilmədi: İstifadəçi ${userId} üçün heç bir cihaz tapılmadı.`);
            return;
        }
        tokens = devices.map(device => device.token);
    } else {
        return { message: "Heç bir hədəf (userId və ya tokens) göstərilmədi." };
    }

    if (tokens.length === 0) return { successCount: 0, failureCount: 0 };

    // Firebase-in limiti 500 tokendir. Siyahını hissələrə bölürük.
    const tokenChunks = [];
    for (let i = 0; i < tokens.length; i += 500) {
        tokenChunks.push(tokens.slice(i, i + 500));
    }

    let totalSuccessCount = 0;
    let totalFailureCount = 0;

    for (const chunk of tokenChunks) {
        const message = {
            notification: { title, body },
            data,
            tokens: chunk,
        };
        const response = await admin.messaging().sendMulticast(message);
        totalSuccessCount += response.successCount;
        totalFailureCount += response.failureCount;
    }

    console.log(`Push bildiriş göndərildi: ${totalSuccessCount} uğurlu, ${totalFailureCount} uğursuz.`);
    return { successCount: totalSuccessCount, failureCount: totalFailureCount };

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
const getNotificationsForUser = async (userId) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
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
