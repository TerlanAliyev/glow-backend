
const prisma = require('../config/prisma');

const findAllInterests = async () => {
  // Bütün kateqoriyaları, içindəki maraqlarla birlikdə gətiririk.
  const categories = await prisma.category.findMany({
    include: {
      interests: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  return categories;
};

// Bu funksiya sadəcə test məqsədlidir. Real layihədə bu məlumatlar
// admin panelindən daxil edilməlidir.
const seedDatabaseWithInterests = async () => {
    // Əvvəlcə mövcud datanı təmizləyirik ki, təkrar yaranmasın
    await prisma.interest.deleteMany({});
    await prisma.category.deleteMany({});
    
    // Yeni kateqoriyalar yaradırıq
    const artCategory = await prisma.category.create({ data: { name: 'İncəsənət və Mədəniyyət' } });
    const lifestyleCategory = await prisma.category.create({ data: { name: 'Həyat Tərzi və Hobbi' } });

    // Həmin kateqoriyalara aid maraqlar yaradırıq
    await prisma.interest.createMany({
        data: [
            { name: 'Musiqi', categoryId: artCategory.id },
            { name: 'Kino', categoryId: artCategory.id },
            { name: 'Səyahət', categoryId: lifestyleCategory.id },
            { name: 'Texnologiya', categoryId: lifestyleCategory.id },
            { name: 'İdman', categoryId: lifestyleCategory.id },
        ]
    });
};

module.exports = {
  findAllInterests,
  seedDatabaseWithInterests,
};