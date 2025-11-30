// utils/jwtHelper.js
const jwt = require("jsonwebtoken");

// Access Token: 1 hour
const signAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};

// Refresh Token: 30 days
const signRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "30d" }
  );
};

module.exports = {
  signAccessToken,
  signRefreshToken
};
