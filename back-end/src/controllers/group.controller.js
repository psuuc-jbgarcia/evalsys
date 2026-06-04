const Group = require('../models/Group');
const Section = require('../models/Section');
const Admin = require('../models/Admin');
const Panel = require('../models/Panel');
const Evaluation = require('../models/Evaluation');

const getSubjectId = (req) => req.headers['x-subject-id'] || req.query.subject || req.body.subject;
const getOwnerId = (req) => req.user?.role === 'superadmin'
  ? req.instructorContext?._id
  : req.user?._id;
const canAccessSubject = (req, subjectId) => (
  !subjectId ||
  req.user?.role === 'superadmin' ||
  (req.user?.assignedSubjects || []).some((id) => id.toString() === subjectId.toString())
);

const normalizeMembers = (members) => {
  if (Array.isArray(members)) {
    return members
      .map((member) => {
        if (typeof member === 'string') return member.trim();
        return {
          lastName: String(member?.lastName || '').trim(),
          firstName: String(member?.firstName || '').trim(),
          middleName: String(member?.middleName || '').trim(),
        };
      })
      .filter((member) => {
        if (typeof member === 'string') return Boolean(member);
        return Boolean(member.lastName || member.firstName || member.middleName);
      });
  }

  if (typeof members === 'string') {
    return members.split(';').map((member) => member.trim()).filter(Boolean);
  }

  return [];
};

const validatePanelAssignments = async (req, panelIds = [], subject) => {
  if (!Array.isArray(panelIds) || !panelIds.length) return null;

  const uniquePanelIds = [...new Set(panelIds.map((id) => id.toString()))];
  const panels = await Panel.find({ _id: { $in: uniquePanelIds }, isActive: true }).select('name createdBy');
  if (panels.length !== uniquePanelIds.length) {
    return 'One or more selected panels are inactive or missing';
  }

  for (const panel of panels) {
    const ownerId = getOwnerId(req);
    if (!panel.createdBy) {
      return `${panel.name} is old data without an instructor owner`;
    }
    if (!ownerId || panel.createdBy.toString() !== ownerId.toString()) {
      return `${panel.name} belongs to another instructor`;
    }

    const owner = await Admin.findOne({
      _id: panel.createdBy,
      role: 'admin',
      isActive: true,
      assignedSubjects: subject,
    }).select('_id');
    if (!owner) return `${panel.name}'s instructor is not assigned to this subject`;
  }

  return null;
};

exports.createGroup = async (req, res) => {
  const { name, section, members, assignedPanels } = req.body;
  if (!name || !section) return res.status(400).json({ message: 'Name and section required' });
  const sectionDoc = await Section.findById(section);
  if (!sectionDoc) return res.status(404).json({ message: 'Section not found' });
  const selectedSubject = getSubjectId(req);
  if (selectedSubject && sectionDoc.subject?.toString() !== selectedSubject.toString()) {
    return res.status(400).json({ message: 'Selected block does not belong to the current subject' });
  }
  if (req.user && !canAccessSubject(req, sectionDoc.subject)) {
    return res.status(403).json({ message: 'You are not assigned to this subject' });
  }
  const ownerId = getOwnerId(req);
  if (!sectionDoc.createdBy || sectionDoc.createdBy.toString() !== ownerId?.toString()) {
    return res.status(403).json({ message: 'Selected block does not belong to the current instructor' });
  }
  const assignmentError = await validatePanelAssignments(req, assignedPanels, sectionDoc.subject);
  if (assignmentError) return res.status(400).json({ message: assignmentError });
  
  // Check for duplication in the same section
  const existing = await Group.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }, section });
  if (existing) {
    return res.status(400).json({ message: `A group with the name "${name}" already exists in this block.` });
  }

  const group = await Group.create({
    name,
    section,
    createdBy: ownerId,
    members: members || [],
    assignedPanels: assignedPanels || [],
  });
  res.status(201).json(group);
};

