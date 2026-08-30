"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";

interface DemographicData {
  population: number;
  medianIncome: number;
  medianAge: number;
  householdsWithChildren: number;
  totalHouseholds: number;
  childrenUnder18: number;
  children5to12: number;
}

interface DemographicsPanelProps {
  territoryId: string;
  demographics?: DemographicData | null;
  onRefresh: () => void;
  isLoading?: boolean;
  lastUpdated?: string | null;
}

const SUMMARY_CARDS = [
  { key: "population", label: "Population", color: "emerald", format: (v: number) => v.toLocaleString() },
  { key: "medianIncome", label: "Median Income", color: "amber", format: (v: number) => `$${v.toLocaleString()}` },
  { key: "children5to12", label: "Children 5-12", color: "purple", format: (v: number) => v.toLocaleString() },
  { key: "householdsWithChildren", label: "HH w/ Kids", color: "cyan", format: (v: number) => v.toLocaleString() },
] as const;

const COLOR_MAP: Record<string, string> = {
  emerald: "border-emerald-500",
  amber: "border-amber-500",
  purple: "border-purple-500",
  cyan: "border-cyan-500",
};

export default function DemographicsPanel({
  territoryId,
  demographics,
  onRefresh,
  isLoading,
  lastUpdated,
}: DemographicsPanelProps) {
  if (!demographics) {
    return (
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Demographics
        </h4>
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 mb-3">
            No demographics data yet
          </p>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-navy text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <ArrowPathIcon className="h-3 w-3" />
            )}
            Fetch Demographics
          </button>
        </div>
      </div>
    );
  }

  const hhRatio =
    demographics.totalHouseholds > 0
      ? (demographics.householdsWithChildren / demographics.totalHouseholds) *
        100
      : 0;

  // Target Market Index: (children 5-12 density * income factor) / benchmark
  const tmi =
    demographics.children5to12 > 0 && demographics.medianIncome > 0
      ? ((demographics.children5to12 / 1000) *
          (demographics.medianIncome / 75000)) /
        1.0
      : 0;

  return (
    <div className="space-y-3" data-territory-id={territoryId}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Demographics
        </h4>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="text-gray-400 hover:text-gray-600"
        >
          <ArrowPathIcon
            className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {SUMMARY_CARDS.map((card) => (
          <div
            key={card.key}
            className={`border-l-4 ${COLOR_MAP[card.color]} rounded-r-lg bg-gray-50 p-2`}
          >
            <p className="text-[10px] text-gray-500">{card.label}</p>
            <p className="text-sm font-bold text-gray-900">
              {card.format(
                demographics[card.key as keyof DemographicData] as number
              )}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-lg p-2 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Median Age</span>
          <span className="font-medium text-gray-900">
            {demographics.medianAge.toFixed(1)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">HH w/ Kids Ratio</span>
          <span className="font-medium text-gray-900">
            {hhRatio.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Under 18</span>
          <span className="font-medium text-gray-900">
            {demographics.childrenUnder18.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-2">
        <p className="text-[10px] text-gray-500 mb-1">Target Market Index</p>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-lg font-bold ${
              tmi >= 1.0
                ? "text-green-600"
                : tmi >= 0.5
                  ? "text-amber-600"
                  : "text-red-600"
            }`}
          >
            {tmi.toFixed(2)}
          </span>
          <span className="text-[10px] text-gray-400">
            {tmi >= 1.0
              ? "Above benchmark"
              : tmi >= 0.5
                ? "Near benchmark"
                : "Below benchmark"}
          </span>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-[10px] text-gray-400">
          Updated: {new Date(lastUpdated).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
