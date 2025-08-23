const prisma = require('../config/prisma');

const getAllOptions = async () => {
    const options = await prisma.profileOption.findMany({
        orderBy: { id: 'asc' }
    });

    // Seçimləri tipinə görə qruplaşdırırıq
    const groupedOptions = {
        SEXUAL_ORIENTATION: [],
        RELATIONSHIP_GOAL: [],
    };

    options.forEach(option => {
        if (groupedOptions[option.type]) {
            groupedOptions[option.type].push({ id: option.id, code: option.code, name: option.name });
        }
    });

    return groupedOptions;
};

module.exports = { getAllOptions };