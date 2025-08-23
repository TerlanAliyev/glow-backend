const prisma = require('../../config/prisma');

const createAuditLog = async (actorId, action, details = {}) => {
    return prisma.auditLog.create({
        data: { actorId, action, details }
    });
};

const getAdminLogs = async (queryParams) => {
    let page = parseInt(queryParams.page, 10);
    let limit = parseInt(queryParams.limit, 10);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 20;

    const skip = (page - 1) * limit;

    const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limit,
        include: {
            actor: {
                include: {
                    profile: { select: { name: true } }
                }
            }
        }
    });

    const enrichedLogs = await Promise.all(
        logs.map(async (log) => {
            // ...
            return {
                ...log,
                details: {
                    ...log.details,
                    targetName: 'N/A' 
                }
            };
        })
    );

    const totalLogs = await prisma.auditLog.count();

    return {
        data: enrichedLogs,
        totalPages: Math.ceil(totalLogs / limit),
        currentPage: page
    };
};

module.exports = {
    createAuditLog,
    getAdminLogs
};