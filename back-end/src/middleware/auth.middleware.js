const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Panel = require('../models/Panel');

const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ message: 'No token provided' });

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Look up in correct collection based on role in token
    let user;
    if (decoded.role === 'admin' || decoded.role === 'superadmin') {
      user = await Admin.findById(decoded.id).select('-password');
    } else {
      user = await Panel.findById(decoded.id).select('-password');
    }

    if (!user || !user.isActive)
      return res.status(401).json({ message: 'Account inactive or not found' });

    req.user = user;
    const passwordChangeAllowed = [
      '/api/auth/me',
      '/api/auth/change-password',
    ].includes(req.originalUrl.split('?')[0]);
    if (user.mustChangePassword && !passwordChangeAllowed) {
      return res.status(403).json({
        message: 'You must change your temporary password before continuing',
        mustChangePassword: true,
      });
    }
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (!['admin', 'superadmin'].includes(req.user?.role))
    return res.status(403).json({ message: 'Admin access required' });
  next();
};

const instructorOnly = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ message: 'Instructor access required' });
  next();
};

const instructorOrPanelOnly = (req, res, next) => {
  if (!['admin', 'panel'].includes(req.user?.role))
    return res.status(403).json({ message: 'Instructor or panel access required' });
  next();
};

const superadminInstructorContext = async (req, res, next) => {
  if (req.user?.role !== 'superadmin') return next();

  const instructorId = req.headers['x-instructor-id'];
  if (!instructorId) {
    return res.status(400).json({ message: 'Select an instructor before managing operational data' });
  }

  const instructor = await Admin.findOne({ _id: instructorId, role: 'admin', isActive: true }).select('assignedSubjects');
  if (!instructor) return res.status(400).json({ message: 'Selected instructor is invalid or inactive' });

  const subjectId = req.headers['x-subject-id'] || req.query.subject || req.body?.subject;
  if (!subjectId) return res.status(400).json({ message: 'Select a subject before managing operational data' });

  const assigned = (instructor.assignedSubjects || []).some((id) => id.toString() === subjectId.toString());
  if (!assigned) return res.status(403).json({ message: 'Selected subject does not belong to the selected instructor' });

  req.instructorContext = instructor;
  next();
};

const superadminOnly = (req, res, next) => {
  if (req.user?.role !== 'superadmin')
    return res.status(403).json({ message: 'Super admin access required' });
  next();
};

const panelOnly = (req, res, next) => {
  if (req.user?.role !== 'panel')
    return res.status(403).json({ message: 'Panel access required' });
  next();
};

module.exports = {
  protect,
  adminOnly,
  instructorOnly,
  instructorOrPanelOnly,
  panelOnly,
  superadminOnly,
  superadminInstructorContext,
};
