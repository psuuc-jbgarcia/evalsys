import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { TableSkeleton } from '../../components/LoadingSkeleton';

interface Subject { _id: string; code: string; title: string; }
interface Section { _id: string; block: string; subject?: string | Subject; }
interface RegistrationLink {
  _id: string;
  token: string;
  subject: Subject;
  sections: Section[];
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
}

const currentSubjectKey = 'evalsys_current_subject_id';
const toDatetimeLocal = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

const getSectionSubjectId = (section: Section) => (
  typeof section.subject === 'string' ? section.subject : section.subject?._id
);

export default function RegistrationLinks() {
  const [subject, setSubject] = useState<Subject | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [links, setLinks] = useState<RegistrationLink[]>([]);
  const [selectedSubject, setSelectedSubject] = useState(() => localStorage.getItem(currentSubjectKey) || '');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState(() => toDatetimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000)));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copiedToken, setCopiedToken] = useState('');

  const visibleSections = useMemo(
    () => sections.filter((section) => getSectionSubjectId(section) === selectedSubject),
    [sections, selectedSubject]
  );

  const linkUrl = (token: string) => `${window.location.origin}/register?token=${encodeURIComponent(token)}`;

  const loadLinks = () => {
    if (!selectedSubject) return;
    api.get('/registration-links', { params: { subject: selectedSubject } })
      .then((res) => setLinks(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load registration links'));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/subjects'),
      api.get('/sections'),
    ]).then(([subjectRes, sectionRes]) => {
      setSections(sectionRes.data);
      const saved = localStorage.getItem(currentSubjectKey);
      const firstSubject = subjectRes.data[0]?._id || '';
      const nextSubjectDoc = subjectRes.data.find((item: Subject) => item._id === saved) || subjectRes.data[0] || null;
      const nextSubject = nextSubjectDoc?._id || firstSubject;
      setSubject(nextSubjectDoc);
      setSelectedSubject(nextSubject || '');
    }).catch((err) => {
      setError(err.response?.data?.message || 'Failed to load registration setup');
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setSelectedSections([]);
    if (selectedSubject) {
      api.get('/sections', { params: { subject: selectedSubject } })
        .then((res) => setSections(res.data))
        .catch((err) => setError(err.response?.data?.message || 'Failed to load blocks for this subject'));
    }
    loadLinks();
  }, [selectedSubject]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/registration-links', {
        subject: selectedSubject,
        sections: selectedSections,
        expiresAt,
      });
      setSelectedSections([]);
      loadLinks();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create registration link');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSection = (sectionId: string) => {
    setSelectedSections((current) => (
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId]
    ));
  };

  const handleCopy = async (token: string) => {
    await navigator.clipboard.writeText(linkUrl(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(''), 1800);
  };

  const handleStatus = async (link: RegistrationLink, isActive: boolean) => {
    try {
      await api.patch(`/registration-links/${link._id}`, { isActive });
      loadLinks();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update registration link');
    }
  };

  const isExpired = (link: RegistrationLink) => new Date(link.expiresAt).getTime() <= Date.now();

  return (
    <div>
      <div className="mb-6">
        <h2 className="evl-page-title">Registration Links</h2>
        <p className="evl-page-subtitle">Generate controlled registration links for the current subject.</p>
      </div>

      {error && <div className="evl-alert-error mb-6">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-6">
        <div className="evl-card p-6 h-fit">
          <h3 className="text-text font-bold text-sm mb-4">Create Link</h3>
          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label className="evl-label">Subject</label>
              <div className="evl-input flex items-center bg-bg/60 font-semibold text-text">
                <span className="truncate">
                  {subject ? `${subject.code} - ${subject.title}` : 'No current subject selected'}
                </span>
              </div>
              <p className="text-[11px] text-text/40 mt-2">
                Change the current subject from the sidebar to generate links for another subject.
              </p>
            </div>

            <div>
              <label className="evl-label">Expiration</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                required
                className="evl-input"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="evl-label mb-0">Allowed Blocks</label>
                <button
                  type="button"
                  onClick={() => setSelectedSections([])}
                  className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                >
                  Allow all
                </button>
              </div>
              <div className="rounded-xl border border-muted/30 bg-bg/50 p-3 max-h-64 overflow-y-auto space-y-2">
                {visibleSections.map((section) => (
                  <label key={section._id} className="flex items-center gap-3 rounded-lg bg-surface border border-muted/20 px-3 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSections.includes(section._id)}
                      onChange={() => handleToggleSection(section._id)}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm font-semibold text-text">{section.block}</span>
                  </label>
                ))}
                {!visibleSections.length && (
                  <p className="text-sm text-text/50 py-4 text-center">No blocks found for this subject.</p>
                )}
              </div>
              <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <p className="text-xs font-bold text-primary">
                  No block selected = all blocks in {subject?.code || 'this subject'} can use this link.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || !selectedSubject || !visibleSections.length}
              className="evl-btn-primary w-full"
            >
              {saving ? 'Creating...' : 'Generate Registration Link'}
            </button>
          </form>
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : (
          <div className="evl-card overflow-hidden">
            <div className="p-5 border-b border-muted/20 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-text font-bold text-sm">Generated Links</h3>
                <p className="text-xs text-text/40 mt-1">Only students with an active link can register.</p>
              </div>
            </div>
            <div className="divide-y divide-muted/20">
              {links.map((link) => {
                const expired = isExpired(link);
                const active = link.isActive && !expired;
                return (
                  <div key={link._id} className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                            active ? 'bg-success/10 text-success' : 'bg-muted/40 text-text/40'
                          }`}>
                            {expired ? 'Expired' : link.isActive ? 'Open' : 'Closed'}
                          </span>
                          <span className="text-xs text-text/40">
                            Expires {new Date(link.expiresAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-text truncate">{linkUrl(link.token)}</p>
                        <p className="text-xs text-text/45 mt-2">
                          Blocks: {link.sections.length ? link.sections.map((section) => section.block).join(', ') : 'All blocks in subject'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleCopy(link.token)} className="evl-btn-ghost text-primary">
                          {copiedToken === link.token ? 'Copied' : 'Copy Link'}
                        </button>
                        <button
                          onClick={() => handleStatus(link, !link.isActive)}
                          className={`evl-btn-ghost ${link.isActive ? 'text-danger hover:text-danger hover:bg-danger/5' : 'text-success hover:text-success hover:bg-success/5'}`}
                        >
                          {link.isActive ? 'Stop Accepting' : 'Reopen'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!links.length && (
                <div className="p-12 text-center text-text/50">
                  No registration links yet for this subject.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
