
const prisma = require('../config/prisma');

const createFeedback = async (feedbackData) => {
    const { authorId, description, screenshotUrl } = feedbackData;

    return prisma.feedback.create({
        data: {
            authorId,
            description,
            screenshotUrl,
        },
    });
};

module.exports = {
    createFeedback,
};