"use client";

interface ScoreFactor {
  name: string;
  value: number;
  normalized: number;
  weight: number;
  weighted: number;
}

interface ScoreResult {
  score: number;
  tier: string;
  tierColor: string;
  factors: ScoreFactor[];
}

interface ScoreBreakdownProps {
  score: ScoreResult | null;
  isLoading?: boolean;
  onRecalculate?: () => void;
}

export default function ScoreBreakdown({
  score,
  isLoading,
  onRecalculate,
}: ScoreBreakdownProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-navy border-t-transparent" />
        <span className="ml-2 text-sm text-gray-500">Calculating...</span>
      </div>
    );
  }

  if (!score) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-500 mb-2">Territory not scored yet</p>
        {onRecalculate && (
          <button
            type="button"
            onClick={onRecalculate}
            className="px-3 py-1.5 text-xs font-medium bg-brand-navy text-white rounded-lg hover:bg-opacity-90"
          >
            Calculate Score
          </button>
        )}
      </div>
    );
  }

  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference - (score.score / 100) * circumference;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={score.tierColor}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-gray-900">
              {score.score}
            </span>
          </div>
        </div>
        <div>
          <p
            className="text-sm font-bold"
            style={{ color: score.tierColor }}
          >
            {score.tier}
          </p>
          <p className="text-xs text-gray-500">Territory Viability Score</p>
          {onRecalculate && (
            <button
              type="button"
              onClick={onRecalculate}
              className="mt-1 text-[10px] text-brand-navy hover:underline"
            >
              Recalculate
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {score.factors.map((factor) => (
          <div key={factor.name} className="space-y-0.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-600">{factor.name}</span>
              <span className="text-gray-500">
                {factor.normalized.toFixed(0)}/100 ({(factor.weight * 100).toFixed(0)}%)
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, factor.normalized)}%`,
                  backgroundColor: score.tierColor,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
