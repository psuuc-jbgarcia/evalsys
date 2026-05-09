interface Level {
  label: string;
  range: string;
  color: string;
  description?: string;
}

interface Props {
  label: string;
  max: number;
  value: number | '';
  onChange: (val: number) => void;
  levels: Level[];
}

export default function ScoreInput({ label, max, value, onChange, levels }: Props) {
  const getLevel = (v: number) =>
    levels.find((l) => {
      const [min, lmax] = l.range.split('–').map(Number);
      return v >= min && v <= lmax;
    });

  const level = typeof value === 'number' ? getLevel(value) : null;

  return (
    <div className="evl-card p-5">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="font-bold text-text text-sm">{label}</p>
          <p className="text-text/50 text-xs mt-0.5">Max: {max} pts</p>
        </div>
        {level && (
          <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md ${level.color}`}>
            {level.label}
          </span>
        )}
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {levels.map((l) => (
          <button
            key={l.label}
            type="button"
            title={l.description}
            onClick={() => {
              const [min] = l.range.split('–').map(Number);
              onChange(min);
            }}
            className={`text-[11px] px-3 py-1.5 rounded-lg border font-semibold transition-all duration-150 ${l.color} border-transparent hover:opacity-80`}
          >
            {l.label} ({l.range})
          </button>
        ))}
      </div>

      {level?.description && (
        <p className="text-xs text-text/50 mb-3 leading-relaxed">{level.description}</p>
      )}

      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => {
          const v = Math.min(Math.max(Math.round(Number(e.target.value)), 0), max);
          onChange(v);
        }}
        className="evl-input"
        placeholder={`0 – ${max}`}
      />
    </div>
  );
}
