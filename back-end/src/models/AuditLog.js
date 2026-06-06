const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true, index: true },
  status: { type: String, enum: ['success', 'failed'], default: 'success', index: true },
  actor: {
    id: { type: mongoose.Schema.Types.ObjectId },
    name: { type: String },
    email: { type: String },
    role: { type: String },
  },
  entity: {
    type: { type: String, index: true },
    id: { type: mongoose.Schema.Types.ObjectId },
    name: { type: String },
  },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', index: true },
  ip: { type: String },
  userAgent: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
