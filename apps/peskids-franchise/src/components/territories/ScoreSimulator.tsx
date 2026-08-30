"use client";

import { useState, useMemo } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

interface ScoringConfig {
  childrenDensityWeight: number;
  householdIncomeWeight: number;
  householdsWithKidsWeight: number;
  competitorSaturationWeight: number;
  populationDensityWeight: number;
  schoolDensityWeight: number;
  educationLevelWeight: number;
}

interface Territory {
  id: string;
  name: string;
  state: string;
  territoryScore: number | null;
}

interface ScoreSimulatorProps {
  territories: Territory[];
  scoringConfig: ScoringConfig;
  onConfigSave?: (config: ScoringConfig) => void;
}

const WEIGHT_LABELS: { key: keyof ScoringConfig; label: string }[] = [
  { key: "childrenDensityWeight", label: "Children Density (5-12)" },
  { key: "householdIncomeWeight", label: "Household Income" },
  { key: "householdsWithKidsWeight", label: "Households w/ Kids" },
  { key: "competitorSaturationWeight", label: "Competitor Saturation" },
  { key: "populationDensityWeight", label: "Population Density" },
  { key: "schoolDensityWeight", label: "School Density" },
  { key: "educationLevelWeight", label: "Education Level" },
];

const DEFAULT_WEIGHTS: ScoringConfig = {
  childrenDensityWeight: 0.25,
  householdIncomeWeight: 0.2,
  householdsWithKidsWeight: 0.15,
  competitorSaturationWeight: 0.15,
  populationDensityWeight: 0.1,
  schoolDensityWeight: 0.1,
  educationLevelWeight: 0.05,
};

export default function ScoreSimulator({
  territories,
  scoringConfig,
  onConfigSave,
}: ScoreSimulatorProps) {
  const [weights, setWeights] = useState<ScoringConfig>(scoringConfig);

  const totalWeight = useMemo(() => {
    return WEIGHT_LABELS.reduce((sum, w) => sum + weights[w.key], 0);
  }, [weights]);

  const isValid = Math.abs(totalWeight - 1.0) < 0.01;

  const updateWeight = (key: keyof ScoringConfig, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    setWeights(DEFAULT_WEIGHTS);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Score Simulator
        </h3>
        <button
          type="button"
          onClick={resetToDefaults}
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          <ArrowPathIcon className="h-3 w-3" />
          Reset
        </button>
      </div>

      <div className="space-y-3">
        {WEIGHT_LABELS.map(({ key, label }) => (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-700">{label}</span>
              <span className="font-medium text-gray-900">
                {(weights[key] * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={0.5}
              step={0.05}
              value={weights[key]}
              onChange={(e) =>
                updateWeight(key, parseFloat(e.target.value))
              }
              className="w-full accent-brand-navy"
            />
          </div>
        ))}
      </div>

      <div
        className={`rounded-lg p-2 text-xs font-medium text-center ${
          isValid
            ? "bg-green-50 text-green-700"
            : "bg-red-50 text-red-700"
        }`}
      >
        Total: {(totalWeight * 100).toFixed(0)}%
        {!isValid && " (must equal 100%)"}
      </div>

      {territories.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-700">
            Territory Rankings
          </p>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {territories
              .filter((t) => t.territoryScore !== null)
              .sort(
                (a, b) => (b.territoryScore || 0) - (a.territoryScore || 0)
              )
              .map((t, i) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between px-2 py-1 rounded bg-gray-50 text-xs"
                >
                  <span className="text-gray-500">#{i + 1}</span>
                  <span className="font-medium text-gray-900 truncate mx-2 flex-1">
                    {t.name}
                  </span>
                  <span className="font-bold text-gray-900">
                    {t.territoryScore}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {onConfigSave && (
        <button
          type="button"
          onClick={() => onConfigSave(weights)}
          disabled={!isValid}
          className="w-full rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
        >
          Save Configuration
        </button>
      )}
    </div>
  );
}
