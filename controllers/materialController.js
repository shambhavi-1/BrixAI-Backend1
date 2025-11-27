const Material = require('../models/Material');
const Project = require('../models/Project');
const aiHelper = require('../utils/aiHelper');

exports.addMaterial = async (req, res) => {
  const { projectId, name, quantity } = req.body;
  const p = await Project.findById(projectId);
  if (!p) return res.status(404).json({ message: 'no project' });
  const m = await Material.create({ name, quantity, project: projectId });
  m.alert = await aiHelper.alertMaterialShortage(m);
  await m.save();
  res.status(201).json(m);
};

exports.updateMaterial = async (req, res) => {
  const m = await Material.findById(req.params.materialId);
  if (!m) return res.status(404).json({ message: 'no material' });
  if (req.body.name) m.name = req.body.name;
  if (typeof req.body.quantity !== 'undefined') m.quantity = req.body.quantity;
  m.alert = await aiHelper.alertMaterialShortage(m);
  await m.save();
  res.json(m);
};

exports.getMaterialsByProject = async (req, res) => {
  const list = await Material.find({ project: req.params.projectId });
  res.json(list);
};
