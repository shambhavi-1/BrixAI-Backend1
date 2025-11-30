const Attendance = require('../models/Attendance');
const Project = require('../models/Project');
const User = require('../models/User');
const aiHelper = require('../utils/aiHelper');

exports.markAttendance = async (req, res) => {
  const { projectId, userId, status } = req.body;
  const p = await Project.findById(projectId);
  if (!p) return res.status(404).json({ message: 'no project' });
  const a = await Attendance.create({ project: projectId, user: userId, status });
  res.status(201).json(a);
};

exports.getAttendanceByProject = async (req, res) => {
  const records = await Attendance.find({ project: req.params.projectId }).populate('user', 'name role').sort({ date: -1 });
  res.json(records);
};

exports.predictLaborShortage = async (req, res) => {
  const pred = await aiHelper.predictLaborShortage(req.params.projectId);
  res.json(pred);
};
