const mongoose = require('mongoose');

const DayLogSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  date: { type: Date, default: Date.now },
  progress: String,
  summary: String
}, { timestamps: true });

module.exports = mongoose.model('DayLog', DayLogSchema);
