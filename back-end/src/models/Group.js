const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  // Supports old string members and new structured name objects.
  members: [{ type: mongoose.Schema.Types.Mixed }],
  assignedPanels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Panel' }],
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);
