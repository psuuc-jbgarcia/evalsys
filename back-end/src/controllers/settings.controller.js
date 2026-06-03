const Settings = require('../models/Settings');

exports.getSettings = async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({ isGradingLocked: false, isCsvExportLocked: false });
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
