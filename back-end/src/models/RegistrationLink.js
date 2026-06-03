const mongoose = require('mongoose');
const crypto = require('crypto');

const registrationLinkSchema = new mongoose.Schema({
  token: {
    type: String,
    unique: true,
    index: true,
    default: () => crypto.randomBytes(18).toString('base64url'),
  },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  sections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Section' }],
  expiresAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
}, { timestamps: true });

module.exports = mongoose.model('RegistrationLink', registrationLinkSchema);
