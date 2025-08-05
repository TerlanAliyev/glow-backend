
const prisma = require('../config/prisma');
const cloudinary = require('cloudinary').v2;

const updateUserProfile = async (userId, profileData) => {
    const { bio, interestIds, university, city, personality, hideViewFootprints } = profileData;

    const dataToUpdate = {};

    if (bio !== undefined) dataToUpdate.bio = bio;
    if (university !== undefined) dataToUpdate.university = university;
    if (city !== undefined) dataToUpdate.city = city;
    if (hideViewFootprints !== undefined) {
        dataToUpdate.hideViewFootprints = hideViewFootprints; // Yeni seçim
    }
    // DÜZƏLİŞ BURADADIR:
    // Gələn "personality" dəyərini Enum tipinə uyğunlaşdırmaq üçün böyük hərflərə çeviririk.
    if (personality !== undefined) {
        dataToUpdate.personality = personality.toUpperCase(); // Məsələn, "Introvert" -> "INTROVERT"
    }

    if (interestIds && Array.isArray(interestIds)) {
        const existingInterestsCount = await prisma.interest.count({
            where: { id: { in: interestIds } }
        });

        if (existingInterestsCount !== interestIds.length) {
            const error = new Error('Bir və ya bir neçə maraq ID-si etibarsızdır.');
            error.statusCode = 400;
            throw error;
        }

        dataToUpdate.interests = {
            set: interestIds.map((interestId) => ({ id: interestId })),
        };
    }

    const updatedProfile = await prisma.profile.update({
        where: { userId: userId },
        data: dataToUpdate,
        include: { interests: true, photos: true },
    });

    return updatedProfile;
};

// addPhotosToProfile funksiyası dəyişməz qalır...
const addPhotosToProfile = async (userId, files) => {
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new Error('Profil tapılmadı.');

    const photoData = files.map(file => ({
        url: file.path,
        profileId: profile.id,
    }));

    await prisma.photo.createMany({ data: photoData });

    // DÜZƏLİŞ: BU BLOK GERİ QAYTARILDI VƏ SAXLANMALIDIR
    // Məqsəd: Əgər profilin heç bir əsas şəkli yoxdursa, ilk şəkli əsas təyin etmək.
    const existingPrimaryPhoto = await prisma.photo.findFirst({
        where: { profileId: profile.id, isAvatar: true }
    });

    if (!existingPrimaryPhoto) {
        const firstPhoto = await prisma.photo.findFirst({
            where: { profileId: profile.id },
            orderBy: { createdAt: 'asc' } // Ən birinci yüklənəni tapmaq üçün
        });
        if (firstPhoto) {
            await prisma.photo.update({
                where: { id: firstPhoto.id },
                data: { isAvatar: true }
            });
        }
    }

    return prisma.profile.findUnique({ where: { userId }, include: { photos: true } });
};


const deletePhoto = async (userId, photoId) => {
    const photoIdNum = Number(photoId);

    // 1. Şəkli tap və onun həqiqətən bu istifadəçiyə aid olduğunu yoxla
    const photo = await prisma.photo.findUnique({
        where: { id: photoIdNum },
        include: { profile: true },
    });

    if (!photo || photo.profile.userId !== userId) {
        const error = new Error('Şəkil tapılmadı və ya bu şəkli silməyə icazəniz yoxdur.');
        error.statusCode = 404;
        throw error;
    }

    // 2. Şəkli Cloudinary-dən silirik
    try {
        const publicId = photo.url.split('/').pop().split('.')[0];
        // Əgər qovluq istifadə edirsinizsə, publicId-ni daha dəqiq tapmaq lazımdır.
        // Məsələn: const publicIdWithFolder = photo.url.substring(photo.url.indexOf('lyra_avatars'));
        const publicIdWithFolder = `lyra_avatars/${publicId}`; // Bizim qovluq adımız
        await cloudinary.uploader.destroy(publicIdWithFolder);
    } catch (cloudinaryError) {
        console.error("Cloudinary-dən şəkil silinərkən xəta:", cloudinaryError);
        // Bu xəta prosesi dayandırmamalıdır, databazadan silməyə davam edirik.
    }

    // 3. Şəkli verilənlər bazasından silirik
    await prisma.photo.delete({ where: { id: photoIdNum } });

    // 4. Əgər silinən şəkil əsas şəkil idisə, yeni bir əsas şəkil təyin edirik
    if (photo.isAvatar) {
        const nextPhoto = await prisma.photo.findFirst({
            where: { profileId: photo.profileId },
            orderBy: { createdAt: 'asc' }, // Ən köhnə şəkli seçirik
        });

        if (nextPhoto) {
            await prisma.photo.update({
                where: { id: nextPhoto.id },
                data: { isAvatar: true },
            });
        }
    }

    return { message: 'Şəkil uğurla silindi.' };
};

const setPrimaryPhoto = async (userId, photoId) => {
    const photoIdNum = Number(photoId);

    // ADDIM 1: Əvvəlcə istifadəçinin öz profilini tapaq
    const profile = await prisma.profile.findUnique({
        where: { userId: userId },
    });

    if (!profile) {
        const error = new Error('Bu istifadəçiyə aid profil tapılmadı.');
        error.statusCode = 404;
        throw error;
    }

    // ADDIM 2: İndi şəklin bu profilə aid olub-olmadığını yoxlayaq
    const photo = await prisma.photo.findFirst({
        where: {
            id: photoIdNum,
            profileId: profile.id // Birbaşa profil ID ilə yoxlayırıq
        }
    });

    if (!photo) {
        const error = new Error('Şəkil tapılmadı və ya bu şəkil sizin profilinizə aid deyil.');
        error.statusCode = 404;
        throw error;
    }

    // ADDIM 3: Tranzaksiya ilə əsas şəkli dəyişək (bu hissə eyni qalır)
    return prisma.$transaction(async (tx) => {
        // a) Bu profilə aid bütün şəkillərin "isAvatar" statusunu false et
        await tx.photo.updateMany({
            where: { profileId: profile.id },
            data: { isAvatar: false },
        });

        // b) Yalnız seçilmiş şəklin "isAvatar" statusunu true et
        const updatedPhoto = await tx.photo.update({
            where: { id: photoIdNum },
            data: { isAvatar: true },
        });

        return updatedPhoto;
    });
};

const updateUserPreferences = async (userId, preferences) => {
    const { 
        preferredMinAge, 
        preferredMaxAge,
        notifyOnNewSignal,
        notifyOnNewMatch,
        notifyOnNewMessage 
    } = preferences;

    return prisma.profile.update({
        where: { userId: userId },
        data: {
            preferredMinAge,
            preferredMaxAge,
            notifyOnNewSignal,
            notifyOnNewMatch,
            notifyOnNewMessage,
        }
    });
};






//Premium function to get profile and log view
const getProfileViews = async (userId) => {
    return prisma.profileView.findMany({
        where: { viewedId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
            viewer: { // Baxan şəxsin məlumatlarını da gətiririk
                include: {
                    profile: {
                        include: { photos: true }
                    }
                }
            }
        }
    });
};


module.exports = {
    updateUserProfile,
    addPhotosToProfile,
    getProfileViews, deletePhoto, setPrimaryPhoto,updateUserPreferences
};