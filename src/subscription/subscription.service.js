const prisma = require('../config/prisma');
const redis = require('../config/redis');

/**
 * Aktiv bir abunəliyi olan istifadəçinin statusunu yoxlayır.
 * @param {string} userId - İstifadəçinin ID-si
 * @returns {Promise<boolean>} - İstifadəçinin premium girişi olub-olmadığı
 */
const hasActiveSubscription = async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;

    // 1. Ömürlük premium statusu varmı?
    if (user.subscription === 'PREMIUM') {
        return true;
    }

    // 2. Aktiv və müddəti bitməmiş aylıq/illik abunəliyi varmı?
    const hasActivePlan = user.subscription === 'PREMIUM_MONTHLY' || user.subscription === 'PREMIUM_YEARLY';
    const isSubscriptionValid = user.subscriptionExpiresAt && user.subscriptionExpiresAt > new Date();
    if (hasActivePlan && isSubscriptionValid) {
        return true;
    }
    
    // 3. Köhnə sistemdən qalma və müddəti bitməmiş gündəlik premiumu varmı?
    const hasDailyPremium = user.premiumExpiresAt && user.premiumExpiresAt > new Date();
    if (hasDailyPremium) {
        return true;
    }

    return false;
};

/**
 * İstifadəçi üçün yeni bir müddətli abunəlik planını aktivləşdirir.
 * @param {string} userId - İstifadəçinin ID-si
 * @param {'PREMIUM_MONTHLY' | 'PREMIUM_YEARLY'} plan - Abunəlik planının növü
 * @param {string} receipt - Apple/Google-dan gələn qəbz
 */
const activateSubscription = async (userId, plan, receipt) => {
    // Real dünyada burada qəbzi (receipt) Apple/Google ilə yoxlamaq lazımdır.
    console.log(`Abunəlik aktivləşdirilir: User ${userId}, Plan: ${plan}, Qəbz: ${receipt}`);

    let expiresAt = new Date();
    if (plan === 'PREMIUM_MONTHLY') {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else if (plan === 'PREMIUM_YEARLY') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
        const error = new Error('Yanlış abunəlik planı növü.');
        error.statusCode = 400;
        throw error;
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            subscription: plan,
            subscriptionExpiresAt: expiresAt,
        },
    });

    // İstifadəçi profilinin keşini təmizləyirik
    const cacheKey = `user_profile:${userId}`;
    await redis.del(cacheKey).catch(err => console.error("Redis-dən silmə xətası:", err));

    return { message: `${plan} abunəliyi uğurla aktivləşdirildi.` };
};

module.exports = {
    hasActiveSubscription,
    activateSubscription,
};