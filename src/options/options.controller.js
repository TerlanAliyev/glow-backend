const optionsService = require('./options.service');
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const getOptions = asyncHandler(async (req, res) => {
    const options = await optionsService.getAllOptions();
    res.status(200).json(options);
});

module.exports = { getOptions };