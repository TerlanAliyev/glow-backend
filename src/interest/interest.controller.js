
const interestService = require('./interest.service');

const getAllInterests = async (req, res) => {
  try {
    const interestsByCategory = await interestService.findAllInterests();
    res.status(200).json(interestsByCategory);
  } catch (error) {
    res.status(500).json({ message: 'Maraqları gətirmək mümkün olmadı.' });
  }
};



module.exports = {
  getAllInterests,
};