const prisma = require('../../config/prisma');

const getAllTemplates = (queryParams) => {
    // Gələcəkdə səhifələmə əlavə etmək olar
    return prisma.challengeTemplate.findMany({
        orderBy: { createdAt: 'desc' }
    });
};

const createTemplate = (data) => {
    const { name, description, iconUrl, isActive } = data;
    return prisma.challengeTemplate.create({
        data: { name, description, iconUrl, isActive }
    });
};

const updateTemplate = (templateId, data) => {
    return prisma.challengeTemplate.update({
        where: { id: Number(templateId) },
        data: data
    });
};

const deleteTemplate = (templateId) => {
    return prisma.challengeTemplate.delete({
        where: { id: Number(templateId) }
    });
};

module.exports = {
    getAllTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
};