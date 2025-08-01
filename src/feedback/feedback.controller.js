
const feedbackService = require('./feedback.service');

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const submitFeedback = asyncHandler(async (req, res) => {
    const authorId = req.user.userId;
    const { description } = req.body;
    
    // Fayl yüklənibsə, onun URL-ini götürürük
    const screenshotUrl = req.file ? req.file.path : null;

    if (!description) {
        return res.status(400).json({ message: 'Açıqlama (description) sahəsi məcburidir.' });
    }

    await feedbackService.createFeedback({
        authorId,
        description,
        screenshotUrl,
    });

    res.status(201).json({ message: 'Rəyiniz uğurla göndərildi. Təşəkkür edirik!' });
});

module.exports = {
    submitFeedback,
};