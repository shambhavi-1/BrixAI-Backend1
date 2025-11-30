// routes/attendanceRoutes.js
const express = require("express");
const router = express.Router();

let attendance = [];

router.post("/", (req, res) => {
  const { project_id, checkin_time, checkout_time, geo_location } = req.body;
  if (!project_id || !checkin_time) return res.status(400).json({ message: "Missing required fields" });

  const record = {
    attendance_id: "att_" + (attendance.length + 1),
    user_id: req.user.id,
    project_id,
    checkin_time,
    checkout_time: checkout_time || null,
    geo_location: geo_location || null
  };
  attendance.push(record);
  res.status(201).json({ message: "Attendance recorded", attendance: record });
});

router.get("/user", (req, res) => {
  res.json({ attendance: attendance.filter(a => a.user_id === req.user.id) });
});

module.exports = router;
