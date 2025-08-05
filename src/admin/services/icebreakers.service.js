const prisma = require('../../config/prisma');


const getIcebreakers = async () => prisma.icebreakerQuestion.findMany({ orderBy: { createdAt: 'desc' } });
const createIcebreaker = async (text, category) => prisma.icebreakerQuestion.create({ data: { text, category } });
const updateIcebreaker = async (id, data) => {
    const { text, category } = data; // Artıq 'category' də qəbul edir
    return prisma.icebreakerQuestion.update({ where: { id: Number(id) }, data: { text, category } });
};
const deleteIcebreaker = async (id) => prisma.icebreakerQuestion.delete({ where: { id: Number(id) } });

module.exports = {
    getIcebreakers, 
    createIcebreaker,
    updateIcebreaker,
    deleteIcebreaker
};