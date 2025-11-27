const User = require('../models/User');
const jwt = require('jsonwebtoken');

const tokenFor = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'missing' });
  if (await User.findOne({ email })) return res.status(400).json({ message: 'exists' });
  const user = await User.create({ name, email, password, role });
  res.status(201).json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, token: tokenFor(user._id) });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) return res.status(401).json({ message: 'invalid' });
  res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, token: tokenFor(user._id) });
};

exports.assignRole = async (req, res) => {
  const { userId, role } = req.body;
  const u = await User.findById(userId);
  if (!u) return res.status(404).json({ message: 'not found' });
  u.role = role;
  await u.save();
  res.json({ message: 'ok' });
};

exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user._id).select('-password').populate('projects', 'name code');
  res.json(user);
};
