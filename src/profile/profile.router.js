
const express = require('express');
const { authenticateToken } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const { updateMyProfile,updateMyStatus,requestVerification,updateMyPreferences, uploadAvatar,uploadPhotos , getMyProfileViews,deletePhoto,setPrimaryPhoto} = require('./profile.controller');
const { isPremium } = require('../middleware/premium.middleware');
const upload = require('../upload/upload.service'); // Yeni upload servisini import edirik


const router = express.Router();

router.patch(
  '/me',
  authenticateToken,
  [
    body('bio').optional().isString().withMessage('Bio mətn formatında olmalıdır'),
    body('interestIds').optional().isArray().withMessage('Maraqlar siyahı (array) formatında olmalıdır'),
    body('avatarUrl').optional().isURL().withMessage('Avatar URL-i düzgün formatda deyil'),
  ],
  updateMyProfile
);
router.post('/me/photos', authenticateToken, upload.array('photos', 2), uploadPhotos);
router.delete('/me/photos/:photoId', authenticateToken, deletePhoto);
router.patch('/me/photos/:photoId/main', authenticateToken, setPrimaryPhoto);
router.patch('/me/preferences', authenticateToken, updateMyPreferences);
router.patch('/me/status', authenticateToken, updateMyStatus);
// verification request
router.post(
    '/me/request-verification', 
    authenticateToken, 
    upload.single('verificationPhoto'), // "verificationPhoto" adlı tək fayl qəbul edir
    requestVerification
);

//Premium function
router.get('/me/views', authenticateToken, isPremium, getMyProfileViews);
module.exports = router;