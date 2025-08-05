const prisma = require('../config/prisma');
const redis = require('../config/redis'); // Faylın yuxarısına əlavə edin

const grantExtraSignals = async (userId, amount) => {
    // İstifadəçinin profilinə verilən miqdarda kredit əlavə edirik
    return prisma.profile.update({
        where: { userId },
        data: {
            extraSignalCredits: {
                increment: amount
            }
        }
    });
    // YENİ ADDIM: Keşi təmizləyirik
    const cacheKey = `user_profile:${userId}`;
    await redis.del(cacheKey).catch(err => console.error(err));
    
    return updatedProfile;v
};

module.exports = { grantExtraSignals };