const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  block: { type: String, required: true, trim: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', index: true },
  assignedPanels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Panel' }],
}, { timestamps: true });

module.exports = mongoose.model('Section', sectionSchema);
