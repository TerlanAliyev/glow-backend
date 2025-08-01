
const prisma = require('../config/prisma');

const isAdmin = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            include: { role: true }
        });
        if (user && user.role.name.toUpperCase() === 'ADMIN') {
            next(); // İstifadəçi admindirsə, davam et
        } else {
            res.status(403).json({ message: 'Forbidden: Bu əməliyyat üçün icazəniz yoxdur.' });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = { isAdmin };