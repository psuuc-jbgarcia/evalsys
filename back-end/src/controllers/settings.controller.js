const Settings = require('../models/Settings');

exports.getSettings = async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({ isGradingLocked: false, maxSubjectsPerInstructor: 1, isCsvExportLocked: false });
  }
  res.json(settings);
};

exports.toggleGradingLock = async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});
  settings.isGradingLocked = !settings.isGradingLocked;
  await settings.save();
  res.json(settings);
};

exports.toggleCsvExportLock = async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});
  settings.isCsvExportLocked = !settings.isCsvExportLocked;
  await settings.save();
  res.json(settings);
};

exports.updateMaxSubjects = async (req, res) => {
  const { maxSubjectsPerInstructor } = req.body;
  const val = parseInt(maxSubjectsPerInstructor, 10);
  if (!val || val < 1) {
    return res.status(400).json({ message: 'maxSubjectsPerInstructor must be at least 1' });
  }
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});
  settings.maxSubjectsPerInstructor = val;
  await settings.save();
  res.json(settings);
};
