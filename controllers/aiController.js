// controllers/aiController.js
const DayLog = require("../models/DayLog");
const { generateSummary } = require("../utils/aiHelper");

exports.getSummary = async (req, res) => {
  try {
    const { project_id } = req.params;

    const logs = await DayLog.find({ project_id })
      .sort({ created_at: -1 })
      .limit(25);

    const text = logs.map(log => `• ${log.content_text}`).join("\n");

    const summary = await generateSummary(text);

    res.json({ success: true, summary });
  } catch (err) {
    console.error("Summary Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
