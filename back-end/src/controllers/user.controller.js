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

exports.deleteUser = async (req, res) => {
  const deleted = await Admin.findByIdAndDelete(req.params.id) ||
                  await Panel.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'User deleted' });
};
