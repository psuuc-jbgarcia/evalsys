const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  isGradingLocked: { type: Boolean, default: false },
  isCsvExportLocked: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
