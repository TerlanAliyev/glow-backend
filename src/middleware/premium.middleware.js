// src/middleware/premium.middleware.js

const prisma = require('../config/prisma');

const isPremium = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
        });

        if (!user) {
            return res.status(401).json({ message: 'İstifadəçi tapılmadı.' });
        }

        // YENİ VƏ TƏKMİL YOXLAMA MƏNTİQİ
        const hasPremiumAccess = 
            user.subscription === 'PREMIUM' || // Daimi abunəliyi var, VƏ YA
            (user.premiumExpiresAt && user.premiumExpiresAt > new Date()); // Hələ bitməmiş müvəqqəti premiumu var

        if (hasPremiumAccess) {
            next(); // İstifadəçinin girişi varsa, davam et
        } else {
            res.status(403).json({ message: 'Forbidden: Bu funksiya üçün premium abunəlik tələb olunur.' });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = { isPremium };