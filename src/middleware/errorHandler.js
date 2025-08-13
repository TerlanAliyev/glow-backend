const logger = require('../config/logger'); // <-- YENİ İMPORT

const errorHandler = (err, req, res, next) => {
    // DƏYİŞİKLİK: console.error əvəzinə, strukturlaşdırılmış log yazırıq
    // Bu, xətanın mesajını, kodunu, aid olduğu istifadəçini və bütün detallarını qeydə alır
    logger.error(err.message, {
        statusCode: err.statusCode || 500,
        code: err.code, // Məsələn, Prisma xəta kodları (P2002, P2025)
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        user: req.user ? req.user.userId : 'anonymous',
    });

    // Prisma-dan gələn xüsusi xətaları tanıyaq (bu hissə dəyişməz qalır)
    if (err.code === 'P2002' && err.meta?.target?.includes('email')) {
        return res.status(409).json({ message: 'Bu email artıq istifadə olunur.' });
    }

    // Servislərdən bizim özümüzün atdığı xətaları tanıyaq (bu hissə dəyişməz qalır)
    if (err.statusCode) { // Artıq status koduna görə yoxlayırıq
        return res.status(err.statusCode).json({ message: err.message });
    }

    // Digər bütün gözlənilməz xətalar üçün standart 500 cavabı
    res.status(500).json({ message: 'Serverdə gözlənilməz bir xəta baş verdi.' });
};

module.exports = errorHandler;