const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client();
const { sendPasswordResetEmail, sendEmailChangeConfirmationEmail } = require('../config/mailer');
const redis = require('../config/redis'); // Faylın yuxarısına əlavə edin

const generateAndStoreTokens = async (userId) => {
    // 1. Access Token yarat (ömrü qısa: 15 dəqiqə)
    const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRATION || '15m',
    });

    // 2. Refresh Token yarat (ömrü uzun: 30 gün)
    const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRATION || '30d',
    });

    // 3. Refresh Token-i verilənlər bazasına yadda saxla
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // İstifadəçinin köhnə refresh tokenlərini silib, yenisini əlavə edirik
    await prisma.refreshToken.deleteMany({ where: { userId: userId } });
    await prisma.refreshToken.create({
        data: { token: refreshToken, expiresAt, userId: userId }
    });

    return { accessToken, refreshToken };
};

const registerNewUser = async (userData) => {
    const { email, password, name, age, gender, sexualOrientationId, relationshipGoalId } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const newUser = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            premiumExpiresAt: threeDaysFromNow,
            profile: {
                create: {
                    name, age, gender, sexualOrientationId: sexualOrientationId ? Number(sexualOrientationId) : undefined,
                    relationshipGoalId: relationshipGoalId ? Number(relationshipGoalId) : undefined,
                }
            },
        },
        include: { profile: true },
    });

    const { accessToken, refreshToken } = await generateAndStoreTokens(newUser.id);

    delete newUser.password;
    return { user: newUser, accessToken, refreshToken };
};


const loginUser = async (loginData) => {
    const { email, password } = loginData;
    const user = await prisma.user.findUnique({
        where: { email },
        include: { profile: true, role: true },
    });

    // İstifadəçi yoxlaması (daha təhlükəsiz versiya)
    const isPasswordValid = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !user.isActive || !isPasswordValid) {
        const error = new Error('Email və ya şifrə yanlışdır.');
        error.statusCode = 401;
        throw error;
    }

    // Access Token yarat (ömrü qısa: 15 dəqiqə)
    const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRATION || '15m',
    });

    // Refresh Token yarat (ömrü uzun: 30 gün)
    const refreshToken = jwt.sign({ userId: user.id }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRATION || '30d',
    });

    // Refresh Token-i verilənlər bazasına yadda saxla
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Köhnə tokenləri silib yenisini əlavə edirik ki, cədvəl böyüməsin
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await prisma.refreshToken.create({
        data: { token: refreshToken, expiresAt, userId: user.id }
    });

    delete user.password;

    // YEKUN CAVAB: Hər üç obyekti düzgün adlarla qaytarırıq
    return { user, accessToken, refreshToken };
};


const loginWithGoogle = async (idToken) => {
    let ticket;
    try {
        ticket = await googleClient.verifyIdToken({
            idToken: idToken,
            audience: [
                process.env.GOOGLE_ANDROID_CLIENT_ID,
                process.env.GOOGLE_IOS_CLIENT_ID,
            ],
        });
    } catch (error) {
        throw new Error('Google tokeni etibarsızdır.');
    }

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    // Mövcud istifadəçini e-poçt ilə axtarırıq
    let user = await prisma.user.findUnique({
        where: { email },
        include: { profile: true }
    });

    let message = 'Sistemə uğurla daxil oldunuz!';

    if (!user) {
        // Əgər istifadəçi yoxdursa, yenisini yaradırıq
        user = await prisma.user.create({
            data: {
                email,
                googleId,
                authProvider: 'GOOGLE',
                profile: {
                    create: { name: name, age: 18, gender: 'OTHER' },
                },
            },
            include: { profile: true },
        });
        message = 'Hesabınız uğurla yaradıldı!';
    } else if (!user.googleId) {
        // Əgər e-poçt var, amma Google ilə bağlanmayıbsa, googleId-ni əlavə edirik
        user = await prisma.user.update({
            where: { email },
            data: { googleId },
            include: { profile: true },
        });
    }

    // DÜZƏLİŞ: Artıq hər iki tokeni yaradıb qaytarırıq
    const { accessToken, refreshToken } = await generateAndStoreTokens(user.id);

    delete user.password;
    return { user, accessToken, refreshToken, message };
};
const refreshAccessToken = async (oldRefreshToken) => {
    const dbToken = await prisma.refreshToken.findUnique({ where: { token: oldRefreshToken } });

    if (!dbToken || dbToken.expiresAt < new Date()) {
        throw new Error('Refresh token etibarlı deyil və ya vaxtı bitib.');
    }

    const payload = jwt.verify(oldRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Yeni access ve refresh tokenleri oluştur
    const { accessToken, refreshToken: newRefreshToken } = await generateAndStoreTokens(payload.userId);

    // Eski refresh token'i veritabanından sil
    await prisma.refreshToken.delete({ where: { token: oldRefreshToken } });

    // Yeni tokenleri döndür
    return { accessToken, refreshToken: newRefreshToken };
};

const getUserProfileById = async (userId) => {
    const cacheKey = `user_profile:${userId}`;

    try {
        const cachedProfile = await redis.get(cacheKey);
        if (cachedProfile) {
            console.log(`[CACHE HIT] ✅ İstifadəçi profili (${userId}) sürətli keşdən (Redis) tapıldı.`);
            return JSON.parse(cachedProfile);
        }
    } catch (error) {
        console.error("Redis-dən oxuma xətası:", error);
    }

    console.log(`[CACHE MISS] ❌ İstifadəçi profili (${userId}) keşdə tapılmadı. Verilənlər bazasına sorğu göndərilir...`);
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            profile: { include: { photos: true, interests: true } },
            role: true,
            badges: { // YENİ BLOK
                include: {
                    badge: true
                }
            }
        },
    });

    if (!user) throw new Error('Bu ID ilə istifadəçi tapılmadı.');
    delete user.password;

    try {
        await redis.set(cacheKey, JSON.stringify(user), 'EX', 3600);
    } catch (error) {
        console.error("Redis-ə yazma xətası:", error);
    }

    return user;
};

