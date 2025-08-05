
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


module.exports = {
  findAllInterests,
};