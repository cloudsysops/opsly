"use client";

import { useState, useEffect } from "react";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import ExpansionPlanner from "@/components/territories/ExpansionPlanner";
import ExpansionRoadmap from "@/components/territories/ExpansionRoadmap";

export const dynamic = "force-dynamic";

interface Territory {
  id: string;
  name: string;
  state: string;
  status: string;
  centerLat?: number | null;
  centerLng?: number | null;
  radiusMiles?: number | null;
  territoryScore?: number | null;
}

export default function ExpansionPage() {
  const [activeTab, setActiveTab] = useState<"planner" | "roadmap">("planner");
  const [territories, setTerritories] = useState<Territory[]>([]);

  useEffect(() => {
    fetch("/api/admin/territories?limit=500")
      .then((r) => r.json())
      .then((d) => setTerritories(d.territories || []))
      .catch(console.error);
  }, []);

  return (
    <WideContainer>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Expansion Planning</h1>
        <p className="text-sm text-gray-500 mt-1">
          Identify growth opportunities and manage territory pipeline
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px space-x-6">
          {(["planner", "roadmap"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-brand-navy text-brand-navy"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "planner" ? "White Space Analysis" : "Expansion Roadmap"}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "planner" ? (
        <ExpansionPlanner territories={territories} />
      ) : (
        <ExpansionRoadmap territories={territories} />
      )}
    </WideContainer>
  );
}
