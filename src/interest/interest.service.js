
const prisma = require('../config/prisma');
const redis = require('../config/redis'); // Redis client-i import edirik


const findAllInterests = async () => {
  // 1. Keş üçün sabit və unikal bir açar (key) təyin edirik
  const cacheKey = 'interest_categories_list';
  const TTL = 3600 * 24; // 24 saat (saniyə ilə)

  // 2. Əvvəlcə Redis-i yoxlayırıq
  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      console.log(`[CACHE HIT] ✅ Maraqların siyahısı keşdən tapıldı.`);
      return JSON.parse(cachedData);
    }
  } catch (error) {
    console.error("Redis-dən oxuma xətası:", error);
  }

  // 3. Əgər keşdə yoxdursa, verilənlər bazasından oxuyuruq
  console.log(`[CACHE MISS] ❌ Maraqların siyahısı keşdə tapılmadı. Databazadan axtarılır...`);
  const categories = await prisma.category.findMany({
    include: {
      interests: { select: { id: true, name: true } },
    },
  });

  // 4. Tapdığımız məlumatı gələcək sorğular üçün Redis-ə yazırıq
  try {
    await redis.set(cacheKey, JSON.stringify(categories), 'EX', TTL);
  } catch (error) {
    console.error("Redis-ə yazma xətası:", error);
  }

  return categories;
};


module.exports = {
  findAllInterests,
};