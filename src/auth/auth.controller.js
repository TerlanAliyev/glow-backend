
const { validationResult } = require('express-validator');
const authService = require('./auth.service');

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// const registerUser = asyncHandler (req, res) => {
//   // 1. Gələn datanın yoxlanılması (Validation)
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ errors: errors.array() });
//   }

//   try {
//     // 2. Bütün biznes məntiqini Service qatmanına ötürmək
//     const { user, token } = await authService.registerNewUser(req.body);

//     // 3. Uğurlu nəticəni istifadəçiyə geri göndərmək
//     res.status(201).json({
//       message: 'İstifadəçi uğurla qeydiyyatdan keçdi!',
//       user: {
//         id: user.id,
//         email: user.email,
//         profile: user.profile,
//       },
//       token,
//     });
//   } catch (error) {
//     // 4. Xəta baş verərsə, onu idarə etmək
//     // Əgər email artıq mövcuddursa, Service xüsusi bir xəta atacaq
//     if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
//         return res.status(409).json({ message: 'Bu email artıq istifadə olunur.' });
//     }
    
//     // Digər gözlənilməz xətalar üçün
//     console.error("Registration Error:", error);
//     res.status(500).json({ message: 'Serverdə xəta baş verdi.' });
//   }
// };

// YENİ ƏLAVƏ OLUNAN FUNKSİYA: loginUser
const registerUser = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { user, token } = await authService.registerNewUser(req.body);
    res.status(201).json({
        message: 'İstifadəçi uğurla qeydiyyatdan keçdi!',
        user: { id: user.id, email: user.email, profile: user.profile },
        token,
    });
});

// const loginUser = async (req, res) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ errors: errors.array() });
//   }

//   try {
//     const { user, token } = await authService.loginUser(req.body);

//     res.status(200).json({
//       message: 'Sistemə uğurla daxil oldunuz!',
//       user,
//       token,
//     });
//   } catch (error) {
//     // Servisdən gələn xətanı tuturuq
//     res.status(401).json({ message: error.message });
//   }
// };
const loginUser = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { user, token } = await authService.loginUser(req.body);
    res.status(200).json({ message: 'Sistemə uğurla daxil oldunuz!', user, token });
});

const getMyProfile = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userProfile = await authService.getUserProfileById(userId);
    res.status(200).json(userProfile);
});

const googleLogin = asyncHandler(async (req, res) => {
    const { token } = req.body;
    const result = await authService.loginWithGoogle(token);
    res.status(200).json(result);
});
const logoutUser = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    await authService.logoutUser(userId);
    res.status(200).json({ message: 'Hesabdan uğurla çıxış edildi.' });
});
const forgotPassword = asyncHandler(async (req, res) => {
    console.log('📥 Gələn sorğu:', req.body); // ← Əlavə et

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('❌ Validation xətası:', errors.array());
        return res.status(400).json({ errors: errors.array() });
    }

    await authService.requestPasswordReset(req.body.email);
    res.status(200).json({ message: 'Əgər email ünvanı mövcuddursa, şifrə bərpa kodu göndərildi.' });
});


const verifyOtp = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    await authService.verifyPasswordResetOTP(req.body.email, req.body.token);
    res.status(200).json({ message: 'Kod uğurla təsdiqləndi.' });
});

const resetPassword = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email, token, password } = req.body;
    await authService.resetPassword(email, token, password);
    res.status(200).json({ message: 'Şifrəniz uğurla yeniləndi.' });
});


// Yeni funksiyanı export edirik
module.exports = {
  registerUser,
  loginUser,
  getMyProfile,
  googleLogin,
  logoutUser,forgotPassword,
    verifyOtp,
    resetPassword,
};