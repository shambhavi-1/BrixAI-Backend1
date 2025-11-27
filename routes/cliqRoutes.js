// routes/cliqRoutes.js
const express = require("express");
const router = express.Router();

router.post("/events", (req, res) => {
  // Cliq event payload processing would go here
  console.log("Cliq event received:", req.body);
  res.json({ message: "Event received" });
});

module.exports = router;
