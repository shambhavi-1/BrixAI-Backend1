// routes/projectRoutes.js
const express = require("express");
const router = express.Router();

// Demo in-memory projects DB
let projects = [
  {
    project_id: "proj_12345",
    name: "Orbit Heights",
    location: "Sector 21",
    start_date: "2025-11-26",
    end_date: "2026-04-30",
    blueprint_url: "",
    members: ["manager_user_id", "mestri_user_id", "labor_user_id"]
  }
];

// Create project (manager)
router.post("/", (req, res) => {
  const { name, location, start_date, end_date, blueprint_url } = req.body;
  if (!name) return res.status(400).json({ message: "Missing project name" });

  const newProj = {
    project_id: "proj_" + (projects.length + 1),
    name, location, start_date, end_date, blueprint_url,
    members: [req.user.id]
  };
  projects.push(newProj);
  return res.status(201).json({ message: "Project created", project: newProj });
});

// Join project by project_code/project_id (any role)
router.post("/join", (req, res) => {
  const { project_code } = req.body;
  const proj = projects.find(p => p.project_id === project_code);
  if (!proj) return res.status(404).json({ message: "Project not found" });

  if (!proj.members.includes(req.user.id)) proj.members.push(req.user.id);
  return res.json({ message: `User ${req.user.id} joined`, project: proj });
});

// List projects for current user
router.get("/user", (req, res) => {
  const userProjects = projects.filter(p => p.members.includes(req.user.id));
  res.json({ projects: userProjects });
});

// Get project details
router.get("/:id", (req, res) => {
  const proj = projects.find(p => p.project_id === req.params.id);
  if (!proj) return res.status(404).json({ message: "Project not found" });
  res.json({ project: proj });
});

module.exports = router;
