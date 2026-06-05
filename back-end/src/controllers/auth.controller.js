const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Panel = require('../models/Panel');
const Section = require('../models/Section');

const signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });

const isStrongPassword = (password = '') => (
  typeof password === 'string' &&
  password.length >= 8 &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password)
);
const passwordRuleMessage = 'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol';

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

const uniqueIds = (ids = []) => [
  ...new Set(ids.filter(Boolean).map((id) => id.toString())),
];

const getPanelLockedSubjects = async (panel) => {
  if (!panel.createdBy) return [];

  const assignedSections = await Section.find({
    assignedPanels: panel._id,
    subject: { $exists: true, $ne: null },
    createdBy: panel.createdBy,
  }).select('subject');
  const assignedSubjectIds = uniqueIds(assignedSections.map((section) => section.subject));

  if (!assignedSubjectIds.length) return [];

  const instructor = await Admin.findOne({
    _id: panel.createdBy,
    role: 'admin',
    isActive: true,
    gradingLockedSubjects: { $in: assignedSubjectIds },
  }).select('gradingLockedSubjects');

  return uniqueIds(instructor?.gradingLockedSubjects || [])
    .filter((subjectId) => assignedSubjectIds.includes(subjectId));
};

const getUserFeatureLocks = async (user) => {
  if (user.role === 'panel') {
    const instructor = user.createdBy
      ? await Admin.findById(user.createdBy).select('csvExportLocked')
      : null;
    return {
      csvExportLocked: Boolean(instructor?.csvExportLocked),
      gradingLocked: false,
      gradingLockedSubjects: await getPanelLockedSubjects(user),
    };
  }

  return {
    csvExportLocked: Boolean(user.csvExportLocked),
    gradingLocked: Boolean(user.gradingLocked),
    gradingLockedSubjects: user.gradingLockedSubjects || [],
  };
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

  const locks = await getUserFeatureLocks(user);

  res.json({
    token: signToken(user._id, user.role),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: Boolean(user.mustChangePassword),
      assignedSubjects: user.assignedSubjects || [],
      ...locks,
    },
  });
};

exports.getMe = async (req, res) => {
  const user = req.user.toObject ? req.user.toObject() : req.user;
  const locks = await getUserFeatureLocks(req.user);
  res.json({ ...user, ...locks });
};

exports.changePassword = async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword) {
    return res.status(400).json({ message: 'New password is required' });
  }
  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({ message: passwordRuleMessage });
  }
  const Model = ['admin', 'superadmin'].includes(req.user.role) ? Admin : Panel;
  const user = await Model.findById(req.user._id);
  if (!user) return res.status(404).json({ message: 'Account not found' });

  if (await user.matchPassword(newPassword)) {
    return res.status(400).json({ message: 'New password must be different from the temporary password' });
  }

  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();
  res.json({ message: 'Password changed successfully', mustChangePassword: false });
};
