
const { validationResult } = require('express-validator');
const authService = require('./auth.service');

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};



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


const loginUser = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    // Servisdən gələn cavabı düzgün şəkildə alırıq
    const { user, accessToken, refreshToken } = await authService.loginUser(req.body);
    
    // Və cavabda da bu yeni adlarla qaytarırıq
    res.status(200).json({ 
        message: 'Sistemə uğurla daxil oldunuz!', 
        user, 
        accessToken, 
        refreshToken 
    });
});
const refreshToken = async (req, res, next) => {
  const { refreshToken } = req.body;
  try {
    const tokens = await authService.refreshAccessToken(refreshToken);
    // burda console var amma res.json(tokens) yoxdur
    res.json(tokens);
  } catch (err) {
    next(err);
  }
};

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
const initiateEmailChange = asyncHandler(async (req, res) => {
    const { newEmail } = req.body;
    await authService.initiateEmailChange(req.user.userId, newEmail);
    res.status(200).json({ message: 'Təsdiq kodu yeni e-poçt ünvanınıza göndərildi.' });
});

const confirmEmailChange = asyncHandler(async (req, res) => {
    const { otp } = req.body;
    await authService.confirmEmailChange(req.user.userId, otp);
    res.status(200).json({ message: 'E-poçt ünvanınız uğurla yeniləndi.' });
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
    initiateEmailChange,
    confirmEmailChange,refreshToken
};