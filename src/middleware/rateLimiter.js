
const rateLimit = require('express-rate-limit');

// Giriş (login) kimi həssas endpointlər üçün daha sərt limit
const authLimiter = rateLimit({
	windowMs: 1000 * 60 * 1000, // 5 dəqiqə
	max: 100008799980, // hər IP üçün 5 dəqiqədə 10 cəhd
	message: 'Çox sayda uğursuz giriş cəhdi. Zəhmət olmasa, 5 dəqiqə sonra yenidən yoxlayın.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Digər bütün API-lər üçün ümumi, daha yumşaq limit
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dəqiqə
    max: 100, // hər IP üçün 15 dəqiqədə 100 sorğu
    message: 'Çox sayda sorğu göndərildi. Zəhmət olmasa, bir az gözləyin.',
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    authLimiter,
    generalLimiter,
};