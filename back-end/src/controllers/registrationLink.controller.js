const RegistrationLink = require('../models/RegistrationLink');
const Subject = require('../models/Subject');
const Section = require('../models/Section');
const Group = require('../models/Group');

const getSubjectId = (req) => req.headers['x-subject-id'] || req.query.subject || req.body.subject;
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const canAccessSubject = (req, subjectId) => (
  !subjectId ||
  req.user?.role === 'superadmin' ||
  (req.user?.assignedSubjects || []).some((id) => id.toString() === subjectId.toString())
);

const findUsableLink = async (token) => {
  const link = await RegistrationLink.findOne({ token, isActive: true })
    .populate('subject', 'code title isActive')
    .populate('sections', 'name block subject')
    .populate('createdBy', 'name email');

  if (!link) return { error: 'Registration link is invalid or closed' };
  if (link.expiresAt.getTime() <= Date.now()) return { error: 'Registration link has expired' };
  if (!link.subject?.isActive) return { error: 'Subject is not accepting registration' };
  return { link };
};

exports.getRegistrationLinks = async (req, res) => {
  const subject = getSubjectId(req);
  const filter = {};
  if (subject) {
    if (!canAccessSubject(req, subject)) return res.status(403).json({ message: 'You are not assigned to this subject' });
    filter.subject = subject;
  } else if (req.user.role === 'admin') {
    filter.subject = { $in: req.user.assignedSubjects || [] };
  }

  const links = await RegistrationLink.find(filter)
    .populate('subject', 'code title')
    .populate('sections', 'block')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.json(links);
};

exports.createRegistrationLink = async (req, res) => {
  const subject = req.body.subject || getSubjectId(req);
  const { sections = [], expiresAt } = req.body;
  if (!subject) return res.status(400).json({ message: 'Subject required' });
  if (!expiresAt) return res.status(400).json({ message: 'Expiration date required' });
  if (!canAccessSubject(req, subject)) return res.status(403).json({ message: 'You are not assigned to this subject' });

  const expiresDate = new Date(expiresAt);
  if (Number.isNaN(expiresDate.getTime()) || expiresDate.getTime() <= Date.now()) {
    return res.status(400).json({ message: 'Expiration must be a future date/time' });
  }

  const subjectDoc = await Subject.findById(subject);
  if (!subjectDoc) return res.status(404).json({ message: 'Subject not found' });

  const uniqueSections = [...new Set(sections.filter(Boolean).map((id) => id.toString()))];
  if (uniqueSections.length) {
    const validCount = await Section.countDocuments({ _id: { $in: uniqueSections }, subject });
    if (validCount !== uniqueSections.length) {
      return res.status(400).json({ message: 'All selected blocks must belong to the selected subject' });
    }
  }

  const link = await RegistrationLink.create({
    subject,
    sections: uniqueSections,
    expiresAt: expiresDate,
    createdBy: req.user._id,
  });

  const populated = await RegistrationLink.findById(link._id)
    .populate('subject', 'code title')
    .populate('sections', 'block')
    .populate('createdBy', 'name email');

  res.status(201).json(populated);
};

exports.updateRegistrationLink = async (req, res) => {
  const link = await RegistrationLink.findById(req.params.id);
  if (!link) return res.status(404).json({ message: 'Registration link not found' });
  if (!canAccessSubject(req, link.subject)) return res.status(403).json({ message: 'You are not assigned to this subject' });

  if (typeof req.body.isActive === 'boolean') link.isActive = req.body.isActive;
  if (req.body.expiresAt) {
    const expiresDate = new Date(req.body.expiresAt);
    if (Number.isNaN(expiresDate.getTime())) return res.status(400).json({ message: 'Invalid expiration date' });
    link.expiresAt = expiresDate;
  }
  await link.save();

  const populated = await RegistrationLink.findById(link._id)
    .populate('subject', 'code title')
    .populate('sections', 'block')
    .populate('createdBy', 'name email');

  res.json(populated);
};

exports.getPublicRegistrationLink = async (req, res) => {
  const { link, error } = await findUsableLink(req.params.token);
  if (error) return res.status(403).json({ message: error });

  const allowedSectionIds = (link.sections || []).map((section) => section._id.toString());
  const sectionFilter = allowedSectionIds.length
    ? { _id: { $in: allowedSectionIds } }
    : { subject: link.subject._id };

  const sections = await Section.find(sectionFilter)
    .select('name block subject')
    .populate('subject', 'code title')
    .sort({ block: 1 });

  res.json({
    token: link.token,
    subject: link.subject,
    sections,
    expiresAt: link.expiresAt,
    createdBy: link.createdBy,
  });
};

exports.registerGroupWithLink = async (req, res) => {
  const { link, error } = await findUsableLink(req.params.token);
  if (error) return res.status(403).json({ message: error });

  const { name, section, members } = req.body;
  if (!name || !section) return res.status(400).json({ message: 'Name and section required' });

  const sectionDoc = await Section.findById(section);
  if (!sectionDoc) return res.status(404).json({ message: 'Section not found' });
  if (sectionDoc.subject.toString() !== link.subject._id.toString()) {
    return res.status(400).json({ message: 'Selected block does not belong to this registration subject' });
  }

  const allowedSectionIds = (link.sections || []).map((s) => s._id.toString());
  if (allowedSectionIds.length && !allowedSectionIds.includes(sectionDoc._id.toString())) {
    return res.status(400).json({ message: 'Selected block is not allowed for this registration link' });
  }

  const existing = await Group.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') },
    section,
  });
  if (existing) {
    return res.status(400).json({ message: `A group with the name "${name}" already exists in this block.` });
  }

  const group = await Group.create({
    name,
    section,
    members: members || [],
  });

  res.status(201).json(group);
};
