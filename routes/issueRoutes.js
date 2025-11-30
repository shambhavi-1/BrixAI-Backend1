// routes/issueRoutes.js
const express = require("express");
const router = express.Router();

let issues = [];

// Report issue
router.post("/", (req, res) => {
  const { project_id, category, priority, photo_url, assigned_to } = req.body;
  if (!project_id || !category) return res.status(400).json({ message: "Missing required fields" });

  const newIssue = {
    issue_id: "issue_" + (issues.length + 1),
    project_id,
    reporter_id: req.user.id,
    category,
    priority: priority || "Medium",
    photo_url: photo_url || [],
    assigned_to: assigned_to || null,
    status: "Open",
    created_at: new Date()
  };

  issues.push(newIssue);
  return res.status(201).json({ message: "Issue reported", issue: newIssue });
});

// List issues for project
router.get("/project/:projectId", (req, res) => {
  const resIssues = issues.filter(i => i.project_id === req.params.projectId);
  res.json({ issues: resIssues });
});

module.exports = router;
