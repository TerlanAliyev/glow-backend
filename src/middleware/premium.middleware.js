// src/middleware/premium.middleware.js

const { hasActiveSubscription } = require('../subscription/subscription.service'); // Yeni servisimizdən köməkçi funksiyanı import edirik

const isPremium = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        if (!userId) {
            return res.status(401).json({ message: 'İstifadəçi tapılmadı.' });
        }

        // Bütün premium yoxlama məntiqi artıq mərkəzi servisdədir
        const hasAccess = await hasActiveSubscription(userId);

        if (hasAccess) {
            next(); // Girişə icazə ver
        } else {
            res.status(403).json({ message: 'Forbidden: Bu funksiya üçün premium abunəlik tələb olunur.' });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = { isPremium };