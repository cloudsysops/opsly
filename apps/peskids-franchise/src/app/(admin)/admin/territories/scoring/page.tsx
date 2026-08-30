"use client";

import { useState, useEffect } from "react";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import ScoreBreakdown from "@/components/territories/ScoreBreakdown";
import { ArrowPathIcon, MapIcon, ChartBarIcon } from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

interface Territory {
  id: string;
  name: string;
  state: string;
  status: string;
  territoryScore?: number | null;
  population?: number | null;
}

interface ScoreResult {
  score: number;
  tier: string;
  tierColor: string;
  factors: Array<{
    name: string;
    value: number;
    normalized: number;
    weight: number;
    weighted: number;
  }>;
  areaSqMiles: number;
}

export default function ScoringPage() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [batchScoring, setBatchScoring] = useState(false);

  useEffect(() => {
    fetchTerritories();
  }, []);

  const fetchTerritories = async () => {
    try {
      const res = await fetch("/api/admin/territories?limit=500");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTerritories(data.territories || []);
    } catch (err) {
      console.error("Failed to fetch territories:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScore = async (id: string) => {
    setScoring(true);
    try {
      const res = await fetch(`/api/admin/territories/${id}/score`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to score");
      const result = await res.json();
      setScoreResult(result);
      await fetchTerritories();
    } catch (err) {
      console.error("Failed to score territory:", err);
    } finally {
      setScoring(false);
    }
  };

  const handleBatchScore = async () => {
    setBatchScoring(true);
    try {
      for (const t of territories) {
        await fetch(`/api/admin/territories/${t.id}/score`, { method: "POST" });
      }
      await fetchTerritories();
    } catch (err) {
      console.error("Batch scoring failed:", err);
    } finally {
      setBatchScoring(false);
    }
  };

  const selected = territories.find((t) => t.id === selectedId);

  // Sort territories by score for ranking table
  const ranked = [...territories]
    .filter((t) => t.territoryScore != null)
    .sort((a, b) => (b.territoryScore || 0) - (a.territoryScore || 0));

  if (isLoading) {
    return (
      <WideContainer>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
        </div>
      </WideContainer>
    );
  }

  return (
    <WideContainer>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Territory Scoring</h1>
          <p className="text-sm text-gray-500 mt-1">
            Calculate and compare territory viability scores
          </p>
        </div>
        <button
          onClick={handleBatchScore}
          disabled={batchScoring}
          className="flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-purple transition-colors disabled:opacity-50"
        >
          <ChartBarIcon className="h-4 w-4" />
          {batchScoring ? "Scoring All..." : "Score All Territories"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Territory List with Scores */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Rankings</h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {territories.map((t, idx) => {
              const rank = ranked.findIndex((r) => r.id === t.id) + 1;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedId(t.id);
                    handleScore(t.id);
                  }}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                    selectedId === t.id ? "bg-brand-light border-l-4 border-brand-navy" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{t.state}</p>
                    </div>
                    {t.territoryScore != null ? (
                      <div className="text-right">
                        <span className="text-lg font-bold text-brand-navy">
                          {t.territoryScore}
                        </span>
                        <p className="text-xs text-gray-500">#{rank}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Unscored</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Score Detail */}
        <div className="lg:col-span-2">
          {selected && scoreResult ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">{selected.name}</h2>
                <button
                  onClick={() => handleScore(selected.id)}
                  disabled={scoring}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${scoring ? "animate-spin" : ""}`} />
                  Recalculate
                </button>
              </div>
              <ScoreBreakdown
                score={scoreResult}
                onRecalculate={() => handleScore(selected.id)}
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <MapIcon className="h-12 w-12 mx-auto mb-3" />
              <p className="text-lg font-medium">Select a Territory</p>
              <p className="text-sm mt-1">Click a territory to view its score breakdown</p>
            </div>
          )}
        </div>
      </div>
    </WideContainer>
  );
}
