// backend/utils/cliqVerify.js
module.exports = function verifyCliq(req, res, next) {
  // If validation not configured, allow through (useful for dev)
  if (!process.env.CLIQ_VALIDATE_TOKEN) return next();

  const token = req.headers['x-cliq-token'] || req.headers['authorization'] || '';
  if (!token) return res.status(403).json({ message: 'Invalid token' });
  if (token !== process.env.CLIQ_VALIDATE_TOKEN) return res.status(403).json({ message: 'Invalid token' });
  return next();
};
