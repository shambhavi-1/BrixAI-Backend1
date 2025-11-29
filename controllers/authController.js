// backend/controllers/authController.js

const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { signToken } = require('../utils/jwtHelper');

// USER REGISTER
exports.signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({ name, email, password, role });

    const token = signToken(user);
    return res.json({ token, user });

  } catch (err) {
    console.error('Signup Error:', err.message);
    return res.status(500).json({ message: 'Signup failed' });
  }
};

// USER LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const match = await user.matchPassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(user);
    return res.json({ token, user });

  } catch (err) {
    console.error('Login Error:', err.message);
    return res.status(500).json({ message: 'Login failed' });
  }
};

// REFRESH TOKEN
exports.refreshToken = async (req, res) => {
  try {
    const { token } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const newToken = signToken(user);
    return res.json({ token: newToken, user });

  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