// Bulk create groups (for CSV import)
exports.bulkCreateGroups = async (req, res) => {
  const { groups } = req.body;
  if (!Array.isArray(groups)) return res.status(400).json({ message: 'Groups array required' });
  const subject = getSubjectId(req);
  const ownerId = getOwnerId(req);
  if (!subject) return res.status(400).json({ message: 'Subject required' });
  if (!canAccessSubject(req, subject)) return res.status(403).json({ message: 'You are not assigned to this subject' });

  const results = { created: 0, skipped: 0, errors: [] };

  // Cache sections for performance
  const sectionMap = {};
  const allSections = await Section.find({ subject, createdBy: ownerId });
  allSections.forEach(s => {
    sectionMap[s.block.toLowerCase()] = s._id;
  });

  for (const g of groups) {
    try {
      const { name, block, members } = g;
      if (!name || !block) {
        results.skipped++;
        continue;
      }

      const sectionId = sectionMap[block.toLowerCase()];
      if (!sectionId) {
        results.errors.push(`Section block "${block}" not found for group "${name}"`);
        results.skipped++;
        continue;
      }

      // Check if group already exists in that section
      const exists = await Group.findOne({ name, section: sectionId });
      if (exists) {
        results.skipped++;
        continue;
      }

      await Group.create({
        name,
        section: sectionId,
        createdBy: ownerId,
        members: normalizeMembers(members)
      });
      results.created++;
    } catch (err) {
      results.errors.push(err.message);
    }
  }

  res.json(results);
};

exports.getGroups = async (req, res) => {
  const filter = req.query.section ? { section: req.query.section } : {};
  const subject = getSubjectId(req);

  // If the user is a panel, only return groups from sections they are assigned to
  if (req.user.role === 'panel') {
    const sectionFilter = {
      assignedPanels: req.user._id,
    };
    let allowedSubjectIds = [];

    if (req.user.createdBy) {
      const instructor = await Admin.findOne({ _id: req.user.createdBy, role: 'admin', isActive: true }).select('assignedSubjects');
      if (!instructor) return res.json([]);
      allowedSubjectIds = (instructor.assignedSubjects || []).map((id) => id.toString());
      sectionFilter.subject = { $in: instructor.assignedSubjects || [] };
      sectionFilter.createdBy = req.user.createdBy;
    }

    const assignedSections = await Section.find(sectionFilter).select('_id subject');
    const sectionIds = assignedSections.map((s) => s._id);


    // Bypass Mongoose $in array casting edge cases by filtering in memory
    const allGroups = await Group.find(req.user.createdBy ? { createdBy: req.user.createdBy } : {})
      .populate({
        path: 'section',
        select: 'name block subject',
        populate: { path: 'subject', select: 'code title' },
      })
      .populate('assignedPanels', 'name email')
      .sort({ createdAt: -1 });

    const strSectionIds = sectionIds.map(id => id.toString());
    const panelIdStr = req.user._id.toString();

    const evaluations = await require('../models/Evaluation').find({
      panel: req.user._id,
      isSubmitted: true,
      isLegacyArchived: { $ne: true },
    }).select('group');
    const gradedGroupIds = evaluations.map(ev => ev.group.toString());

    const groups = allGroups.filter(g => {
      const gSecId = g.section ? g.section._id.toString() : null;
      const isInSection = gSecId && strSectionIds.includes(gSecId);
      const gSubjectId = g.section?.subject?._id?.toString() || g.section?.subject?.toString();
      const isOwnedSubject = !req.user.createdBy || (gSubjectId && allowedSubjectIds.includes(gSubjectId));
      
      const gPanels = g.assignedPanels || [];
      const isAssignedDirectly = gPanels.some(p => (p._id || p).toString() === panelIdStr);
      
      return isOwnedSubject && (isInSection || isAssignedDirectly);
    }).map(g => {
      const gObj = g.toObject();
      gObj.isGraded = gradedGroupIds.includes(g._id.toString());
      return gObj;
    });
      
    return res.json(groups);
  }

  if (subject) {
    if (!canAccessSubject(req, subject)) return res.status(403).json({ message: 'You are not assigned to this subject' });
    const ownerId = getOwnerId(req);
    const subjectSections = await Section.find({ subject, createdBy: ownerId }).select('_id');
    filter.section = req.query.section || { $in: subjectSections.map((s) => s._id) };
    filter.createdBy = ownerId;
  } else if (req.user.role === 'admin') {
    const subjectSections = await Section.find({
      subject: { $in: req.user.assignedSubjects || [] },
      createdBy: req.user._id,
    }).select('_id');
    filter.section = req.query.section || { $in: subjectSections.map((s) => s._id) };
    filter.createdBy = req.user._id;
  }

  const groups = await Group.find(filter)
    .populate({
      path: 'section',
      select: 'name block subject assignedPanels',
      populate: { path: 'subject', select: 'code title' },
    })
    .populate('assignedPanels', 'name email')
    .sort({ createdAt: -1 });
  res.json(groups);
};

