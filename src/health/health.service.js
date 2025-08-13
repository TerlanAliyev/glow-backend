const prisma = require('../config/prisma');
const redis = require('../config/redis');
const admin = require('firebase-admin'); // Firebase üçün
const cloudinary = require('cloudinary').v2; // Cloudinary üçün
const { transporter } = require('../config/mailer'); // Nodemailer üçün
const os = require('os'); // Sistem məlumatları üçün
const process = require('process'); // Proses məlumatları üçün
const checkDiskSpace = require('check-disk-space').default;

const getComprehensiveHealthStatus = async () => {
    // Bütün yoxlamaları paralel olaraq icra edirik
    const [dbCheck, redisCheck, firebaseCheck, cloudinaryCheck, mailerCheck, diskCheck, deepCheck] = await Promise.all([
        checkDatabase(),
        checkRedis(),
        checkFirebase(),
        checkCloudinary(),
        checkMailer(),
        checkDisk(),
        checkCriticalFunctionality(), // <-- Artıq bu funksiya mövcud olacaq
    ]);

    const dependencies = [dbCheck, redisCheck, firebaseCheck, cloudinaryCheck, mailerCheck, deepCheck];
    const systemChecks = [diskCheck];
    
    const isSystemHealthy = systemChecks.every(check => check.status === 'ok');
    const areDependenciesHealthy = dependencies.every(dep => dep.status === 'ok');

    const overallStatus = isSystemHealthy && areDependenciesHealthy ? 'ok' : 'error';
    const httpStatusCode = overallStatus === 'ok' ? 200 : 503;

    return {
        httpStatusCode,
        status: overallStatus,
        timestamp: new Date().toISOString(),
        system: {
            ...getSystemInfo(),
            disk: diskCheck,
        },
        dependencies: {
            database: dbCheck,
            redis: redisCheck,
            firebase: firebaseCheck,
            cloudinary: cloudinaryCheck,
            mailer: mailerCheck,
            applicationLogic: deepCheck,
        }
    };
};


const checkDatabase = async () => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return { status: 'ok', message: 'Successfully connected and queried.' };
    } catch (error) {
        return { status: 'error', message: error.message };
    }
};

const checkRedis = async () => {
    try {
        const reply = await redis.ping();
        if (reply !== 'PONG') throw new Error('Did not receive PONG reply.');
        return { status: 'ok', message: 'Successfully connected and received PONG.' };
    } catch (error) {
        return { status: 'error', message: error.message };
    }
};

const checkFirebase = async () => {
    // Firebase SDK-nın başladılıb-başladılmadığını yoxlayırıq
    if (admin.apps.length > 0) {
        return { status: 'ok', message: 'Firebase Admin SDK is initialized.' };
    }
    return { status: 'error', message: 'Firebase Admin SDK is not initialized.' };
};

const checkCloudinary = async () => {
    // Cloudinary üçün konfiqurasiyanın mövcudluğunu yoxlayırıq
    if (cloudinary.config().cloud_name && cloudinary.config().api_key && cloudinary.config().api_secret) {
        // Ping metodu ilə canlı bağlantını da yoxlaya bilərik
        try {
            await cloudinary.api.ping();
            return { status: 'ok', message: 'Configuration is valid and API is responsive.' };
        } catch(error) {
            return { status: 'error', message: 'Could not ping Cloudinary API. Check credentials.' };
        }
    }
    return { status: 'error', message: 'Cloudinary environment variables are not configured.' };
};

const checkMailer = async () => {
    try {
        await transporter.verify();
        return { status: 'ok', message: 'Nodemailer transporter is configured correctly.' };
    } catch (error) {
        return { status: 'error', message: error.message };
    }
};

const getSystemInfo = () => {
    return {
        nodeVersion: process.version,
        platform: os.platform(),
        uptime: `${Math.floor(process.uptime())} seconds`,
        memoryUsage: {
            rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
            heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
            heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
        }
    };
};
const checkDisk = async () => {
    try {
        const path = os.platform() === 'win32' ? 'C:' : '/';
        const info = await checkDiskSpace(path);
        const usagePercent = ((info.size - info.free) / info.size) * 100;
        
        let status = 'ok';
        if (usagePercent > 90) status = 'error';
        else if (usagePercent > 75) status = 'warning';

        return {
            status: status,
            total: `${(info.size / 1e9).toFixed(2)} GB`,
            free: `${(info.free / 1e9).toFixed(2)} GB`,
            usage: `${usagePercent.toFixed(2)}%`,
        };
    } catch (error) {
        return { status: 'error', message: error.message };
    }
};
const checkCriticalFunctionality = async () => {
    try {
        const ruleCount = await prisma.badgeRule.count();
        return { status: 'ok', message: `Successfully checked core logic. Found ${ruleCount} badge rules.` };
    } catch (error) {
        return { status: 'error', message: `Core logic check failed: ${error.message}` };
    }
};
module.exports = {
    getComprehensiveHealthStatus,
};