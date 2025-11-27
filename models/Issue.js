const mongoose = require('mongoose');

const IssueSchema = new mongoose.Schema({
  title: String,
  description: String,
  imageUrl: String,
  severity: { type: String, enum: ['low','medium','high'], default: 'low' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Issue', IssueSchema);
