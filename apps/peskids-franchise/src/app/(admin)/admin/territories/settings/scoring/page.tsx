"use client";

import { useState, useEffect } from "react";
import { DefaultContainer } from "@/components/shared/ResponsiveContainer";
import ScoreSimulator from "@/components/territories/ScoreSimulator";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

interface ScoringConfig {
  region: string;
  childrenDensityWeight: number;
  householdIncomeWeight: number;
  householdsWithKidsWeight: number;
  competitorSaturationWeight: number;
  populationDensityWeight: number;
  schoolDensityWeight: number;
  educationLevelWeight: number;
  childrenDensityBenchmark: number;
  householdIncomeBenchmark: number;
  schoolDensityBenchmark: number;
}

export default function ScoringSettingsPage() {
  const [config, setConfig] = useState<ScoringConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/territories/scoring-config");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error("Failed to fetch scoring config:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/territories/scoring-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save config:", err);
    } finally {
      setSaving(false);
    }
  };

  const updateWeight = (key: keyof ScoringConfig, value: number) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
    setSaved(false);
  };

  if (isLoading || !config) {
    return (
      <DefaultContainer>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
        </div>
      </DefaultContainer>
    );
  }

  const weightSum =
    config.childrenDensityWeight +
    config.householdIncomeWeight +
    config.householdsWithKidsWeight +
    config.competitorSaturationWeight +
    config.populationDensityWeight +
    config.schoolDensityWeight +
    config.educationLevelWeight;

  const isValid = Math.abs(weightSum - 1.0) < 0.01;

  return (
    <DefaultContainer>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scoring Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure territory scoring weights and benchmarks
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !isValid}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            saved
              ? "bg-green-600 text-white"
              : "bg-brand-navy text-white hover:bg-brand-purple disabled:opacity-50"
          }`}
        >
          <Cog6ToothIcon className="h-4 w-4" />
          {saved ? "Saved" : saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weights */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Factor Weights</h2>
          <p className={`text-sm mb-4 ${isValid ? "text-green-600" : "text-red-500 font-medium"}`}>
            Total: {(weightSum * 100).toFixed(0)}% {isValid ? "(valid)" : "(must equal 100%)"}
          </p>

          <div className="space-y-4">
            {([
              ["childrenDensityWeight", "Children Density (5-12)"],
              ["householdIncomeWeight", "Household Income"],
              ["householdsWithKidsWeight", "Households w/ Kids"],
              ["competitorSaturationWeight", "Competitor Saturation"],
              ["populationDensityWeight", "Population Density"],
              ["schoolDensityWeight", "School Density"],
              ["educationLevelWeight", "Education Level"],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-gray-700">{label}</label>
                  <span className="text-sm font-medium text-gray-900">
                    {((config[key] as number) * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={(config[key] as number) * 100}
                  onChange={(e) => updateWeight(key, Number(e.target.value) / 100)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-navy"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Benchmarks */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Benchmarks</h2>
          <p className="text-sm text-gray-500 mb-4">
            Target values for normalization (100% score at benchmark)
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Children Density Benchmark (per sq mi)
              </label>
              <input
                type="number"
                value={config.childrenDensityBenchmark}
                onChange={(e) =>
                  updateWeight("childrenDensityBenchmark", Number(e.target.value))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Household Income Benchmark ($)
              </label>
              <input
                type="number"
                value={config.householdIncomeBenchmark}
                onChange={(e) =>
                  updateWeight("householdIncomeBenchmark", Number(e.target.value))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                School Density Benchmark (per sq mi)
              </label>
              <input
                type="number"
                step="0.1"
                value={config.schoolDensityBenchmark}
                onChange={(e) =>
                  updateWeight("schoolDensityBenchmark", Number(e.target.value))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Score Simulator */}
      <div className="mt-6">
        <ScoreSimulator territories={[]} scoringConfig={config} />
      </div>
    </DefaultContainer>
  );
}
