const prisma = require('../../config/prisma');
const redis = require('../../config/redis'); 


const getVenues = async (queryParams) => {
    // Controller-dən gələn queryParams-ı qəbul edirik
    const { page = 1, limit = 10 } = queryParams;

    const cacheKey = `admin:venues:page:${page}:limit:${limit}`;
    try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log(`[CACHE HIT] ✅ Admin məkanlar siyahısı keşdən tapıldı.`);
            return JSON.parse(cachedData);
        }
    } catch (error) { console.error("Redis-dən oxuma xətası:", error); }

    console.log(`[CACHE MISS] ❌ Admin məkanlar siyahısı keşdə tapılmadı.`);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [venues, total] = await prisma.$transaction([
        prisma.venue.findMany({ orderBy: { name: 'asc' }, skip, take: parseInt(limit) }),
        prisma.venue.count()
    ]);

    const result = { data: venues, totalPages: Math.ceil(total / parseInt(limit)), currentPage: parseInt(page) };

    try {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600); // 1 saatlıq keş
    } catch (error) { console.error("Redis-ə yazma xətası:", error); }

    return result;
};

const createVenue = async (data) => {
    // Artıq 'category' sahəsini də qəbul edirik
    const { name, address, latitude, longitude, description, category } = data;
    return prisma.venue.create({
        data: { name, address, latitude, longitude, description, category }
    });
};

const updateVenue = async (id, data) => {
    // Frontend-dən gələ biləcək bütün mümkün sahələri qeyd edirik
    const { name, address, latitude, longitude, description, category } = data;

    // Yalnız göndərilən sahələrdən ibarət yeni bir obyekt yaradırıq
    const dataToUpdate = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (address !== undefined) dataToUpdate.address = address;
    if (latitude !== undefined) dataToUpdate.latitude = parseFloat(latitude);
    if (longitude !== undefined) dataToUpdate.longitude = parseFloat(longitude);
    if (description !== undefined) dataToUpdate.description = description;
    if (category !== undefined) dataToUpdate.category = category;

    return prisma.venue.update({
        where: { id: id },
        data: dataToUpdate
    });
};

const deleteVenue = async (id) => prisma.venue.delete({ where: { id } });

const getVenueActivity = async (venueId) => {
    const twentyFourHoursAgo = new Date(new Date() - 24 * 60 * 60 * 1000);

    const checkInCount = await prisma.activeSession.count({
        where: {
            venueId: venueId,
            createdAt: {
                gte: twentyFourHoursAgo,
            }
        }
    });

    return { venueId, checkInsLast24Hours: checkInCount };
};

const updateVenueStatus = async (id, isActive) => {
    return prisma.venue.update({
        where: { id },
        data: { isActive },
    });
};

const updateVenueFeatureStatus = async (id, isFeatured) => {
    return prisma.venue.update({
        where: { id },
        data: { isFeatured },
    });
};

const getCategories = async () => prisma.category.findMany({ include: { interests: true }, orderBy: { name: 'asc' } });

const createCategory = async (name) => {
    const newCategory = await prisma.category.create({ data: { name } });
    await invalidateInterestsCache(); // Keşi təmizləyirik
    return newCategory;
};

const updateCategory = async (id, name) => {
    await invalidateInterestsCache();
    return prisma.category.update({
        where: { id },
        data: { name },
    });
};

const deleteCategory = async (id) => {
    await invalidateInterestsCache();
    return prisma.$transaction(async (tx) => {
        // 1. Bu kateqoriyaya aid bütün maraqları sil
        await tx.interest.deleteMany({
            where: { categoryId: id },
        });

        // 2. Maraqlar silindikdən sonra kateqoriyanın özünü sil
        await tx.category.delete({
            where: { id },
        });
    });
};

const createInterest = async (name) => {
    const newInterest = await prisma.interest.create({ data: { name } });
    await invalidateInterestsCache(); // Keşi təmizləyirik
    return newInterest;
}

const deleteInterest = async (id) => {
    const deleted = await prisma.interest.delete({ where: { id } });
    await invalidateInterestsCache(); // Keşi təmizləyirik
    return deleted;
};

const invalidateInterestsCache = async () => {
    try {
        await redis.del('interest_categories_list');
        console.log('[CACHE INVALIDATION] 🗑️ Maraqların keş siyahısı təmizləndi.');
    } catch (error) {
        console.error("Redis-dən maraqlar keşini silmə xətası:", error);
    }
};

module.exports = {
    getVenues, createVenue, updateVenue, deleteVenue,
    getVenueActivity, updateVenueStatus, updateVenueFeatureStatus,
    getCategories, createCategory, updateCategory, deleteCategory,
    createInterest, deleteInterest,invalidateInterestsCache
};