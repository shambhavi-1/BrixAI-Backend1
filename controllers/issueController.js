const Issue = require('../models/Issue');
const Project = require('../models/Project');
const cloudinary = require('../config/cloudinary');
const aiHelper = require('../utils/aiHelper');
const fs = require('fs');

exports.reportIssue = async (req, res) => {
  const { title, description, projectId } = req.body;
  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: 'no project' });
  let imageUrl = null;
  if (req.file) {
    const result = await cloudinary.uploader.upload(req.file.path, { folder: 'buildproai/issues' });
    imageUrl = result.secure_url;
    fs.unlink(req.file.path, ()=>{});
  }
  const severity = await aiHelper.classifyIssueSeverity(description, imageUrl);
  const issue = await Issue.create({ title, description, imageUrl, severity, project: projectId, reportedBy: req.user._id });
  res.status(201).json(issue);
};

exports.listIssuesByProject = async (req, res) => {
  const issues = await Issue.find({ project: req.params.projectId }).populate('reportedBy', 'name');
  res.json(issues);
};
