const mongoose = require('mongoose');

const MaterialSchema = new mongoose.Schema({
  name: String,
  quantity: Number,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  alert: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Material', MaterialSchema);
