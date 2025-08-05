const purchaseService = require('./purchase.service');
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const activateDailyPremium = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { receipt } = req.body;
    await purchaseService.activateDailyPremium(userId, receipt);
    res.status(200).json({ message: 'Gündəlik premium uğurla aktivləşdirildi.' });
});

module.exports = { activateDailyPremium };