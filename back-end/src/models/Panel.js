const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const panelSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, default: 'panel' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true, collection: 'panel_acc' });

panelSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

panelSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('Panel', panelSchema);
