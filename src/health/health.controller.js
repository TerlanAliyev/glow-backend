const healthService = require('./health.service');

const checkHealth = async (req, res) => {
    const healthStatus = await healthService.getComprehensiveHealthStatus();
    res.status(healthStatus.httpStatusCode).json(healthStatus);
};

module.exports = {
    checkHealth,
};