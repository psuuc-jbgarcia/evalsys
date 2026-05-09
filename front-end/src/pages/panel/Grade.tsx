import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [comments, setComments] = useState('');
  const [existing, setExisting] = useState<any>(null);
  
  const [loadingRubrics, setLoadingRubrics] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [sections, setSections] = useState<Section[]>([]);
  const [searchParams] = useSearchParams();
  const urlGroupId = searchParams.get('groupId');

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

    api.get('/sections').then((r) => {
      setSections(r.data);
      if (r.data.length > 0) {
        setSelectedSidebarSectionId(r.data[0]._id);
      }
    });

    api.get('/groups').then((r) => {
      setGroups(r.data);
      if (urlGroupId) {
        const found = r.data.find((g: Group) => g._id === urlGroupId);
        if (found) {
          selectGroup(found);
          // Also set the sidebar section to match this group's section
          const sId = typeof found.section === 'string' ? found.section : found.section?._id;
          if (sId) setSelectedSidebarSectionId(sId);
        }
      }
    });
  }, []);

  const activeRubric = rubrics.find((r) => r._id === selectedRubricId) || null;

  // Re-initialize scores when group or rubric changes
  useEffect(() => {
    if (selectedGroup && activeRubric) {
      if (existing && existing.rubric?._id === activeRubric._id) {
        setScores(existing.scores);
        setComments(existing.comments || '');
      } else {
        const init: Record<string, number | ''> = {};
        activeRubric.criteria.forEach((c) => { init[c.key] = ''; });
        setScores(init);
        setComments('');
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
      // Try to restore from local backup first
      const restored = restoreBackup(group._id);
      
      // If no backup, reset scores based on currently selected rubric
      if (!restored && activeRubric) {
        const init: Record<string, number | ''> = {};
        activeRubric.criteria.forEach((c) => { init[c.key] = ''; });
        setScores(init);
        setComments('');
      }
    }
  };

  const total = Object.values(scores).reduce<number>(
    (a, b) => (typeof b === 'number' ? a + b : a), 0
  );
  const maxTotal = activeRubric?.criteria.reduce((a, c) => a + c.maxScore, 0) ?? 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if all scores are filled
    const missing = activeRubric?.criteria.some(c => scores[c.key] === '');
    if (missing) {
      if (!confirm('Some criteria have no scores. Are you sure you want to submit?')) return;
    }

    const confirmMsg = `Review your submission for ${selectedGroup?.name}:\n\nTotal Score: ${total}/${maxTotal}\n\nDo you want to proceed?`;
    if (!confirm(confirmMsg)) return;

    setError(''); setSuccess('');
    try {
      await api.post(`/evaluations/group/${selectedGroup!._id}`, { 
        scores, 
        rubricId: selectedRubricId,
        comments 
      });
      setSuccess('Scores and feedback submitted successfully.');
      const res = await api.get(`/evaluations/group/${selectedGroup!._id}/mine`);
      setExisting(res.data);
      // Remove backup after successful submission
      localStorage.removeItem(`backup_${selectedGroup!._id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Submission failed');
    }
  };

  const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

  // AUTO-SAVE to localStorage to prevent data loss if browser crashes
  useEffect(() => {
    if (selectedGroup && activeRubric && Object.keys(scores).length > 0) {
      const backupData = {
        groupId: selectedGroup._id,
        rubricId: activeRubric._id,
        scores
      };
      localStorage.setItem(`backup_${selectedGroup._id}`, JSON.stringify(backupData));
    }
  }, [scores, selectedGroup, activeRubric]);

  // Restore backup on group select
  const restoreBackup = (groupId: string) => {
    const saved = localStorage.getItem(`backup_${groupId}`);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.rubricId === selectedRubricId) {
        setScores(data.scores);
        return true;
      }
    }
    return false;
  };

  const handlePrintRubric = () => {
    if (!activeRubric || !selectedGroup) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>Offline Grading Sheet - ${selectedGroup.name}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            h1 { margin-bottom: 5px; }
            .info { color: #666; margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
            .criteria { margin-bottom: 40px; break-inside: avoid; }
            .criteria-title { font-weight: bold; font-size: 18px; margin-bottom: 10px; display: flex; justify-content: space-between; }
            .level { border: 1px solid #ddd; padding: 10px; margin-bottom: 5px; border-radius: 5px; }
            .level-title { font-weight: bold; font-size: 12px; margin-bottom: 3px; }
            .level-desc { font-size: 11px; color: #666; }
            .score-box { border: 2px solid #000; width: 60px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Offline Grading Sheet</h1>
          <div class="info">
            <strong>Group:</strong> ${selectedGroup.name} <br/>
            <strong>Block:</strong> ${selectedSidebarSectionId ? sections.find(s => s._id === selectedSidebarSectionId)?.block : ''} <br/>
            <strong>Rubric:</strong> ${activeRubric.title}
          </div>
          ${activeRubric.criteria.map(c => `
            <div class="criteria">
              <div class="criteria-title">
                <span>${c.label} (Max: ${c.maxScore})</span>
                <div class="score-box"></div>
              </div>
              ${c.levels.map(l => `
                <div class="level">
                  <div class="level-title">${l.label} (${l.minScore}-${l.maxScore})</div>
                  <div class="level-desc">${l.description}</div>
                </div>
              `).join('')}
            </div>
          `).join('')}
          <div style="margin-top: 50px; border-top: 2px solid #000; padding-top: 10px;">
            <strong>Total Score: ________ / ${maxTotal}</strong>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

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
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
              <div className="w-full md:flex-1">
                <h2 className="text-2xl md:text-3xl font-extrabold text-text leading-tight">{selectedGroup.name}</h2>
                <p className="text-text/50 text-sm mt-2 font-medium">
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs uppercase tracking-wider">{selectedGroup.section?.block}</span>
                  {selectedGroup.members.length ? ` · ${selectedGroup.members.join(', ')}` : ''}
                </p>
                
                <div className="mt-6 p-4 bg-surface rounded-xl border border-muted/20">
                  <label className="text-[10px] font-bold text-text/40 uppercase tracking-widest block mb-2">Grading Rubric In Use</label>
                  <select 
                    value={selectedRubricId} 
                    onChange={(e) => setSelectedRubricId(e.target.value)}
                    className="evl-select !py-2 !text-sm w-full bg-bg border-muted/40"
                  >
                    {rubrics.map(r => (
                      <option key={r._id} value={r._id}>{r.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="w-full md:w-auto flex flex-col items-stretch md:items-end gap-3">
                <div className="evl-card px-6 py-5 text-center min-w-[160px] bg-surface border-primary/20 shadow-lg shadow-primary/5">
                  <p className="text-text/40 text-[10px] font-extrabold uppercase tracking-widest mb-1">Current Total</p>
                  <p className="text-4xl font-black text-text">
                    {total}
                    <span className="text-text/30 text-lg font-normal">/{maxTotal}</span>
                  </p>
                  <div className="w-full bg-muted/30 rounded-full h-2 mt-3">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        pct >= 84 ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 
                        pct >= 64 ? 'bg-primary shadow-[0_0_8px_rgba(59,130,246,0.4)]' : 
                        pct >= 44 ? 'bg-warning shadow-[0_0_8px_rgba(234,179,8,0.4)]' : 
                        'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-4 px-1">
                  <span className="text-[10px] font-bold text-success flex items-center gap-1.5 opacity-80">
                    <span className="w-2 h-2 bg-success rounded-full animate-pulse shadow-[0_0_4px_rgba(34,197,94,0.6)]"></span>
                    Safe & Saved
                  </span>
                  <button 
                    type="button"
                    onClick={handlePrintRubric}
                    className="text-[10px] font-black text-primary uppercase tracking-widest hover:text-primary/70 transition-colors"
                  >
                    📥 Offline Backup
                  </button>
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

            {/* Comments / Feedback */}
            <div className="evl-card p-6 mb-6 bg-surface">
              <label className="evl-label flex items-center gap-2 mb-3">
                <span>💬 Panel Feedback & Comments</span>
                <span className="text-[10px] font-normal lowercase bg-muted/40 px-1.5 py-0.5 rounded text-text/40">Optional</span>
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                className="evl-input resize-none"
                placeholder="Write your constructive feedback here for the group... (e.g., Strengths, weaknesses, suggestions for improvement)"
              />
            </div>

            <button type="submit" className="evl-btn-primary px-8 py-3">
              {existing ? 'Update Scores & Feedback' : 'Submit Scores & Feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
