const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  code: { type: String, required: true, trim: true, uppercase: true, unique: true },
  title: { type: String, required: true, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);
