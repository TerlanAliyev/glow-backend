const rewardsService = require('./rewards.service');
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const grantReward = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { rewardType } = req.body;

    if (rewardType === 'EXTRA_SIGNALS_5') {
        await rewardsService.grantExtraSignals(userId, 5);
        res.status(200).json({ message: '5 əlavə siqnal krediti hesabınıza əlavə edildi.' });
    } else {
        res.status(400).json({ message: 'Bilinməyən mükafat növü.' });
    }
});

module.exports = { grantReward };