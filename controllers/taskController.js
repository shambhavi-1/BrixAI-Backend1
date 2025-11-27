const Task = require('../models/Task');
const Project = require('../models/Project');

exports.createTask = async (req, res) => {
  const { title, description, projectId, assignedTo } = req.body;
  if (!title || !projectId) return res.status(400).json({ message: 'missing' });
  const p = await Project.findById(projectId);
  if (!p) return res.status(404).json({ message: 'no project' });
  const t = await Task.create({ title, description, project: projectId, assignedTo });
  res.status(201).json(t);
};

exports.assignTask = async (req, res) => {
  const t = await Task.findById(req.params.taskId);
  if (!t) return res.status(404).json({ message: 'no task' });
  t.assignedTo = req.body.assignedTo;
  await t.save();
  res.json(t);
};

exports.updateStatus = async (req, res) => {
  const t = await Task.findById(req.params.taskId);
  if (!t) return res.status(404).json({ message: 'no task' });
  t.status = req.body.status;
  await t.save();
  res.json(t);
};

exports.getTasksByProject = async (req, res) => {
  const tasks = await Task.find({ project: req.params.projectId }).populate('assignedTo', 'name role');
  res.json(tasks);
};
