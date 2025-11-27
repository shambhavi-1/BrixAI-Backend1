const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['present','absent'], default: 'present' }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
