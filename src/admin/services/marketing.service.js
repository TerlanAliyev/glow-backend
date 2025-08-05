const prisma = require('../../config/prisma');
const { sendPushNotification } = require('../../notification/notification.service');

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

module.exports = {
    broadcastNotification,
    getBroadcastHistory
};