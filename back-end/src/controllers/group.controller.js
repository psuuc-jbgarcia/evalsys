const Group = require('../models/Group');
const Section = require('../models/Section');

const getSubjectId = (req) => req.headers['x-subject-id'] || req.query.subject || req.body.subject;
const canAccessSubject = (req, subjectId) => (
  !subjectId ||
  req.user?.role === 'superadmin' ||
  (req.user?.assignedSubjects || []).some((id) => id.toString() === subjectId.toString())
);

exports.createGroup = async (req, res) => {
  const { name, section, members, assignedPanels } = req.body;
  if (!name || !section) return res.status(400).json({ message: 'Name and section required' });
  const sectionDoc = await Section.findById(section);
  if (!sectionDoc) return res.status(404).json({ message: 'Section not found' });
  if (req.user && !canAccessSubject(req, sectionDoc.subject)) {
    return res.status(403).json({ message: 'You are not assigned to this subject' });
  }
  
  // Check for duplication in the same section
  const existing = await Group.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }, section });
  if (existing) {
    return res.status(400).json({ message: `A group with the name "${name}" already exists in this block.` });
  }

  const group = await Group.create({ name, section, members: members || [], assignedPanels: assignedPanels || [] });
  res.status(201).json(group);
};

// Bulk create groups (for CSV import)
exports.bulkCreateGroups = async (req, res) => {
  const { groups } = req.body;
  if (!Array.isArray(groups)) return res.status(400).json({ message: 'Groups array required' });
  const subject = getSubjectId(req);
  if (!subject) return res.status(400).json({ message: 'Subject required' });
  if (!canAccessSubject(req, subject)) return res.status(403).json({ message: 'You are not assigned to this subject' });

  const results = { created: 0, skipped: 0, errors: [] };

  // Cache sections for performance
  const sectionMap = {};
  const allSections = await Section.find({ subject });
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
        members: members ? members.split(';').map(m => m.trim()) : []
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
    const assignedSections = await Section.find({
      assignedPanels: req.user._id,
    }).select('_id');
    const sectionIds = assignedSections.map((s) => s._id);


    // Bypass Mongoose $in array casting edge cases by filtering in memory
    const allGroups = await Group.find()
      .populate('section', 'name block subject')
      .populate('assignedPanels', 'name email')
      .sort({ createdAt: -1 });

    const strSectionIds = sectionIds.map(id => id.toString());
    const panelIdStr = req.user._id.toString();

    const evaluations = await require('../models/Evaluation').find({
      panel: req.user._id,
      isSubmitted: true
    }).select('group');
    const gradedGroupIds = evaluations.map(ev => ev.group.toString());

    const groups = allGroups.filter(g => {
      const gSecId = g.section ? g.section._id.toString() : null;
      const isInSection = gSecId && strSectionIds.includes(gSecId);
      
      const gPanels = g.assignedPanels || [];
      const isAssignedDirectly = gPanels.some(p => (p._id || p).toString() === panelIdStr);
      
      return isInSection || isAssignedDirectly;
    }).map(g => {
      const gObj = g.toObject();
      gObj.isGraded = gradedGroupIds.includes(g._id.toString());
      return gObj;
    });
      
    return res.json(groups);
  }

  if (subject) {
    if (!canAccessSubject(req, subject)) return res.status(403).json({ message: 'You are not assigned to this subject' });
    const subjectSections = await Section.find({ subject }).select('_id');
    filter.section = req.query.section || { $in: subjectSections.map((s) => s._id) };
  } else if (req.user.role === 'admin') {
    const subjectSections = await Section.find({ subject: { $in: req.user.assignedSubjects || [] } }).select('_id');
    filter.section = req.query.section || { $in: subjectSections.map((s) => s._id) };
  }

  const groups = await Group.find(filter)
    .populate('section', 'name block subject')
    .populate('assignedPanels', 'name email')
    .sort({ createdAt: -1 });
  res.json(groups);
};

exports.getGroup = async (req, res) => {
  const group = await Group.findById(req.params.id)
    .populate('section', 'name block subject')
    .populate('assignedPanels', 'name email');
  if (!group) return res.status(404).json({ message: 'Group not found' });
  if (req.user.role !== 'panel' && !canAccessSubject(req, group.section?.subject)) {
    return res.status(403).json({ message: 'You are not assigned to this subject' });
  }
  res.json(group);
};

exports.updateGroup = async (req, res) => {
  const { name, section } = req.body;
  
  if (name || section) {
    const current = await Group.findById(req.params.id);
    const currentSection = await Section.findById(section || current.section);
    if (!canAccessSubject(req, currentSection?.subject)) {
      return res.status(403).json({ message: 'You are not assigned to this subject' });
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

  const group = await Group.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!group) return res.status(404).json({ message: 'Group not found' });
  res.json(group);
};

exports.deleteGroup = async (req, res) => {
  const group = await Group.findById(req.params.id).populate('section', 'subject');
  if (!group) return res.status(404).json({ message: 'Group not found' });
  if (!canAccessSubject(req, group.section?.subject)) return res.status(403).json({ message: 'You are not assigned to this subject' });
  await group.deleteOne();
  res.json({ message: 'Group deleted' });
};
