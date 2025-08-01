
const express = require('express');
const { authenticateToken } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const { updateMyProfile, uploadAvatar,uploadPhotos } = require('./profile.controller');
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

router.patch(
  '/me/avatar',
  authenticateToken,
  upload.single('avatar'),
  uploadAvatar
);
router.post('/me/photos', authenticateToken, upload.array('photos', 2), uploadPhotos);

module.exports = router;