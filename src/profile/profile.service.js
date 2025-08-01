
const prisma = require('../config/prisma');

const updateUserProfile = async (userId, profileData) => {
  const { bio, interestIds, avatarUrl } = profileData;

  const dataToUpdate = {bio, university, city, personality};
  
  // Yalnız göndərilən məlumatları yeniləyirik.
  if (bio !== undefined) dataToUpdate.bio = bio;
  if (avatarUrl !== undefined) dataToUpdate.avatarUrl = avatarUrl;
  
 if (interestIds && Array.isArray(interestIds)) {
    // 1. Göndərilən ID-lərin databazada mövcud olub-olmadığını yoxlayırıq
    const existingInterestsCount = await prisma.interest.count({
        where: {
            id: { in: interestIds }
        }
    });

    // 2. Əgər tapılanların sayı göndərilənlərin sayına bərabər deyilsə, xəta atırıq
    if (existingInterestsCount !== interestIds.length) {
        const error = new Error('Bir və ya bir neçə maraq ID-si etibarsızdır.');
        error.statusCode = 400; // 400 Bad Request
        throw error;
    }

    // 3. Əgər hər şey düzgündürsə, əlaqəni qururuq
    dataToUpdate.interests = {
      set: interestIds.map((interestId) => ({ id: interestId })),
    };
  }

  // Yenilənmiş profili qaytarırıq
  const updatedProfile = await prisma.profile.update({
    where: { userId: userId },
    data: dataToUpdate,
    include: { interests: true, photos: true },
  });

  return updatedProfile;
};

const addPhotosToProfile = async (userId, files) => {
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new Error('Profil tapılmadı.');

    const photoData = files.map(file => ({
        url: file.path, // Cloudinary-dən gələn URL
        profileId: profile.id,
    }));

    await prisma.photo.createMany({ data: photoData });

    // Əsas avatarı təyin etmək (əgər hələ yoxdursa)
    const existingAvatar = await prisma.photo.findFirst({ where: { profileId: profile.id, isAvatar: true } });
    if (!existingAvatar) {
        const firstPhoto = await prisma.photo.findFirst({ where: { profileId: profile.id } });
        if (firstPhoto) {
            await prisma.photo.update({ where: { id: firstPhoto.id }, data: { isAvatar: true } });
        }
    }

    return prisma.profile.findUnique({ where: { userId }, include: { photos: true } });
};


module.exports = {
  updateUserProfile,
  addPhotosToProfile
};