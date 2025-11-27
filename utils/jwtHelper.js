// backend/utils/jwtHelper.js
const jwt = require('jsonwebtoken');

function signToken(user) {
  // Keep payload small
  const payload = { id: user._id, role: user.role, email: user.email };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
  return token;
}

module.exports = { signToken };
