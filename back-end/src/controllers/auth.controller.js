const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Panel = require('../models/Panel');

const signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password required' });

  // Check admin_acc first, then panel_acc
  let user = await Admin.findOne({ email });
  if (!user) user = await Panel.findOne({ email });

  if (!user || !(await user.matchPassword(password)))
    return res.status(401).json({ message: 'Invalid credentials' });

  if (!user.isActive)
    return res.status(403).json({ message: 'Account is deactivated' });

  res.json({
    token: signToken(user._id, user.role),
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
};

exports.getMe = async (req, res) => {
  res.json(req.user);
};
