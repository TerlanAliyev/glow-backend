const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client();
const { sendPasswordResetEmail } = require('../config/mailer'); // Yeni import

const registerNewUser = async (userData) => {
  const { email, password, name, age, gender } = userData;
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      profile: {
        create: {
          name,
          age,
          gender,
        },
      },
    },
    include: {
      profile: true,
    },
  });
  const token = jwt.sign(
    { userId: newUser.id },
    process.env.JWT_SECRET || 'super_gizli_bir_acar_stringi',
    { expiresIn: '7d' }
  );
  return { user: newUser, token };
};

const loginUser = async (loginData) => {
  const { email, password } = loginData;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true,role:true },
  });

  if (!user) {
    throw new Error('Email və ya şifrə yanlışdır.');
  }
if (!user.isActive) {
    const error = new Error('Bu hesab admin tərəfindən deaktiv edilib.');
    error.statusCode = 403; // 403 Forbidden
    throw error;
  }
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Email və ya şifrə yanlışdır.');
  }

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET || 'super_gizli_bir_acar_stringi',
    { expiresIn: '7d' }
  );

  delete user.password;
  
  return { user, token };
};
const getUserProfileById = async (userId) => {
  // Verilən ID-yə görə istifadəçini tapırıq (profili ilə birlikdə)
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      profile: true,
    },
  });

  // Əgər istifadəçi tapılmazsa, xəta atırıq.
  if (!user) {
    // Bu xəta Controller tərəfindən tutulacaq və 404 olaraq göndəriləcək.
    throw new Error('Bu ID ilə istifadəçi tapılmadı.');
  }

  // Təhlükəsizlik üçün şifrə heşini nəticədən silirik.
  delete user.password;

  return user;
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
    const { email, name, sub: googleId, picture: avatarUrl } = payload;

    let user = await prisma.user.findUnique({
        where: { googleId },
        include: { profile: true },
    });

    if (user) {
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'super_gizli_bir_acar_stringi', { expiresIn: '7d' });
        delete user.password;
        return { user, token, message: 'Sistemə uğurla daxil oldunuz!' };
    }

    let existingUserByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingUserByEmail) {
        user = await prisma.user.update({
            where: { email },
            data: { googleId },
            include: { profile: true },
        });
    } else {
        user = await prisma.user.create({
            data: {
                email,
                googleId,
                authProvider: 'GOOGLE',
                profile: {
                    create: {
                        name: name,
                        age: 18,
                        gender: 'OTHER',
                        avatarUrl: avatarUrl,
                    },
                },
            },
            include: { profile: true },
        });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'super_gizli_bir_acar_stringi', { expiresIn: '7d' });
    delete user.password;
    return { user, token, message: 'Hesabınız uğurla yaradıldı!' };
};
const logoutUser = async (userId) => {
    await prisma.activeSession.deleteMany({
        where: {
            userId: userId,
        },
    });
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
};


module.exports = {
  registerNewUser,
  loginUser,
  getUserProfileById,
  loginWithGoogle,
  logoutUser,requestPasswordReset,
    verifyPasswordResetOTP,
    resetPassword,
};