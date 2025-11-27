// routes/materialRoutes.js
const express = require("express");
const router = express.Router();

let materials = [];

// Request material
router.post("/", (req, res) => {
  const { project_id, name, quantity_requested, vendor_id } = req.body;
  if (!project_id || !name || !quantity_requested) return res.status(400).json({ message: "Missing required fields" });

  const newMaterial = {
    material_id: "mat_" + (materials.length + 1),
    project_id,
    name,
    quantity_requested,
    quantity_onhand: 0,
    vendor_id: vendor_id || null,
    status: "Requested",
    created_at: new Date()
  };

  materials.push(newMaterial);
  return res.status(201).json({ message: "Material requested", material: newMaterial });
});

router.get("/project/:projectId", (req, res) => {
  res.json({ materials: materials.filter(m => m.project_id === req.params.projectId) });
});

module.exports = router;
