"use client";

import { useState } from "react";

export interface HeatmapConfig {
  indicator: string;
  granularity: string;
  opacity: number;
  colorScale: string;
}

interface HeatmapControlsProps {
  onConfigChange: (config: HeatmapConfig) => void;
  isVisible: boolean;
  onToggle: () => void;
}

const INDICATORS = [
  { value: "population", label: "Population Density" },
  { value: "income", label: "Median Income" },
  { value: "children", label: "Children Density" },
  { value: "schools", label: "School Density" },
];

const GRANULARITIES = [
  { value: "blockgroup", label: "Block Group" },
  { value: "zip", label: "ZIP Code" },
  { value: "county", label: "County" },
];

const COLOR_SCALES = [
  { value: "blue-red", label: "Blue → Red" },
  { value: "green-red", label: "Green → Red" },
  { value: "cool-warm", label: "Cool → Warm" },
];

export default function HeatmapControls({
  onConfigChange,
  isVisible,
  onToggle,
}: HeatmapControlsProps) {
  const [indicator, setIndicator] = useState("population");
  const [granularity, setGranularity] = useState("zip");
  const [opacity, setOpacity] = useState(60);
  const [colorScale, setColorScale] = useState("blue-red");

  const updateConfig = (updates: Partial<HeatmapConfig>) => {
    const config = {
      indicator: updates.indicator ?? indicator,
      granularity: updates.granularity ?? granularity,
      opacity: updates.opacity ?? opacity,
      colorScale: updates.colorScale ?? colorScale,
    };
    if (updates.indicator) setIndicator(updates.indicator);
    if (updates.granularity) setGranularity(updates.granularity);
    if (updates.opacity !== undefined) setOpacity(updates.opacity);
    if (updates.colorScale) setColorScale(updates.colorScale);
    onConfigChange(config);
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isVisible}
          onChange={onToggle}
          className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
        />
        <span className="text-xs font-medium text-gray-700">
          Show Heatmap Layer
        </span>
      </label>

      {isVisible && (
        <>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">
              Indicator
            </label>
            <select
              value={indicator}
              onChange={(e) => updateConfig({ indicator: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-brand-navy focus:outline-none"
            >
              {INDICATORS.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">
              Granularity
            </label>
            <div className="flex gap-1">
              {GRANULARITIES.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => updateConfig({ granularity: g.value })}
                  className={`flex-1 px-2 py-1 rounded text-[10px] font-medium ${
                    granularity === g.value
                      ? "bg-brand-navy text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">
              Opacity: {opacity}%
            </label>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={opacity}
              onChange={(e) =>
                updateConfig({ opacity: parseInt(e.target.value) })
              }
              className="w-full accent-brand-navy"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">
              Color Scale
            </label>
            <div className="space-y-1">
              {COLOR_SCALES.map((cs) => (
                <label key={cs.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="colorScale"
                    value={cs.value}
                    checked={colorScale === cs.value}
                    onChange={() => updateConfig({ colorScale: cs.value })}
                    className="text-brand-navy focus:ring-brand-navy"
                  />
                  <span className="text-xs text-gray-700">{cs.label}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
