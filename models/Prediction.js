const mongoose = require('mongoose');

const PredictionSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  type: String,
  result: mongoose.Schema.Types.Mixed,
  source: String
}, { timestamps: true });

module.exports = mongoose.model('Prediction', PredictionSchema);
