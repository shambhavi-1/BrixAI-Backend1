// routes/aiRoutes.js
const express = require("express");
const router = express.Router();

// Mocked AI endpoints (MVP behavior)
router.post("/summarize", (req, res) => {
  const { project_id, date_range } = req.body;
  // return mock summary
  return res.json({
    summary: `Mock summary for ${project_id || "all projects"} (${date_range || "today"}): 10 tasks completed, 2 critical issues. Suggested: reorder cement.`
  });
});

router.post("/predict", (req, res) => {
  const { project_id } = req.body;
  return res.json({
    prediction: {
      risk_level: "MEDIUM",
      reason: "Rule: overdue critical tasks > 2",
      suggested_fix: "Add 1 extra team"
    }
  });
});

module.exports = router;
