"use client";

import { useState, useEffect } from "react";

interface Territory {
  id: string;
  name: string;
  state: string;
  population?: number | null;
  medianIncome?: number | null;
  children5to12?: number | null;
  householdsWithChildren?: number | null;
  schoolCount?: number | null;
  competitorCount?: number | null;
  territoryScore?: number | null;
}

interface TerritoryComparisonViewProps {
  territories: Territory[];
}

const METRICS = [
  { key: "population", label: "Population", format: (v: number) => v.toLocaleString() },
  { key: "medianIncome", label: "Median Income", format: (v: number) => `$${v.toLocaleString()}` },
  { key: "children5to12", label: "Children 5-12", format: (v: number) => v.toLocaleString() },
  { key: "householdsWithChildren", label: "HH w/ Kids", format: (v: number) => v.toLocaleString() },
  { key: "schoolCount", label: "Schools", format: (v: number) => v.toString() },
  { key: "competitorCount", label: "Competitors", format: (v: number) => v.toString() },
  { key: "territoryScore", label: "Score", format: (v: number) => `${v}/100` },
] as const;

export default function TerritoryComparisonView({
  territories,
}: TerritoryComparisonViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<Territory[]>([]);

  useEffect(() => {
    setComparison(
      territories.filter((t) => selectedIds.includes(t.id))
    );
  }, [selectedIds, territories]);

  const toggleTerritory = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : prev.length < 4
          ? [...prev, id]
          : prev
    );
  };

  const getBestForMetric = (key: string): string | null => {
    if (comparison.length < 2) return null;
    let best: Territory | null = null;
    let bestValue = key === "competitorCount" ? Infinity : -Infinity;

    for (const t of comparison) {
      const val = (t[key as keyof Territory] as number) || 0;
      if (key === "competitorCount" ? val < bestValue : val > bestValue) {
        bestValue = val;
        best = t;
      }
    }
    return best?.id || null;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">
        Compare Territories
      </h3>

      <div className="flex flex-wrap gap-1.5">
        {territories.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => toggleTerritory(t.id)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedIds.includes(t.id)
                ? "bg-brand-navy text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {comparison.length >= 2 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-2 py-2 text-left text-gray-500 font-medium">
                  Metric
                </th>
                {comparison.map((t) => (
                  <th
                    key={t.id}
                    className="px-2 py-2 text-center font-medium text-gray-900"
                  >
                    {t.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map((metric) => {
                const bestId = getBestForMetric(metric.key);
                return (
                  <tr
                    key={metric.key}
                    className="border-b border-gray-100"
                  >
                    <td className="px-2 py-2 text-gray-600">
                      {metric.label}
                    </td>
                    {comparison.map((t) => {
                      const val =
                        (t[metric.key as keyof Territory] as number) || 0;
                      const isBest = t.id === bestId;
                      return (
                        <td
                          key={t.id}
                          className={`px-2 py-2 text-center font-medium ${
                            isBest
                              ? "bg-green-50 text-green-700"
                              : "text-gray-900"
                          }`}
                        >
                          {metric.format(val)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {comparison.length < 2 && (
        <p className="text-xs text-gray-400 text-center py-4">
          Select at least 2 territories to compare
        </p>
      )}
    </div>
  );
}
