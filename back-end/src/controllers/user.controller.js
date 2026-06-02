const Admin = require('../models/Admin');
const Panel = require('../models/Panel');
const Section = require('../models/Section');

const getInstructorPanelIds = async (req) => {
  if (req.user.role !== 'admin') return [];

  const sections = await Section.find({
    subject: { $in: req.user.assignedSubjects || [] },
  }).select('assignedPanels');

  return [
    ...new Set(
      sections.flatMap((section) =>
        (section.assignedPanels || []).map((panelId) => panelId.toString())
      )
    ),
  ];
};

const canManageUser = async (req, user) => {
  if (req.user.role === 'superadmin') return true;
  if (user?.role !== 'panel') return false;
  if (user.createdBy && user.createdBy.toString() === req.user._id.toString()) return true;

  const visiblePanelIds = await getInstructorPanelIds(req);
  return visiblePanelIds.includes(user._id.toString());
};

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

const normalizeLegacyEvalsysEmail = (value = '') => {
  const email = value.trim().toLowerCase();
  if (!email) return '';
  const username = email.split('@')[0];
  if (!/^[a-z0-9._-]+$/.test(username)) return '';
  return `${username}@evalsys.com`;
};

const findAccountByEmail = async (email) => (
  await Admin.findOne({ email }) || await Panel.findOne({ email })
);

const isStrongPassword = (password = '') => (
  typeof password === 'string' &&
  password.length >= 8 &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password)
);

const passwordRuleMessage = 'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol';

const normalizeLegacyAccountEmails = async (accounts = []) => {
  const normalized = [];

  for (const account of accounts) {
    const normalizedEmail = normalizeLegacyEvalsysEmail(account.email);
    if (normalizedEmail && normalizedEmail !== account.email) {
      const duplicate = await findAccountByEmail(normalizedEmail);
      if (!duplicate || duplicate._id.toString() === account._id.toString()) {
        account.email = normalizedEmail;
        await account.save();
      }
    }
    normalized.push(account);
  }

  return normalized;
};

// Admin: create panel account
exports.createUser = async (req, res) => {
  const { name, email, password, role, assignedSubjects = [], subjectLimit, createdBy } = req.body;
  const normalizedEmail = normalizeEvalsysEmail(email);
  if (!name || !normalizedEmail || !password || !role)
    return res.status(400).json({ message: 'All fields required' });
  if (!isStrongPassword(password))
    return res.status(400).json({ message: passwordRuleMessage });
  if (!['superadmin', 'admin', 'panel'].includes(role))
    return res.status(400).json({ message: 'Role must be superadmin, admin, or panel' });
  if (['superadmin', 'admin'].includes(role) && req.user.role !== 'superadmin')
    return res.status(403).json({ message: 'Only super admin can create instructor/admin accounts' });

  // Check both collections for duplicate email
  if (await findAccountByEmail(normalizedEmail))
    return res.status(409).json({ message: 'Email already in use' });

  const Model = ['superadmin', 'admin'].includes(role) ? Admin : Panel;
  const payload = { name, email: normalizedEmail, password, role, assignedSubjects };
  if (role === 'admin') payload.subjectLimit = Math.max(1, parseInt(subjectLimit, 10) || 1);
  if (role === 'panel') {
    if (req.user.role === 'superadmin') {
      if (!createdBy) return res.status(400).json({ message: 'Select the instructor who owns this panel account' });
      const instructor = await Admin.findOne({ _id: createdBy, role: 'admin', isActive: true });
      if (!instructor) return res.status(400).json({ message: 'Selected instructor is invalid or inactive' });
      payload.createdBy = instructor._id;
    } else {
      payload.createdBy = req.user._id;
    }
  }
  const user = await Model.create(payload);
  res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role, assignedSubjects: user.assignedSubjects || [], subjectLimit: user.subjectLimit });
};

// Bulk create users (for CSV import)
exports.bulkCreateUsers = async (req, res) => {
  const { users } = req.body;
  if (!Array.isArray(users)) return res.status(400).json({ message: 'Users array required' });

  const results = { created: 0, skipped: 0, errors: [] };

  for (const u of users) {
    try {
      const { name, email, password, role, assignedSubjects = [], subjectLimit } = u;
      const normalizedEmail = normalizeEvalsysEmail(email);
      if (!name || !normalizedEmail || !password || !role) {
        results.skipped++;
        continue;
      }
      if (!isStrongPassword(password)) {
        results.skipped++;
        results.errors.push(`${email || name}: ${passwordRuleMessage}`);
        continue;
      }

      if (await findAccountByEmail(normalizedEmail)) {
        results.skipped++;
        continue;
      }

      const normalizedRole = role.toLowerCase();
      if (['superadmin', 'admin'].includes(normalizedRole) && req.user.role !== 'superadmin') {
        results.skipped++;
        continue;
      }
      const Model = ['superadmin', 'admin'].includes(normalizedRole) ? Admin : Panel;
      const payload = { name, email: normalizedEmail, password, role: normalizedRole, assignedSubjects };
      if (normalizedRole === 'admin') payload.subjectLimit = Math.max(1, parseInt(subjectLimit, 10) || 1);
      if (normalizedRole === 'panel') payload.createdBy = req.user._id;
      await Model.create(payload);
      results.created++;
    } catch (err) {
      results.errors.push(err.message);
    }
  }

  res.json(results);
};

// Get all users from both collections
exports.getUsers = async (req, res) => {
  const admins = req.user.role === 'superadmin'
    ? await Admin.find().select('-password').populate('assignedSubjects', 'code title').sort({ createdAt: -1 })
    : [];

  let panelFilter = {};
  if (req.user.role !== 'superadmin') {
    const assignedPanelIds = await getInstructorPanelIds(req);
    panelFilter = {
      $or: [
        { createdBy: req.user._id },
        { _id: { $in: assignedPanelIds } },
      ],
    };
  }

  const panels = await Panel.find(panelFilter).select('-password').sort({ createdAt: -1 });
  const normalizedAccounts = await normalizeLegacyAccountEmails([...admins, ...panels]);
  res.json(normalizedAccounts);
};

exports.toggleActive = async (req, res) => {
  let user = await Admin.findById(req.params.id) || await Panel.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (!(await canManageUser(req, user))) return res.status(403).json({ message: 'You can only manage panel accounts available to your subjects' });
  user.isActive = !user.isActive;
  await user.save();
  res.json({ id: user._id, isActive: user.isActive });
};

exports.resetPassword = async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ message: 'New password required' });
  if (!isStrongPassword(newPassword)) return res.status(400).json({ message: passwordRuleMessage });

  let user = await Admin.findById(req.params.id) || await Panel.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (!(await canManageUser(req, user))) return res.status(403).json({ message: 'You can only manage panel accounts available to your subjects' });

  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password reset successfully' });
};

exports.updateSubjectLimit = async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Only super admin can update instructor subject limits' });
  }

  const val = parseInt(req.body.subjectLimit, 10);
  if (!val || val < 1) {
    return res.status(400).json({ message: 'subjectLimit must be at least 1' });
  }

  const instructor = await Admin.findOne({ _id: req.params.id, role: 'admin' }).select('-password');
  if (!instructor) return res.status(404).json({ message: 'Instructor not found' });

  instructor.subjectLimit = val;
  await instructor.save();
  res.json(instructor);
};

exports.deleteUser = async (req, res) => {
  const user = await Admin.findById(req.params.id) || await Panel.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (!(await canManageUser(req, user))) return res.status(403).json({ message: 'You can only manage panel accounts available to your subjects' });

  await user.deleteOne();
  res.json({ message: 'User deleted' });
};
