const cron = require('node-cron');
const schedulerService = require('./scheduler.service');

const initializeScheduledJobs = () => {
    // Bu cron tapşırığı hər gecə saat 03:00-da işə düşəcək
    // Sintaksis: (dəqiqə saat gün ay həftənin-günü)
    cron.schedule('0 3 * * *', () => {
        schedulerService.runDatabaseCleanup();
        schedulerService.sendReEngagementNotifications(); // Digər tapşırıqları da bura əlavə edə bilərik
        schedulerService.calculateVenueStatistics();
    }, {
        scheduled: true,
        timezone: "Asia/Baku" // Bakı vaxtı ilə işləməsi üçün
    });

    console.log("⏰ Scheduled jobs (Database Cleanup, etc.) have been initialized.");
};

module.exports = {
    initializeScheduledJobs,
};