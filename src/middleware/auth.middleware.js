const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) {
    return res.status(401).json({ message: 'Token təqdim edilməyib.' });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, userPayload) => {
    if (err) {
      return res.status(403).json({ message: 'Token etibarlı deyil.' });
    }
    req.user = userPayload;
    next();
  });
};

module.exports = {
  authenticateToken,
};