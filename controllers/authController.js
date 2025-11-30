// backend/controllers/authController.js
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const {
  signAccessToken,
  signRefreshToken,
} = require("../utils/jwtHelper");

// USER REGISTER
exports.signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({ name, email, password, role });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    return res.json({ accessToken, refreshToken, user });

  } catch (err) {
    console.error("Signup Error:", err.message);
    return res.status(500).json({ message: "Signup failed" });
  }
};

// USER LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await user.matchPassword(password);
    if (!match)
      return res.status(401).json({ message: "Invalid credentials" });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    return res.json({ accessToken, refreshToken, user });

  } catch (err) {
    console.error("Login Error:", err.message);
    return res.status(500).json({ message: "Login failed" });
  }
};

// REFRESH TOKEN
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken)
      return res.status(400).json({ message: "Refresh token required" });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken)
      return res.status(401).json({ message: "Invalid refresh token" });

    const newAccessToken = signAccessToken(user);

    return res.json({ accessToken: newAccessToken });

  } catch (err) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};
