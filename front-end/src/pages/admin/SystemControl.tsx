import { useEffect, useState } from 'react';
import api from '../../services/api';
import { notify } from '../../utils/notify';

interface SystemSettings {
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  announcement?: {
    isActive?: boolean;
    title?: string;
    message?: string;
    updatedAt?: string;
  };
}

interface ConfirmAction {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}

const defaultSettings: SystemSettings = {
  isMaintenanceMode: false,
  maintenanceMessage: 'EvalSys is temporarily unavailable while maintenance is in progress.',
  announcement: {
    isActive: false,
    title: '',
    message: '',
  },
};

export default function SystemControl() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      setSettings({
        isMaintenanceMode: Boolean(res.data.isMaintenanceMode),
        maintenanceMessage: res.data.maintenanceMessage || defaultSettings.maintenanceMessage,
        announcement: {
          isActive: Boolean(res.data.announcement?.isActive),
          title: res.data.announcement?.title || '',
          message: res.data.announcement?.message || '',
          updatedAt: res.data.announcement?.updatedAt,
        },
      });
    } catch (err: any) {
      notify(err.response?.data?.message || 'Failed to load system controls', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateSettings = async (next: SystemSettings, successMessage: string) => {
    setSaving(true);
    try {
      const res = await api.patch('/settings/system-controls', next);
      setSettings({
        isMaintenanceMode: Boolean(res.data.isMaintenanceMode),
        maintenanceMessage: res.data.maintenanceMessage || defaultSettings.maintenanceMessage,
        announcement: {
          isActive: Boolean(res.data.announcement?.isActive),
          title: res.data.announcement?.title || '',
          message: res.data.announcement?.message || '',
          updatedAt: res.data.announcement?.updatedAt,
        },
      });
      notify(successMessage, { type: 'success' });
    } catch (err: any) {
      notify(err.response?.data?.message || 'Failed to update system controls', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const applyAnnouncement = () => {
    const title = settings.announcement?.title?.trim() || '';
    const message = settings.announcement?.message?.trim() || '';
    updateSettings({
      ...settings,
      announcement: {
        isActive: Boolean(settings.announcement?.isActive),
        title,
        message,
      },
    }, settings.announcement?.isActive ? 'Announcement published' : 'Announcement saved');
  };

  const saveAnnouncement = () => {
    const title = settings.announcement?.title?.trim() || '';
    const message = settings.announcement?.message?.trim() || '';
    const willPublish = Boolean(settings.announcement?.isActive);
    if (willPublish && (!title || !message)) {
      notify('Add an announcement title and message before publishing.', { type: 'error' });
      return;
    }
    setConfirmAction({
      title: willPublish ? 'Publish Announcement?' : 'Save Announcement as Hidden?',
      message: willPublish
        ? 'This notice will be shown to all instructors and panels.'
        : 'This saves the announcement content, but users will not see it until you publish it.',
      confirmLabel: willPublish ? 'Publish Announcement' : 'Save Hidden',
      onConfirm: applyAnnouncement,
    });
  };

  const applyClearAnnouncement = () => {
    updateSettings({
      ...settings,
      announcement: { isActive: false, title: '', message: '' },
    }, 'Announcement cleared');
  };

  const clearAnnouncement = () => {
    setConfirmAction({
      title: 'Clear Announcement?',
      message: 'This removes the current announcement title and message for instructors and panels.',
      confirmLabel: 'Clear Announcement',
      danger: true,
      onConfirm: applyClearAnnouncement,
    });
  };

  const applyToggleMaintenance = () => {
    const nextEnabled = !settings.isMaintenanceMode;
    const message = settings.maintenanceMessage.trim() || defaultSettings.maintenanceMessage;
    updateSettings({
      ...settings,
      isMaintenanceMode: nextEnabled,
      maintenanceMessage: message,
    }, nextEnabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled');
  };

  const toggleMaintenance = () => {
    const nextEnabled = !settings.isMaintenanceMode;
    setConfirmAction({
      title: nextEnabled ? 'Enable Maintenance Mode?' : 'Disable Maintenance Mode?',
      message: nextEnabled
        ? 'Instructors and panels will be blocked from logging in and saving actions until you disable maintenance mode.'
        : 'Instructors and panels will be able to use EvalSys again.',
      confirmLabel: nextEnabled ? 'Enable Maintenance' : 'Disable Maintenance',
      danger: nextEnabled,
      onConfirm: applyToggleMaintenance,
    });
  };

  const confirmSelectedAction = () => {
    const action = confirmAction;
    if (!action) return;
    setConfirmAction(null);
    action.onConfirm();
  };

  if (loading) {
    return (
      <div>
        <h2 className="evl-page-title mb-2">System Control</h2>
        <p className="evl-page-subtitle mb-6">Manage platform-wide notices and maintenance access.</p>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="h-72 rounded-xl bg-surface border border-muted/30 animate-pulse" />
          <div className="h-72 rounded-xl bg-surface border border-muted/30 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="evl-page-title mb-2">System Control</h2>
        <p className="evl-page-subtitle">Show announcements to instructors and panels, or pause access during updates.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <section className="evl-card p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-primary mb-1">System Announcement</p>
              <h3 className="text-xl font-black text-text">Notice for instructors and panels</h3>
              <p className="text-sm text-text/70 mt-1">Use this for reminders, deadlines, or temporary instructions.</p>
            </div>
            <span className={settings.announcement?.isActive ? 'evl-badge-success' : 'evl-badge-primary'}>
              {settings.announcement?.isActive ? 'Visible' : 'Hidden'}
            </span>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm font-bold text-text">
              <input
                type="checkbox"
                checked={Boolean(settings.announcement?.isActive)}
                onChange={(e) => setSettings((current) => ({
                  ...current,
                  announcement: { ...current.announcement, isActive: e.target.checked },
                }))}
                className="w-4 h-4 accent-primary"
              />
              Publish announcement
            </label>

            <div>
              <label className="evl-label">Title</label>
              <input
                value={settings.announcement?.title || ''}
                onChange={(e) => setSettings((current) => ({
                  ...current,
                  announcement: { ...current.announcement, title: e.target.value },
                }))}
                className="evl-input"
                placeholder="e.g. Final grading reminder"
                maxLength={80}
              />
            </div>

            <div>
              <label className="evl-label">Message</label>
              <textarea
                value={settings.announcement?.message || ''}
                onChange={(e) => setSettings((current) => ({
                  ...current,
                  announcement: { ...current.announcement, message: e.target.value },
                }))}
                className="evl-input min-h-[130px] resize-y"
                placeholder="Write the notice instructors and panels should see."
                maxLength={500}
              />
              <p className="text-xs text-text/60 mt-2">{settings.announcement?.message?.length || 0}/500 characters</p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button disabled={saving} onClick={saveAnnouncement} className="evl-btn-primary">
                Save Announcement
              </button>
              <button disabled={saving} onClick={clearAnnouncement} className="evl-btn-ghost">
                Clear
              </button>
            </div>
          </div>
        </section>

        <section className={`evl-card p-6 ${settings.isMaintenanceMode ? 'border-red-200 bg-red-50/60' : ''}`}>
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-red-500 mb-1">Maintenance Mode</p>
              <h3 className="text-xl font-black text-text">Pause instructor and panel access</h3>
              <p className="text-sm text-text/70 mt-1">Super Admin can still sign in and manage this page.</p>
            </div>
            <span className={settings.isMaintenanceMode ? 'evl-badge-danger' : 'evl-badge-success'}>
              {settings.isMaintenanceMode ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          <div className="space-y-4">
            <div className={settings.isMaintenanceMode ? 'evl-alert-error' : 'evl-alert-info'}>
              {settings.isMaintenanceMode
                ? 'Instructors and panels cannot log in or save actions while maintenance mode is enabled.'
                : 'System is open. Instructors and panels can use EvalSys normally.'}
            </div>

            <div>
              <label className="evl-label">Maintenance Message</label>
              <textarea
                value={settings.maintenanceMessage}
                onChange={(e) => setSettings((current) => ({ ...current, maintenanceMessage: e.target.value }))}
                className="evl-input min-h-[120px] resize-y"
                placeholder={defaultSettings.maintenanceMessage}
                maxLength={250}
              />
              <p className="text-xs text-text/60 mt-2">{settings.maintenanceMessage.length}/250 characters</p>
            </div>

            <button
              disabled={saving}
              onClick={toggleMaintenance}
              className={settings.isMaintenanceMode ? 'evl-btn-primary' : 'evl-btn-danger'}
            >
              {settings.isMaintenanceMode ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
            </button>
          </div>
        </section>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-[100] bg-dark/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md evl-card p-6 shadow-2xl">
            <p className={`text-xs font-black uppercase tracking-widest mb-2 ${confirmAction.danger ? 'text-danger' : 'text-primary'}`}>
              Confirm Action
            </p>
            <h3 className="text-xl font-black text-text">{confirmAction.title}</h3>
            <p className="text-sm text-text/70 mt-3 leading-relaxed">{confirmAction.message}</p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={saving}
                className="evl-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSelectedAction}
                disabled={saving}
                className={confirmAction.danger ? 'evl-btn-danger bg-danger text-white hover:bg-red-700 hover:border-danger' : 'evl-btn-primary'}
              >
                {confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
