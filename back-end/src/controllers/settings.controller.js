const Settings = require('../models/Settings');
const { recordAuditLog } = require('../services/audit.service');

const ALLOWED_MAINTENANCE_DELAYS = [0, 5, 15, 30];

const isMaintenanceActive = (settings) => Boolean(
  settings.isMaintenanceMode
  || (settings.maintenanceStartsAt && settings.maintenanceStartsAt.getTime() <= Date.now())
);

const maintenanceResponse = (settings) => ({
  ...settings.toObject(),
  isMaintenanceMode: isMaintenanceActive(settings),
});

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
  res.json(maintenanceResponse(settings));
};

exports.getPublicSettings = async (_req, res) => {
  const settings = await getOrCreateSettings();
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.json({
    isMaintenanceMode: isMaintenanceActive(settings),
    maintenanceStartsAt: settings.maintenanceStartsAt,
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
    maintenanceDelayMinutes,
    maintenanceMessage,
    announcement,
  } = req.body;

  if (typeof isMaintenanceMode === 'boolean') {
    if (!isMaintenanceMode) {
      settings.isMaintenanceMode = false;
      settings.maintenanceStartsAt = null;
    } else {
      const requestedDelay = Number(maintenanceDelayMinutes ?? 0);
      if (!ALLOWED_MAINTENANCE_DELAYS.includes(requestedDelay)) {
        return res.status(400).json({ message: 'Maintenance delay must be 0, 5, 15, or 30 minutes.' });
      }
      settings.isMaintenanceMode = requestedDelay === 0;
      settings.maintenanceStartsAt = requestedDelay === 0
        ? new Date()
        : new Date(Date.now() + requestedDelay * 60 * 1000);
    }
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
      maintenanceStartsAt: settings.maintenanceStartsAt,
      maintenanceDelayMinutes: typeof maintenanceDelayMinutes === 'number' ? maintenanceDelayMinutes : undefined,
      announcementActive: settings.announcement?.isActive,
    },
  });

  res.json(maintenanceResponse(settings));
};

module.exports.getOrCreateSettings = getOrCreateSettings;
