
const express = require('express');
const { registerUser, loginUser, getMyProfile,googleLogin,logoutUser,forgotPassword,
    verifyOtp,
    resetPassword } = require('./auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const { authLimiter } = require('../middleware/rateLimiter'); // Rate limiter importu

const router = express.Router();



router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Düzgün email daxil edin'),
    body('password').isLength({ min: 6 }).withMessage('Şifrə minimum 6 simvol olmalıdır'),
    body('name').notEmpty().withMessage('Ad boş ola bilməz'),
    body('age').isInt({ min: 18 }).withMessage('Yaş minimum 18 olmalıdır'),
    body('gender').isIn(['MALE', 'FEMALE', 'OTHER']).withMessage('Cinsiyyət düzgün deyil'),
  ],
  registerUser
);
router.post(
  '/login',
  authLimiter, // Rate limiter
  [
    // === DÜZƏLİŞ BURADADIR ===
    // Boş qalan hissəni doldururuq
    body('email').isEmail().withMessage('Düzgün email daxil edin'),
    body('password').notEmpty().withMessage('Şifrə boş ola bilməz'),
  ],
  loginUser
);

router.get('/me', authenticateToken, getMyProfile);
router.post('/google', [ body('token').notEmpty() ], googleLogin);
router.post('/logout', authenticateToken, logoutUser);
router.post('/forgot-password', [ body('email').isEmail() ], forgotPassword);
router.post('/verify-otp', [ body('email').isEmail(), body('token').isLength({ min: 6, max: 6 }) ], verifyOtp);
router.post('/reset-password', [ 
    body('email').isEmail(), 
    body('token').isLength({ min: 6, max: 6 }),
    body('password').isLength({ min: 6 })
], resetPassword);

module.exports = router;

