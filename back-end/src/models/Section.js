const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  block: { type: String, required: true, trim: true },
  assignedPanels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Panel' }],
}, { timestamps: true });

module.exports = mongoose.model('Section', sectionSchema);
