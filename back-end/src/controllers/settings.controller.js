const Settings = require('../models/Settings');
const { recordAuditLog } = require('../services/audit.service');

const getOrCreateSettings = async () => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({
      isGradingLocked: false,
      isCsvExportLocked: false,
      isMaintenanceMode: false,
    });
  }
  return settings;
};

exports.getSettings = async (req, res) => {
  const settings = await getOrCreateSettings();
  res.json(settings);
};

exports.getPublicSettings = async (_req, res) => {
  const settings = await getOrCreateSettings();
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.json({
    isMaintenanceMode: settings.isMaintenanceMode,
    maintenanceMessage: settings.maintenanceMessage,
    announcement: settings.announcement,
  });
};

exports.toggleGradingLock = async (req, res) => {
  const settings = await getOrCreateSettings();
  settings.isGradingLocked = !settings.isGradingLocked;
  await settings.save();
  res.json(settings);
};

exports.toggleCsvExportLock = async (req, res) => {
  const settings = await getOrCreateSettings();
  settings.isCsvExportLocked = !settings.isCsvExportLocked;
  await settings.save();
  res.json(settings);
};

exports.updateSystemControls = async (req, res) => {
  const settings = await getOrCreateSettings();
  const {
    isMaintenanceMode,
    maintenanceMessage,
    announcement,
  } = req.body;

  if (typeof isMaintenanceMode === 'boolean') {
    settings.isMaintenanceMode = isMaintenanceMode;
  }

  if (typeof maintenanceMessage === 'string') {
    settings.maintenanceMessage = maintenanceMessage.trim() || 'EvalSys is temporarily unavailable while maintenance is in progress.';
  }

  if (announcement && typeof announcement === 'object') {
    settings.announcement = {
      isActive: Boolean(announcement.isActive),
      title: String(announcement.title || '').trim(),
      message: String(announcement.message || '').trim(),
      updatedAt: new Date(),
    };
  }

  await settings.save();
  await recordAuditLog(req, {
    action: 'settings.system_control_updated',
    entity: { type: 'settings', id: settings._id, name: 'System Control' },
    metadata: {
      isMaintenanceMode: settings.isMaintenanceMode,
      announcementActive: settings.announcement?.isActive,
    },
  });

  res.json(settings);
};

module.exports.getOrCreateSettings = getOrCreateSettings;
