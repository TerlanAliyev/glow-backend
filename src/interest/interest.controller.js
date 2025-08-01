
const interestService = require('./interest.service');

const getAllInterests = async (req, res) => {
  try {
    const interestsByCategory = await interestService.findAllInterests();
    res.status(200).json(interestsByCategory);
  } catch (error) {
    res.status(500).json({ message: 'Maraqları gətirmək mümkün olmadı.' });
  }
};

const seedInterests = async (req, res) => {
  try {
    await interestService.seedDatabaseWithInterests();
    res.status(201).json({ message: 'Databaza test maraqları ilə uğurla dolduruldu!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Databazanı doldurmaq mümkün olmadı.' });
  }
};

module.exports = {
  getAllInterests,
  seedInterests,
};