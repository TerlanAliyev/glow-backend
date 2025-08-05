
const { validationResult } = require('express-validator'); // === DÜZƏLİŞ BURADADIR ===
const notificationService = require('./notification.service');
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
const registerDeviceController = async (req, res, next) => {
    const errors = validationResult(req); // İndi bu funksiya təyin edilib
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const userId = req.user.userId;
        const { token } = req.body;
        await notificationService.registerDevice(userId, token);
        res.status(200).json({ message: 'Cihaz uğurla qeydiyyatdan keçdi.' });
    } catch (error) {
        next(error);
    }
};
const getMyNotificationsController = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    // URL-dən gələn səhifə və limit dəyərlərini alırıq (məs: /api/notification?page=2&limit=10)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const notifications = await notificationService.getNotificationsForUser(userId, page, limit);
    res.status(200).json(notifications);
});
const markNotificationAsReadController = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const notificationId = parseInt(req.params.id);

    if (isNaN(notificationId)) {
        return res.status(400).json({ message: 'Bildiriş ID-si düzgün deyil.' });
    }

    const notification = await notificationService.markAsRead(userId, notificationId);
    res.status(200).json(notification);
});

module.exports = {
    registerDeviceController,
    getMyNotificationsController,
    markNotificationAsReadController
};
