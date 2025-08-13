const prisma = require('../../config/prisma');

const getAllTemplates = (queryParams) => {
    // Gələcəkdə səhifələmə əlavə etmək olar
    return prisma.challengeTemplate.findMany({
        orderBy: { createdAt: 'desc' }
    });
};

const createTemplate = (data) => {
    console.log('=== SERVICE CREATE TEMPLATE DEBUG ===');
    console.log('Received data:', data);
    
    const templateData = {
        name: data.name,
        description: data.description,
        isActive: Boolean(data.isActive === 'true' || data.isActive === true)
    };
    
    if (data.iconUrl) {
        templateData.iconUrl = data.iconUrl;
    }
    
    console.log('Final template data for Prisma:', templateData);
    
    return prisma.challengeTemplate.create({
        data: templateData
    });
};

const updateTemplate = (templateId, data) => {
    console.log('=== SERVICE UPDATE TEMPLATE DEBUG ===');
    console.log('Template ID:', templateId);
    console.log('Update data:', data);
    
    const templateData = {};
    
    if (data.name) templateData.name = data.name;
    if (data.description) templateData.description = data.description;
    
    // DÜZELİŞ: hasOwnProperty yerine 'in' operator veya Object.prototype.hasOwnProperty kullan
    if ('isActive' in data || Object.prototype.hasOwnProperty.call(data, 'isActive')) {
        templateData.isActive = Boolean(data.isActive === 'true' || data.isActive === true);
    }
    
    if (data.iconUrl) templateData.iconUrl = data.iconUrl;
    
    console.log('Final update data for Prisma:', templateData);
    
    return prisma.challengeTemplate.update({
        where: { id: Number(templateId) },
        data: templateData
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