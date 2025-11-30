const express = require("express");
const router = express.Router();
const cliqController = require("../controllers/cliqController");

// This is the single endpoint Cliq will call for all /bp commands
router.post("/events", cliqController.handleCliqCommand);

module.exports = router;
