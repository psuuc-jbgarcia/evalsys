import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { TableSkeleton } from '../../components/LoadingSkeleton';

interface Section { _id: string; name: string; block: string; }
interface RubricCriteria { key: string; label: string; maxScore: number; }
interface GroupResult {
  group: { _id: string; name: string };
  averaged: Record<string, number> | null;
  finalTotal: number | null;
  rubricCriteria?: RubricCriteria[];
  missingPanels?: string[];
  isIncomplete?: boolean;
  comments?: { panel: string; text: string }[];
}

const scoreBadge = (total: number, max: number) => {
  const pct = max > 0 ? total / max : 0;
  if (pct >= 0.84) return 'evl-badge-success';
  if (pct >= 0.64) return 'evl-badge-primary';
  if (pct >= 0.44) return 'evl-badge-warning';
  return 'evl-badge-danger';
};

const formatScore = (score: number | null | undefined, max: number) => (
  typeof score === 'number' ? `${score}/${max || 100}` : 'Pending'
);

const getResultMaxTotal = (result: GroupResult, fallbackMax: number) => (
  result.rubricCriteria?.reduce((sum, criteria) => sum + criteria.maxScore, 0) ?? fallbackMax
);

const pickCommentSignals = (comments: { panel: string; text: string }[]) => {
  const positiveWords = ['excellent', 'good', 'strong', 'clear', 'complete', 'working', 'organized', 'effective', 'smooth', 'great', 'functional'];
  const concernWords = ['improve', 'weak', 'lack', 'missing', 'poor', 'bug', 'error', 'incomplete', 'slow', 'confusing', 'issue', 'problem', 'needs'];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  comments.forEach((comment) => {
    comment.text
      .split(/[.!?;|]+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)
      .forEach((sentence) => {
        const normalized = sentence.toLowerCase();
        if (positiveWords.some((word) => normalized.includes(word)) && strengths.length < 4) strengths.push(sentence);
        if (concernWords.some((word) => normalized.includes(word)) && weaknesses.length < 4) weaknesses.push(sentence);
      });
  });

  return {
    strengths: Array.from(new Set(strengths)).slice(0, 4),
    weaknesses: Array.from(new Set(weaknesses)).slice(0, 4),
  };
};

