
const gamificationService = require('./gamification.service');

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const getUserBadges = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const badges = await gamificationService.getBadgesForUser(userId);
    res.status(200).json(badges);
});

module.exports = {
    getUserBadges
};