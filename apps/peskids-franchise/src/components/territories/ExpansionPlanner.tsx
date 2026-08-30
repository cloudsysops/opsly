"use client";

import { useState } from "react";
import {
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface Territory {
  id: string;
  name: string;
  state: string;
  territoryScore?: number | null;
}

interface WhiteSpaceSuggestion {
  lat: number;
  lng: number;
  city: string;
  state: string;
  estimatedScore: number;
  rationale: string;
}

interface OverlapResult {
  territory1: { id: string; name: string };
  territory2: { id: string; name: string };
  overlapPercentage: number;
  overlapArea: number;
}

interface ExpansionPlannerProps {
  territories: Territory[];
}

export default function ExpansionPlanner({
  territories,
}: ExpansionPlannerProps) {
  const [suggestions, setSuggestions] = useState<WhiteSpaceSuggestion[]>([]);
  const [overlaps, setOverlaps] = useState<OverlapResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCheckingOverlap, setIsCheckingOverlap] = useState(false);

  const runWhiteSpaceAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/admin/territories/whitespace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error("White space analysis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runCannibalizationCheck = async () => {
    setIsCheckingOverlap(true);
    try {
      const res = await fetch("/api/admin/territories/cannibalization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Check failed");
      const data = await res.json();
      setOverlaps(data.overlaps || []);
    } catch (err) {
      console.error("Cannibalization check error:", err);
    } finally {
      setIsCheckingOverlap(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* White Space Analysis */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">
            White Space Analysis
          </h4>
          <button
            type="button"
            onClick={runWhiteSpaceAnalysis}
            disabled={isAnalyzing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-navy text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"
          >
            <MagnifyingGlassIcon className="h-3.5 w-3.5" />
            {isAnalyzing ? "Analyzing..." : "Run Analysis"}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Find high-potential areas not covered by existing territories.
        </p>

        {suggestions.length > 0 && (
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-900">
                    {s.city}, {s.state}
                  </p>
                  <p className="text-[10px] text-gray-500">{s.rationale}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-brand-navy">
                    {s.estimatedScore}
                  </p>
                  <p className="text-[10px] text-gray-400">Score</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cannibalization Check */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">
            Cannibalization Check
          </h4>
          <button
            type="button"
            onClick={runCannibalizationCheck}
            disabled={isCheckingOverlap || territories.length < 2}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <ExclamationTriangleIcon className="h-3.5 w-3.5" />
            {isCheckingOverlap ? "Checking..." : "Check Overlaps"}
          </button>
        </div>

        {overlaps.length > 0 && (
          <div className="space-y-2">
            {overlaps.map((o, i) => {
              const severity =
                o.overlapPercentage > 30
                  ? "High"
                  : o.overlapPercentage > 15
                    ? "Moderate"
                    : "Low";
              const severityColor =
                severity === "High"
                  ? "bg-red-100 text-red-700"
                  : severity === "Moderate"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-green-100 text-green-700";

              return (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-900">
                      {o.territory1.name} & {o.territory2.name}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {o.overlapArea.toFixed(1)} sq mi overlap
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${severityColor}`}
                  >
                    {severity} ({o.overlapPercentage.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {overlaps.length === 0 && !isCheckingOverlap && (
          <p className="text-xs text-gray-400">
            No overlap analysis run yet.
          </p>
        )}
      </div>
    </div>
  );
}
