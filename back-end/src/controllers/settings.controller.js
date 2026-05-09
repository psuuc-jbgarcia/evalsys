const Settings = require('../models/Settings');

exports.getSettings = async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({ isGradingLocked: false });
  }
  res.json(settings);
};

exports.toggleGradingLock = async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({ isGradingLocked: false });
  }
  settings.isGradingLocked = !settings.isGradingLocked;
  await settings.save();
  res.json(settings);
};
