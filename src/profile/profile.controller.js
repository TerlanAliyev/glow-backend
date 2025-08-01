
const { validationResult } = require('express-validator');
const profileService = require('./profile.service');

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const updateMyProfile = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    // === DÜZƏLİŞ BURADADIR: Daha detallı xəta idarəetməsi ===
    try {
        const userId = req.user.userId;
        const profileData = req.body;
        const updatedProfile = await profileService.updateUserProfile(userId, profileData);
        res.status(200).json({
            message: 'Profil uğurla yeniləndi!',
            profile: updatedProfile,
        });
    } catch (error) {
        // Servisdən gələn xüsusi xəta kodunu tuturuq
        if (error.statusCode === 400) {
            return res.status(400).json({ message: error.message });
        }
        // Digər xətaları mərkəzi idarəediciyə ötürürük
        next(error);
    }
});

const uploadAvatar = asyncHandler(async (req, res) => {
    // `authenticateToken` middleware-i `req.user`-i təyin etməlidir.
    const userId = req.user.userId;

    if (!req.file) {
        return res.status(400).json({ message: 'Heç bir fayl yüklənmədi.' });
    }

    // Cloudinary-dən gələn URL
    const avatarUrl = req.file.path;

    // Servisə URL-i göndərib databazanı yeniləyirik
    const updatedProfile = await profileService.updateUserProfile(userId, { avatarUrl });

    res.status(200).json({
        message: 'Profil şəkli uğurla yeniləndi!',
        profile: updatedProfile,
    });
});

const uploadPhotos = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Heç bir fayl yüklənmədi.' });
    }
    const files = req.files;
    const updatedProfile = await profileService.addPhotosToProfile(userId, files);
    res.status(200).json({ message: `${files.length} şəkil uğurla yükləndi!`, profile: updatedProfile });
});
module.exports = {
    updateMyProfile,
    uploadAvatar,
    uploadPhotos
};