const logoutUser = async (userId) => {
    // Həm aktiv sessiyaları, həm də bütün refresh tokenləri silirik
    await prisma.$transaction([
        prisma.activeSession.deleteMany({ where: { userId: userId } }),
        prisma.refreshToken.deleteMany({ where: { userId: userId } })
    ]);
    return { success: true };
};
const requestPasswordReset = async (email) => {
    console.log('🔍 Email üçün OTP sorğusu gəldi:', email);


    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        console.log('⚠️ İstifadəçi tapılmadı:', email);
        return;
    }
    // Təhlükəsizlik: İstifadəçi olmasa belə, uğurlu cavab qaytarırıq ki,
    // kimsə hansı emaillərin qeydiyyatda olduğunu yoxlaya bilməsin.
    if (!user) return;

    // Köhnə tokenləri silirik
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    // Yeni 6 rəqəmli OTP yaradırıq
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(new Date().getTime() + 10 * 60 * 1000); // 10 dəqiqə sonra

    await prisma.passwordResetToken.create({
        data: {
            token,
            expiresAt,
            userId: user.id,
        }
    });

    // Email göndəririk
    await sendPasswordResetEmail(email, token);
};

const verifyPasswordResetOTP = async (email, token) => {
    const resetRequest = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true }
    });

    if (!resetRequest || resetRequest.user.email !== email || resetRequest.expiresAt < new Date()) {
        const error = new Error('Kod yanlışdır və ya vaxtı bitib.');
        error.statusCode = 400;
        throw error;
    }
    return true;
};

const resetPassword = async (email, token, newPassword) => {
    // 1. Əvvəlcə kodu yenidən yoxlayırıq
    const resetRequest = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true }
    });
    if (!resetRequest || resetRequest.user.email !== email || resetRequest.expiresAt < new Date()) {
        const error = new Error('Kod yanlışdır və ya vaxtı bitib.');
        error.statusCode = 400;
        throw error;
    }

    // 2. Yeni şifrəni heşləyirik
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 3. İstifadəçinin şifrəsini yeniləyirik və istifadə olunmuş tokeni silirik
    await prisma.$transaction([
        prisma.user.update({
            where: { id: resetRequest.userId },
            data: { password: hashedPassword }
        }),
        prisma.passwordResetToken.deleteMany({
            where: { userId: resetRequest.userId }
        })
    ]);
    const cacheKey = `user_profile:${resetRequest.userId}`;
    try {
        await redis.del(cacheKey);
    } catch (error) {
        console.error("Redis-dən silmə xətası:", error);
    }
};
const initiateEmailChange = async (userId, newEmail) => {
    // Yeni e-poçtun artıq istifadə olunub-olunmadığını yoxlayaq
    const emailExists = await prisma.user.findUnique({ where: { email: newEmail } });
    if (emailExists) {
        const error = new Error('Bu e-poçt ünvanı artıq başqa bir hesab tərəfindən istifadə olunur.');
        error.statusCode = 409; // Conflict
        throw error;
    }

    await prisma.emailChangeToken.deleteMany({ where: { userId: userId } });
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(new Date().getTime() + 10 * 60 * 1000); // 10 dəqiqə sonra

    await prisma.emailChangeToken.create({
        data: { token, expiresAt, userId, newEmail },
    });

    await sendEmailChangeConfirmationEmail(newEmail, token);
};

const confirmEmailChange = async (userId, otp) => {
    const changeRequest = await prisma.emailChangeToken.findFirst({
        where: { userId, token: otp, expiresAt: { gte: new Date() } },
    });

    if (!changeRequest) {
        const error = new Error('Təsdiq kodu yanlışdır və ya vaxtı bitib.');
        error.statusCode = 400;
        throw error;
    }

    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: { email: changeRequest.newEmail },
        }),
        prisma.emailChangeToken.deleteMany({ where: { userId: userId } }),
    ]);
    const cacheKey = `user_profile:${userId}`;
    try {
        await redis.del(cacheKey);
    } catch (error) {
        console.error("Redis-dən silmə xətası:", error);
    }
};

module.exports = {
    registerNewUser,
    loginUser,
    getUserProfileById,
    loginWithGoogle,
    logoutUser, requestPasswordReset,
    verifyPasswordResetOTP,
    resetPassword,
    initiateEmailChange,
    confirmEmailChange,
    refreshAccessToken
};