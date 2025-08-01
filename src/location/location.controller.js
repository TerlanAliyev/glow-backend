
const { validationResult } = require('express-validator');
const locationService = require('./location.service');

const checkIn = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userId = req.user.userId;
    const { latitude, longitude } = req.body;

    const result = await locationService.checkInUser(userId, latitude, longitude);
    
    res.status(200).json({ message: `Siz uğurla '${result.venue.name}'-a daxil oldunuz!`, data: result });
  } catch (error) {
    next(error); // Xətanı mərkəzi errorHandler-a ötürürük
  }
};

const seedVenues = async (req, res, next) => {
    try {
        await locationService.seedDatabaseWithVenues();
        res.status(201).json({ message: 'Databaza test məkanları ilə uğurla dolduruldu!'});
    } catch (error) {
        next(error);
    }
};

module.exports = {
  checkIn,
  seedVenues,
};
