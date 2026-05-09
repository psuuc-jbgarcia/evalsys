import { useEffect, useState } from 'react';
import api from '../../services/api';
import ScoreInput from '../../components/ScoreInput';

interface Level { label: string; minScore: number; maxScore: number; description: string; }
interface Criteria { key: string; label: string; maxScore: number; levels: Level[]; }
interface Rubric { _id: string; title: string; criteria: Criteria[]; isActive: boolean; }
interface Section { _id: string; name: string; block: string; }
interface Group { _id: string; name: string; section: Section; members: string[]; }

const LEVEL_COLORS: Record<string, string> = {
  Excellent: 'bg-success/10 text-success',
  Good: 'bg-primary/10 text-primary',
  Fair: 'bg-warning/10 text-warning',
  Poor: 'bg-danger/10 text-danger',
};

export default function Grade() {
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [selectedRubricId, setSelectedRubricId] = useState<string>('');
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  const [scores, setScores] = useState<Record<string, number | ''>>({});
  const [existing, setExisting] = useState<any>(null);
  
  const [loadingRubrics, setLoadingRubrics] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [sections, setSections] = useState<Section[]>([]);

  const [selectedSidebarSectionId, setSelectedSidebarSectionId] = useState<string>('');

  useEffect(() => {
    api.get('/rubrics').then((r) => {
      setRubrics(r.data);
      if (r.data.length > 0) {
        const active = r.data.find((rub: Rubric) => rub.isActive) || r.data[0];
        setSelectedRubricId(active._id);
      }
    })
    .catch((err) => console.error(err))
    .finally(() => setLoadingRubrics(false));

    api.get('/groups').then((r) => setGroups(r.data));
    api.get('/sections').then((r) => {
      setSections(r.data);
      if (r.data.length > 0) {
        setSelectedSidebarSectionId(r.data[0]._id);
      }
    });
  }, []);

  const activeRubric = rubrics.find((r) => r._id === selectedRubricId) || null;

  // Re-initialize scores when group or rubric changes
  useEffect(() => {
    if (selectedGroup && activeRubric) {
      if (existing && existing.rubric?._id === activeRubric._id) {
        setScores(existing.scores);
      } else {
        const init: Record<string, number | ''> = {};
        activeRubric.criteria.forEach((c) => { init[c.key] = ''; });
        setScores(init);
      }
    }
  }, [selectedGroup, activeRubric, existing]);

  const selectGroup = async (group: Group) => {
    setSelectedGroup(group);
    setSuccess(''); setError('');
    const res = await api.get(`/evaluations/group/${group._id}/mine`);
    if (res.data) {
      setExisting(res.data);
      if (res.data.rubric) {
        setSelectedRubricId(res.data.rubric._id || res.data.rubric);
      }
    } else {
      setExisting(null);
      // Reset scores based on currently selected rubric
      if (activeRubric) {
        const init: Record<string, number | ''> = {};
        activeRubric.criteria.forEach((c) => { init[c.key] = ''; });
        setScores(init);
      }
    }
  };

  const total = Object.values(scores).reduce<number>(
    (a, b) => (typeof b === 'number' ? a + b : a), 0
  );
  const maxTotal = activeRubric?.criteria.reduce((a, c) => a + c.maxScore, 0) ?? 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await api.post(`/evaluations/group/${selectedGroup!._id}`, { 
        scores, 
        rubricId: selectedRubricId 
      });
      setSuccess('Scores submitted successfully.');
      const res = await api.get(`/evaluations/group/${selectedGroup!._id}/mine`);
      setExisting(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Submission failed');
    }
  };

  const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

  const visibleGroups = selectedSidebarSectionId
    ? groups.filter((g) => {
        const sId = typeof g.section === 'string' ? g.section : g.section?._id;
        return sId === selectedSidebarSectionId;
      })
    : [];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Group sidebar */}
      <div className="w-full lg:w-72 shrink-0">
        <div className="sticky top-0 pr-2 pb-8">
          <h3 className="text-text font-bold text-base mb-4 px-1">Assigned Blocks</h3>
          
          <div className="flex gap-2 overflow-x-auto pb-4 mb-4 lg:flex-col lg:overflow-visible lg:pb-0 scrollbar-hide">
            {sections.map((section) => (
              <button
                key={section._id}
                onClick={() => setSelectedSidebarSectionId(section._id)}
                className={`whitespace-nowrap lg:whitespace-normal text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 border ${
                  selectedSidebarSectionId === section._id
                    ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                    : 'bg-surface text-text/60 border-muted/40 hover:text-text hover:border-primary/30'
                }`}
              >
                {section.block}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1 max-h-[50vh] lg:max-h-[60vh] overflow-y-auto pr-2">
            {sections.length > 0 && selectedSidebarSectionId && (
              <>
                <h4 className="text-[10px] font-extrabold text-text/40 uppercase tracking-widest mb-2 px-1 mt-2">
                  Groups in Block
                </h4>
                {visibleGroups.length > 0 ? (
                  visibleGroups.map((g) => (
                    <button key={g._id} onClick={() => selectGroup(g)}
                      className={`text-left px-4 py-3 rounded-lg transition-all duration-150 border ${
                        selectedGroup?._id === g._id
                          ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                          : 'bg-surface text-text/70 hover:text-text hover:border-primary/30 border-muted/30'
                      }`}>
                      <p className="font-bold text-sm leading-tight">{g.name}</p>
                      <p className={`text-[11px] mt-1 truncate ${selectedGroup?._id === g._id ? 'text-white/70' : 'text-text/40'}`}>
                        {g.members.length ? g.members.join(', ') : 'No members'}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="px-2 py-4 rounded-lg border border-dashed border-muted/40 bg-surface/50 text-center">
                    <p className="text-xs text-text/40 font-medium">No groups added yet</p>
                  </div>
                )}
              </>
            )}
            {!sections.length && <p className="text-text/50 text-sm px-1">No blocks assigned</p>}
          </div>
        </div>
      </div>

      {/* Scoring form */}
      <div className="flex-1 min-w-0">
        {!selectedGroup ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-text/20 text-4xl mb-3">✎</div>
              <p className="text-text/40 text-sm">Select a group from your assigned blocks to start grading</p>
            </div>
          </div>
        ) : loadingRubrics ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-text/40 text-sm">Loading rubric…</p>
          </div>
        ) : !activeRubric ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-text/40 text-sm font-semibold mb-1">No rubrics available.</p>
              <p className="text-text/50 text-xs">Please ask an administrator to create a grading rubric.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Header with total */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="evl-page-title">{selectedGroup.name}</h2>
                <p className="text-text/50 text-sm mt-1">
                  {selectedGroup.section?.block}
                  {selectedGroup.members.length ? ` · ${selectedGroup.members.join(', ')}` : ''}
                </p>
                
                <div className="mt-3 flex items-center gap-2">
                  <label className="text-xs font-semibold text-text/70 uppercase tracking-wide">Grading Rubric:</label>
                  <select 
                    value={selectedRubricId} 
                    onChange={(e) => setSelectedRubricId(e.target.value)}
                    className="evl-select !py-1.5 !text-xs w-64 bg-surface"
                  >
                    {rubrics.map(r => (
                      <option key={r._id} value={r._id}>{r.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="evl-card px-6 py-4 text-center min-w-[140px] bg-surface">
                <p className="text-text/40 text-xs font-semibold uppercase tracking-wider mb-1">Total Score</p>
                <p className="text-3xl font-extrabold text-text">
                  {total}
                  <span className="text-text/30 text-base font-normal">/{maxTotal}</span>
                </p>
                <div className="w-full bg-muted/30 rounded-full h-1.5 mt-2">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      pct >= 84 ? 'bg-success' : pct >= 64 ? 'bg-primary' : pct >= 44 ? 'bg-warning' : 'bg-danger'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Alerts */}
            {existing && existing.rubric?._id === activeRubric._id && (
              <div className="evl-alert-info mb-4">
                You already submitted scores for this group using this rubric. You can update them below.
              </div>
            )}
            {existing && existing.rubric?._id !== activeRubric._id && (
              <div className="evl-alert-warning bg-warning/5 border border-warning/20 text-warning mb-4">
                You previously graded this group using a different rubric. Saving now will overwrite those scores with the new rubric's criteria.
              </div>
            )}
            {success && <div className="evl-alert-success mb-4">{success}</div>}
            {error && <div className="evl-alert-error mb-4">{error}</div>}

            {/* Score inputs */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
              {activeRubric.criteria.map((cat) => (
                <ScoreInput
                  key={cat.key}
                  label={cat.label}
                  max={cat.maxScore}
                  value={scores[cat.key] ?? ''}
                  onChange={(v) => setScores((s) => ({ ...s, [cat.key]: v }))}
                  levels={cat.levels.map((l) => ({
                    label: l.label,
                    range: `${l.minScore}–${l.maxScore}`,
                    color: LEVEL_COLORS[l.label] ?? 'bg-gray-100 text-gray-600',
                    description: l.description,
                  }))}
                />
              ))}
            </div>

            <button type="submit" className="evl-btn-primary px-8 py-3">
              {existing ? 'Update Scores' : 'Submit Scores'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