exports.getGroup = async (req, res) => {
  const group = await Group.findById(req.params.id)
    .populate({
      path: 'section',
      select: 'name block subject assignedPanels',
      populate: { path: 'subject', select: 'code title' },
    })
    .populate('assignedPanels', 'name email');
  if (!group) return res.status(404).json({ message: 'Group not found' });
  const selectedSubject = getSubjectId(req);
  const groupSubjectId = group.section?.subject?._id || group.section?.subject;
  if (req.user.role !== 'panel' && selectedSubject && groupSubjectId?.toString() !== selectedSubject.toString()) {
    return res.status(403).json({ message: 'This group does not belong to the current subject' });
  }
  if (
    req.user.role !== 'panel' &&
    (!group.createdBy || group.createdBy.toString() !== getOwnerId(req)?.toString())
  ) {
    return res.status(403).json({ message: 'This group does not belong to the current instructor' });
  }
  if (req.user.role !== 'panel' && !canAccessSubject(req, group.section?.subject)) {
    return res.status(403).json({ message: 'You are not assigned to this subject' });
  }
  if (req.user.role === 'panel' && req.user.createdBy) {
    const groupSubjectId = group.section?.subject?._id || group.section?.subject;
    const instructor = await Admin.findOne({
      _id: req.user.createdBy,
      role: 'admin',
      isActive: true,
      assignedSubjects: groupSubjectId,
    }).select('_id');
    if (!instructor) {
      return res.status(403).json({ message: 'This group belongs to another instructor subject' });
    }
  }
  if (req.user.role === 'panel') {
    const isSectionAssigned = (group.section?.assignedPanels || []).some(
      (panelId) => panelId.toString() === req.user._id.toString()
    );
    const isGroupAssigned = (group.assignedPanels || []).some(
      (panelId) => panelId.toString() === req.user._id.toString()
    );
    if (!isSectionAssigned && !isGroupAssigned) {
      return res.status(403).json({ message: 'You are not assigned to this group' });
    }
  }
  res.json(group);
};

exports.updateGroup = async (req, res) => {
  const { name, section } = req.body;
  const current = await Group.findById(req.params.id);
  if (!current) return res.status(404).json({ message: 'Group not found' });
  if (!current.createdBy || current.createdBy.toString() !== getOwnerId(req)?.toString()) {
    return res.status(403).json({ message: 'This group does not belong to the current instructor' });
  }
  
  if (name || section) {
    const currentSection = await Section.findById(section || current.section);
    const selectedSubject = getSubjectId(req);
    if (selectedSubject && currentSection?.subject?.toString() !== selectedSubject.toString()) {
      return res.status(400).json({ message: 'Selected block does not belong to the current subject' });
    }
    if (!canAccessSubject(req, currentSection?.subject)) {
      return res.status(403).json({ message: 'You are not assigned to this subject' });
    }
    if (!currentSection?.createdBy || currentSection.createdBy.toString() !== getOwnerId(req)?.toString()) {
      return res.status(403).json({ message: 'Selected block does not belong to the current instructor' });
    }
    const checkName = name || current.name;
    const checkSection = section || current.section;
    
    const existing = await Group.findOne({ 
      _id: { $ne: req.params.id }, 
      name: { $regex: new RegExp(`^${checkName}$`, 'i') }, 
      section: checkSection 
    });
    
    if (existing) {
      return res.status(400).json({ message: `Another group with the name "${checkName}" already exists in this block.` });
    }
  }

  if (req.body.assignedPanels) {
    const currentSection = await Section.findById(section || current.section);
    const assignmentError = await validatePanelAssignments(req, req.body.assignedPanels, currentSection?.subject);
    if (assignmentError) return res.status(400).json({ message: assignmentError });
  }

  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.section !== undefined) updates.section = req.body.section;
  if (req.body.members !== undefined) updates.members = req.body.members;
  if (req.body.assignedPanels !== undefined) updates.assignedPanels = req.body.assignedPanels;
  const group = await Group.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!group) return res.status(404).json({ message: 'Group not found' });
  res.json(group);
};

exports.deleteGroup = async (req, res) => {
  const group = await Group.findById(req.params.id).populate('section', 'subject');
  if (!group) return res.status(404).json({ message: 'Group not found' });
  if (!group.createdBy || group.createdBy.toString() !== getOwnerId(req)?.toString()) {
    return res.status(403).json({ message: 'This group does not belong to the current instructor' });
  }
  const selectedSubject = getSubjectId(req);
  if (selectedSubject && group.section?.subject?.toString() !== selectedSubject.toString()) {
    return res.status(403).json({ message: 'This group does not belong to the current subject' });
  }
  if (!canAccessSubject(req, group.section?.subject)) return res.status(403).json({ message: 'You are not assigned to this subject' });
  const deletedEvaluations = await Evaluation.deleteMany({ group: group._id });
  await group.deleteOne();
  res.json({
    message: 'Group and its evaluations deleted',
    deletedEvaluations: deletedEvaluations.deletedCount,
  });
};
