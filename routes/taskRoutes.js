// routes/taskRoutes.js
const express = require("express");
const router = express.Router();

let tasks = [];

// Create task
router.post("/", (req, res) => {
  const { title, description, assignee_id, project_id, priority, due_date } = req.body;
  if (!title || !assignee_id || !project_id) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const newTask = {
    task_id: "task_" + (tasks.length + 1),
    title,
    description: description || "",
    assignee_id,
    project_id,
    priority: priority || "Normal",
    due_date: due_date || null,
    created_by: req.user.id,
    status: "Pending",
    created_at: new Date()
  };

  tasks.push(newTask);
  return res.status(201).json({ message: "Task created", task: newTask });
});

// List tasks for the user (assigned to or created by)
router.get("/user", (req, res) => {
  const userTasks = tasks.filter(t => t.assignee_id === req.user.id || t.created_by === req.user.id);
  res.json({ tasks: userTasks });
});

// Get a task
router.get("/:id", (req, res) => {
  const t = tasks.find(x => x.task_id === req.params.id);
  if (!t) return res.status(404).json({ message: "Task not found" });
  res.json({ task: t });
});

// Update task (partial)
router.patch("/:id", (req, res) => {
  const t = tasks.find(x => x.task_id === req.params.id);
  if (!t) return res.status(404).json({ message: "Task not found" });

  // basic role check example: only creator or manager can change
  if (req.user.role !== "manager" && req.user.id !== t.created_by) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const updates = req.body;
  Object.assign(t, updates);
  res.json({ message: "Task updated", task: t });
});

module.exports = router;
