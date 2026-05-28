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
  disabled?: boolean;
}

export default function ScoreInput({ label, max, value, onChange, levels, disabled = false }: Props) {
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
            disabled={disabled}
            onClick={() => {
              const [min] = l.range.split('–').map(Number);
              onChange(min);
            }}
            className={`flex-1 min-w-[80px] text-[10px] sm:text-[11px] px-2 sm:px-3 py-2 sm:py-1.5 rounded-lg border font-bold transition-all duration-150 ${l.color} border-transparent ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {level?.description && (
        <div className="mb-4 p-3 bg-muted/20 rounded-lg">
          <p className="text-[11px] text-text/60 leading-relaxed italic">{level.description}</p>
        </div>
      )}

      <div className="relative group">
        <input
          type="number"
          min={0}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const v = Math.min(Math.max(Math.round(Number(e.target.value)), 0), max);
            onChange(v);
          }}
          className={`evl-input !py-3 !text-lg font-bold text-center ${disabled ? 'opacity-70 cursor-not-allowed bg-muted/10' : ''}`}
          placeholder={`Score (0 – ${max})`}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-text/20 group-focus-within:text-primary/40">/ {max}</span>
      </div>
    </div>
  );
}
