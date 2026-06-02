const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Panel = require('../models/Panel');

const signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });

const normalizeEvalsysEmail = (value = '') => {
  const email = value.trim().toLowerCase();
  if (!email) return '';
  let username = email;
  if (email.endsWith('@evalsys.com')) {
    username = email.slice(0, -'@evalsys.com'.length);
  } else if (email.endsWith('@')) {
    username = email.slice(0, -1);
  } else if (email.includes('@')) {
    return '';
  }

  if (!/^[a-z0-9._-]+$/.test(username)) return '';
  if (!username) return '';
  return `${username}@evalsys.com`;
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findUserByEmail = async (email) => (
  await Admin.findOne({ email }) || await Panel.findOne({ email })
);

const findLegacyUserByUsername = async (email) => {
  const username = email.split('@')[0];
  if (!username) return null;
  const localPartRegex = new RegExp(`^${escapeRegex(username)}@`, 'i');
  return await Admin.findOne({ email: localPartRegex }) || await Panel.findOne({ email: localPartRegex });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password required' });

  const normalizedEmail = normalizeEvalsysEmail(email);
  if (!normalizedEmail)
    return res.status(400).json({ message: 'Valid @evalsys.com email required' });

  // Check admin_acc first, then panel_acc
  let user = await findUserByEmail(normalizedEmail);
  if (!user) {
    const legacyUser = await findLegacyUserByUsername(email.trim().toLowerCase());
    if (legacyUser) {
      const duplicate = await findUserByEmail(normalizedEmail);
      if (!duplicate || duplicate._id.toString() === legacyUser._id.toString()) {
        legacyUser.email = normalizedEmail;
        await legacyUser.save();
        user = legacyUser;
      }
    }
  }

  if (!user || !(await user.matchPassword(password)))
    return res.status(401).json({ message: 'Invalid credentials' });

  if (!user.isActive)
    return res.status(403).json({ message: 'Account is deactivated' });

  res.json({
    token: signToken(user._id, user.role),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      assignedSubjects: user.assignedSubjects || [],
    },
  });
};

exports.getMe = async (req, res) => {
  res.json(req.user);
};
