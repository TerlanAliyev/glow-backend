// src/purchase/purchase.controller.js

const purchaseService = require('./purchase.service');
// DÜZƏLİŞ: Çatışmayan 'import' sətri buradadır
const subscriptionService = require('../subscription/subscription.service'); 
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const activateDailyPremium = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { receipt } = req.body;
    await purchaseService.activateDailyPremium(userId, receipt);
    res.status(200).json({ message: 'Gündəlik premium uğurla aktivləşdirildi.' });
});

// YENİ FUNKSİYA
const activateSubscription = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { plan, receipt } = req.body;

    if (!['PREMIUM_MONTHLY', 'PREMIUM_YEARLY'].includes(plan)) {
        return res.status(400).json({ message: 'Yanlış abunəlik planı.' });
    }

    const result = await subscriptionService.activateSubscription(userId, plan, receipt);
    res.status(200).json(result);
});

module.exports = { 
    activateDailyPremium,
    activateSubscription,
};