
const chatService = require('./chat.service');
const { validationResult } = require('express-validator');
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
const getChatHistory = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const connectionId = parseInt(req.params.connectionId);
    const { page = 1, limit = 30 } = req.query; // Query-dən parametrləri alırıq
    const messages = await chatService.getMessagesForConnection(userId, connectionId, { page: parseInt(page), limit: parseInt(limit) });
    res.status(200).json(messages);
});
const reportMessage = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const reporterId = req.user.userId;
    const messageId = parseInt(req.params.id);
    const { reason } = req.body;

    await chatService.reportMessage(reporterId, messageId, reason);
    res.status(200).json({ message: 'Mesaj uğurla şikayət olundu.' });
});
const reportGroupMessage = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const reporterId = req.user.userId;
    const { id } = req.params;
    const { reason } = req.body;

    await chatService.reportGroupMessage(reporterId, id, reason);
    res.status(200).json({ message: 'Qrup mesajı uğurla şikayət olundu.' });
});
const getIcebreakers = asyncHandler(async (req, res) => {
    const questions = await chatService.getRandomIcebreakers(3);
    res.status(200).json(questions);
});
const getVenueChatHistory = asyncHandler(async (req, res) => {
    const { venueId } = req.params;
    const messages = await chatService.getGroupMessagesForVenue(venueId);
    res.status(200).json(messages);
});
const deleteMessage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    await chatService.deleteOwnMessage(userId, id);
    res.status(200).json({ message: 'Mesaj uğurla silindi.' });
});
const uploadChatImage = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Heç bir fayl yüklənmədi.' });
    }
    // Cloudinary-dən qayıdan təhlükəsiz URL-i cavab olaraq göndəririk
    res.status(200).json({ url: req.file.path });
});
const uploadGroupChatImage = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Heç bir fayl yüklənmədi.' });
    }
    res.status(200).json({ url: req.file.path });
});
const uploadAudioMessage = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Heç bir səs faylı yüklənmədi.' });
    }
    // Cloudinary-dən qayıdan təhlükəsiz URL-i cavab olaraq göndəririk
    res.status(200).json({ url: req.file.path });
});
module.exports = {
    getChatHistory,
    reportMessage,
    getIcebreakers,
    getVenueChatHistory,deleteMessage,uploadChatImage,uploadGroupChatImage,uploadAudioMessage,reportGroupMessage
};