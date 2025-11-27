// routes/daylogRoutes.js
const express = require("express");
const router = express.Router();

let daylogs = [];

// Create daylog (voice/text/photo translated client-side or backend)
router.post("/", (req, res) => {
  const { project_id, content_text, content_voice_url, photo_url } = req.body;
  if (!project_id || !content_text) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const newDaylog = {
    daylog_id: "daylog_" + (daylogs.length + 1),
    project_id,
    reporter_id: req.user.id,
    role: req.user.role,
    content_text,
    content_voice_url: content_voice_url || null,
    photo_url: photo_url || null,
    created_at: new Date()
  };

  daylogs.push(newDaylog);
  return res.status(201).json({ message: "DayLog created", daylog: newDaylog });
});

// List daylogs for project (or user)
router.get("/project/:projectId", (req, res) => {
  const logs = daylogs.filter(d => d.project_id === req.params.projectId);
  res.json({ daylogs: logs });
});

module.exports = router;
