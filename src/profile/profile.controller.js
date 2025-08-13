
const { validationResult } = require('express-validator');
const profileService = require('./profile.service');
const gamificationService = require('../gamification/gamification.service');

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
const deletePhoto = asyncHandler(async (req, res) => {
    const { photoId } = req.params;
    const userId = req.user.userId;
    await profileService.deletePhoto(userId, photoId);
    res.status(200).json({ message: 'Şəkil uğurla silindi.' });
});
const setPrimaryPhoto = asyncHandler(async (req, res) => {
    const { photoId } = req.params;
    const userId = req.user.userId;
    await profileService.setPrimaryPhoto(userId, photoId);
    res.status(200).json({ message: 'Əsas profil şəkli uğurla dəyişdirildi.' });
});
const updateMyPreferences = asyncHandler(async (req, res) => {
    const updatedProfile = await profileService.updateUserPreferences(req.user.userId, req.body);
    res.status(200).json({ message: 'Seçimləriniz uğurla yadda saxlanıldı.', profile: updatedProfile });
});
//Premium function to get profile views
const getMyProfileViews = asyncHandler(async (req, res) => {
    const views = await profileService.getProfileViews(req.user.userId);
    res.status(200).json(views);
});
// Function to request profile verification
const requestVerification = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Verifikasiya üçün şəkil yüklənmədi.' });
    }

    const userId = req.user.userId;
    const photoUrl = req.file.path; // Cloudinary-dən gələn URL

    await profileService.requestProfileVerification(userId, photoUrl);

    res.status(200).json({ message: 'Verifikasiya sorğunuz uğurla göndərildi. Administrator tərəfindən yoxlanıldıqdan sonra sizə bildiriş göndəriləcək.' });
});

const updateMyStatus = asyncHandler(async (req, res) => {
    const { status } = req.body; // 'durationInHours' parametrini sildik
    const userId = req.user.userId;

    // Servisə artıq yalnız statusu göndəririk
    const updatedProfile = await profileService.updateProfileStatus(userId, status);

    res.status(200).json({
        message: "Statusunuz uğurla yeniləndi!",
        profile: updatedProfile
    });
});

const getMyProfileCompletion = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const completionData = await gamificationService.getProfileCompletion(userId);
    res.status(200).json(completionData);
});
module.exports = {
    updateMyProfile,
    uploadAvatar,
    uploadPhotos,
    getMyProfileViews,deletePhoto,setPrimaryPhoto,updateMyPreferences,
    requestVerification,updateMyStatus,getMyProfileCompletion
};