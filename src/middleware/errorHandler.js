
const errorHandler = (err, req, res, next) => {
    console.error("XƏTA BAŞ VERDİ:", err); // Xətanı server konsolunda göstəririk

    // Prisma-dan gələn xüsusi xətaları tanıyaq
    // P2002: Unikal bir sahənin təkrar daxil edilməsi (məsələn, eyni email)
    if (err.code === 'P2002' && err.meta?.target?.includes('email')) {
        return res.status(409).json({ message: 'Bu email artıq istifadə olunur.' });
    }

    // Servislərdən bizim özümüzün atdığı xətaları tanıyaq
    // (Məsələn, "Email və ya şifrə yanlışdır")
    if (err.message.includes('yanlışdır') || err.message.includes('tapılmadı')) {
        return res.status(401).json({ message: err.message });
    }

    // Digər bütün gözlənilməz xətalar üçün standart 500 cavabı
    res.status(500).json({ message: 'Serverdə gözlənilməz bir xəta baş verdi.' });
};

module.exports = errorHandler;