const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  isGradingLocked: { type: Boolean, default: false },
  maxSubjectsPerInstructor: { type: Number, default: 1, min: 1 },
  isCsvExportLocked: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
