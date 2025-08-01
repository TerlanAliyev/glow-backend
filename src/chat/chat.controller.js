
const chatService = require('./chat.service');
const { validationResult } = require('express-validator');
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
const getChatHistory = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const connectionId = parseInt(req.params.connectionId);

        const messages = await chatService.getMessagesForConnection(userId, connectionId);
        res.status(200).json(messages);
    } catch (error) {
        next(error);
    }
};
const reportMessage = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const reporterId = req.user.userId;
    const messageId = parseInt(req.params.id);
    const { reason } = req.body;

    await chatService.reportMessage(reporterId, messageId, reason);
    res.status(200).json({ message: 'Mesaj uğurla şikayət olundu.' });
});
module.exports = {
    getChatHistory,
    reportMessage
};