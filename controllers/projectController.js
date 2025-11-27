const Project = require('../models/Project');
const User = require('../models/User');
const crypto = require('crypto');

exports.createProject = async (req, res) => {
  const { name, description } = req.body;
  const code = crypto.randomBytes(3).toString('hex');
  const p = await Project.create({ name, description, code, members: [req.user._id] });
  req.user.projects.push(p._id);
  await req.user.save();
  res.status(201).json(p);
};

exports.joinProject = async (req, res) => {
  const { code } = req.body;
  const p = await Project.findOne({ code });
  if (!p) return res.status(404).json({ message: 'not found' });
  if (!p.members.includes(req.user._id)) {
    p.members.push(req.user._id);
    await p.save();
    req.user.projects.push(p._id);
    await req.user.save();
  }
  res.json(p);
};

exports.getProjectDetails = async (req, res) => {
  const p = await Project.findById(req.params.id).populate('members', 'name email role');
  if (!p) return res.status(404).json({ message: 'not found' });
  res.json(p);
};
