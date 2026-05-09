const Admin = require('../models/Admin');
const Panel = require('../models/Panel');

// Admin: create panel account
exports.createUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ message: 'All fields required' });
  if (!['admin', 'panel'].includes(role))
    return res.status(400).json({ message: 'Role must be admin or panel' });

  // Check both collections for duplicate email
  const existsAdmin = await Admin.findOne({ email });
  const existsPanel = await Panel.findOne({ email });
  if (existsAdmin || existsPanel)
    return res.status(409).json({ message: 'Email already in use' });

  const Model = role === 'admin' ? Admin : Panel;
  const user = await Model.create({ name, email, password, role });
  res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
};

// Bulk create users (for CSV import)
exports.bulkCreateUsers = async (req, res) => {
  const { users } = req.body;
  if (!Array.isArray(users)) return res.status(400).json({ message: 'Users array required' });

  const results = { created: 0, skipped: 0, errors: [] };

  for (const u of users) {
    try {
      const { name, email, password, role } = u;
      if (!name || !email || !password || !role) {
        results.skipped++;
        continue;
      }

      const existsAdmin = await Admin.findOne({ email });
      const existsPanel = await Panel.findOne({ email });
      if (existsAdmin || existsPanel) {
        results.skipped++;
        continue;
      }

      const Model = role.toLowerCase() === 'admin' ? Admin : Panel;
      await Model.create({ name, email, password, role: role.toLowerCase() });
      results.created++;
    } catch (err) {
      results.errors.push(err.message);
    }
  }

  res.json(results);
};

// Get all users from both collections
exports.getUsers = async (req, res) => {
  const admins = await Admin.find().select('-password').sort({ createdAt: -1 });
  const panels = await Panel.find().select('-password').sort({ createdAt: -1 });
  res.json([...admins, ...panels]);
};

exports.toggleActive = async (req, res) => {
  let user = await Admin.findById(req.params.id) || await Panel.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  user.isActive = !user.isActive;
  await user.save();
  res.json({ id: user._id, isActive: user.isActive });
};

exports.resetPassword = async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ message: 'New password required' });

  let user = await Admin.findById(req.params.id) || await Panel.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password reset successfully' });
};

exports.deleteUser = async (req, res) => {
  const deleted = await Admin.findByIdAndDelete(req.params.id) ||
    await Panel.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'User deleted' });
};