export default function AIInsights() {
  const [sections, setSections] = useState<Section[]>([]);
  const [selected, setSelected] = useState<Section | null>(null);
  const [results, setResults] = useState<GroupResult[]>([]);
  const [loadingSections, setLoadingSections] = useState(true);
  const [loading, setLoading] = useState(false);

  const criteriaColumns = useMemo(() => {
    const byKey = new Map<string, RubricCriteria>();
    results.forEach((result) => {
      result.rubricCriteria?.forEach((criteria) => {
        if (!byKey.has(criteria.key)) byKey.set(criteria.key, criteria);
      });
    });
    return Array.from(byKey.values());
  }, [results]);

  const maxTotal = criteriaColumns.reduce((sum, criteria) => sum + criteria.maxScore, 0);

  const insights = useMemo(() => {
    const completeResults = results.filter((result) => !result.isIncomplete && typeof result.finalTotal === 'number');
    const topGroups = [...completeResults]
      .sort((a, b) => (b.finalTotal || 0) - (a.finalTotal || 0))
      .slice(0, 5)
      .map((result) => ({
        name: result.group.name,
        score: result.finalTotal || 0,
        max: getResultMaxTotal(result, maxTotal),
      }));

    const criteriaStats = criteriaColumns
      .map((criteria) => {
        const scores = completeResults
          .map((result) => result.averaged?.[criteria.key])
          .filter((score): score is number => typeof score === 'number');
        const average = scores.length
          ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100
          : null;

        return {
          ...criteria,
          average,
          percent: average !== null && criteria.maxScore > 0 ? average / criteria.maxScore : null,
        };
      })
      .filter((criteria) => criteria.average !== null);

    const sortedCriteria = [...criteriaStats].sort((a, b) => (b.percent || 0) - (a.percent || 0));
    const allComments = results.flatMap((result) => result.comments || []);
    const commentSignals = pickCommentSignals(allComments);

    return {
      completeCount: completeResults.length,
      totalCount: results.length,
      pendingCount: results.length - completeResults.length,
      topGroups,
      strongest: sortedCriteria[0] || null,
      weakest: sortedCriteria[sortedCriteria.length - 1] || null,
      totalComments: allComments.length,
      ...commentSignals,
    };
  }, [criteriaColumns, maxTotal, results]);

  useEffect(() => {
    api.get('/sections')
      .then((res) => setSections(res.data))
      .finally(() => setLoadingSections(false));
  }, []);

  const loadInsights = async (section: Section) => {
    setSelected(section);
    setLoading(true);
    try {
      const res = await api.get(`/evaluations/section/${section._id}/results`);
      setResults(res.data);
    } catch (error) {
      console.error(error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="evl-page-title">AI Insights</h2>
        <p className="evl-page-subtitle">
          Summarize panel scores and comments to identify strengths, weaknesses, and the highest group per block.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {loadingSections ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="w-24 h-10 rounded-lg bg-surface border border-muted/40 animate-pulse" />
          ))
        ) : (
          sections.map((section) => (
            <button
              key={section._id}
              onClick={() => loadInsights(section)}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold border transition-all duration-150 ${
                selected?._id === section._id
                  ? 'bg-primary text-white border-primary'
                  : 'border-muted text-text/70 bg-surface hover:text-text hover:border-text/20'
              }`}
            >
              {section.name === section.block ? section.block : `${section.name} - ${section.block}`}
            </button>
          ))
        )}
        {!loadingSections && !sections.length && <p className="text-text/70 text-sm">No sections available.</p>}
      </div>

      {loading ? (
        <TableSkeleton rows={4} cols={3} />
      ) : selected ? (
        <div className="space-y-5">
          <div className="border-y border-muted/30 bg-surface px-2 sm:px-0 py-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Selected block</p>
                <h3 className="text-text font-black text-lg">
                  {selected.name === selected.block ? selected.block : `${selected.name} - ${selected.block}`}
                </h3>
              </div>
              <span className="evl-badge-primary self-start lg:self-auto">
                {insights.completeCount}/{insights.totalCount} Complete
              </span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_1.15fr] gap-4">
              <section className="border border-muted/40 bg-bg rounded-lg p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Highest in this block</p>
                {insights.topGroups.length ? (
                  <div className="space-y-3">
                    {insights.topGroups.map((group, index) => (
                      <div key={group.name} className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-text truncate">
                          {index + 1}. {group.name}
                        </span>
                        <span className={scoreBadge(group.score, group.max)}>
                          {formatScore(group.score, group.max)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text/70">No complete group evaluation yet.</p>
                )}
              </section>

              <section className="border border-muted/40 bg-bg rounded-lg p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Strengths and Weaknesses</p>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-success">Strongest area</p>
                    <p className="text-sm font-semibold text-text mt-1">
                      {insights.strongest
                        ? `${insights.strongest.label} (${formatScore(insights.strongest.average, insights.strongest.maxScore)})`
                        : 'No complete score data yet.'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-danger">Needs attention</p>
                    <p className="text-sm font-semibold text-text mt-1">
                      {insights.weakest
                        ? `${insights.weakest.label} (${formatScore(insights.weakest.average, insights.weakest.maxScore)})`
                        : 'No complete score data yet.'}
                    </p>
                  </div>
                  <p className="text-xs text-text/65">
                    Complete groups: {insights.completeCount}/{insights.totalCount}
                    {insights.pendingCount > 0 ? `, pending: ${insights.pendingCount}` : ''}
                  </p>
                </div>
              </section>

              <section className="border border-muted/40 bg-bg rounded-lg p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Panel Comment Summary</p>
                {insights.totalComments ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-success mb-2">Detected strengths</p>
                      {insights.strengths.length ? (
                        <ul className="space-y-1">
                          {insights.strengths.map((item) => (
                            <li key={item} className="text-xs text-text/60 leading-relaxed">- {item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-text/65">No clear strength phrases detected yet.</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-danger mb-2">Detected weaknesses</p>
                      {insights.weaknesses.length ? (
                        <ul className="space-y-1">
                          {insights.weaknesses.map((item) => (
                            <li key={item} className="text-xs text-text/60 leading-relaxed">- {item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-text/65">No clear weakness phrases detected yet.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-text/70">No panel comments submitted yet.</p>
                )}
              </section>
            </div>
          </div>

          <p className="text-xs text-text/65">
            AI-assisted analytics are generated from submitted panel scores and comments. They support instructor review but do not replace panel grading.
          </p>
        </div>
      ) : (
        <div className="border-y border-muted/30 bg-surface py-14 text-center">
          <p className="text-text/70 text-sm">Select a block to generate AI insights.</p>
        </div>
      )}
    </div>
  );
}

