const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  panel: { type: mongoose.Schema.Types.ObjectId, ref: 'Panel', required: true },
  rubric: { type: mongoose.Schema.Types.ObjectId, ref: 'Rubric' },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', index: true },
  scores: {
    type: Map,
    of: Number,
    required: true,
  },
  total: { type: Number }, // auto-computed
  comments: { type: String, default: '' },
  isSubmitted: { type: Boolean, default: false },
}, { timestamps: true });

// Auto-compute total before saving
evaluationSchema.pre('save', function (next) {
  let sum = 0;
  for (const val of this.scores.values()) {
    sum += val;
  }
  this.total = sum;
  next();
});

// One evaluation per panel per group
evaluationSchema.index({ group: 1, panel: 1 }, { unique: true });

module.exports = mongoose.model('Evaluation', evaluationSchema);
