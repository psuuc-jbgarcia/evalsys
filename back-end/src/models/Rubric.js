const mongoose = require('mongoose');

const levelSchema = new mongoose.Schema({
  label: { type: String, required: true },      // e.g. "Excellent"
  minScore: { type: Number, required: true },
  maxScore: { type: Number, required: true },
  description: { type: String, default: '' },
}, { _id: false });

const criteriaSchema = new mongoose.Schema({
  key: { type: String, required: true },         // e.g. "systemFunctionality"
  label: { type: String, required: true },       // e.g. "System Functionality"
  maxScore: { type: Number, required: true },
  levels: [levelSchema],
}, { _id: false });

const rubricSchema = new mongoose.Schema({
  title: { type: String, required: true, default: 'Default Rubric' },
  criteria: [criteriaSchema],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Rubric', rubricSchema);
