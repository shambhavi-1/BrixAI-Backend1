const DayLog = require('../models/DayLog');
const Project = require('../models/Project');
const aiHelper = require('../utils/aiHelper');

exports.createDayLog = async (req, res) => {
  const { projectId, progress } = req.body;
  const p = await Project.findById(projectId);
  if (!p) return res.status(404).json({ message: 'no project' });
  const summary = await aiHelper.generateDailySummary(progress);
  const log = await DayLog.create({ project: projectId, progress, summary });
  res.status(201).json(log);
};

exports.getLogsByProject = async (req, res) => {
  const logs = await DayLog.find({ project: req.params.projectId }).sort({ date: -1 });
  res.json(logs);
};
