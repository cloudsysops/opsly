"use client";

import { useState, useEffect } from "react";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import DemographicsPanel from "@/components/territories/DemographicsPanel";
import HeatmapControls from "@/components/territories/HeatmapControls";
import { ArrowPathIcon, MapIcon } from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

interface Territory {
  id: string;
  name: string;
  state: string;
  population?: number | null;
  medianIncome?: number | null;
  children5to12?: number | null;
  householdsWithChildren?: number | null;
  totalHouseholds?: number | null;
  demographicsUpdatedAt?: string | null;
}

export default function DemographicsPage() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);

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

  const handleRefreshDemographics = async (id: string) => {
    setRefreshing(id);
    try {
      const territory = territories.find((t) => t.id === id);
      const res = await fetch(`/api/admin/territories/${id}/demographics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stateCode: territory?.state }),
      });
      if (!res.ok) throw new Error("Failed to refresh");
      await fetchTerritories();
    } catch (err) {
      console.error("Failed to refresh demographics:", err);
    } finally {
      setRefreshing(null);
    }
  };

  const selected = territories.find((t) => t.id === selectedId);

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Territory Demographics</h1>
        <p className="text-sm text-gray-500 mt-1">
          View and refresh demographic data from the US Census Bureau
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Territory List */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Territories</h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {territories.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                  selectedId === t.id ? "bg-brand-light border-l-4 border-brand-navy" : ""
                }`}
              >
                <p className="font-medium text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {t.state} &middot;{" "}
                  {t.population
                    ? `Pop: ${t.population.toLocaleString()}`
                    : "No data"}
                </p>
              </button>
            ))}
            {territories.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                <MapIcon className="h-8 w-8 mx-auto mb-2" />
                <p>No territories yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Demographics Panel */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">{selected.name}</h2>
                <button
                  onClick={() => handleRefreshDemographics(selected.id)}
                  disabled={refreshing === selected.id}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-brand-navy text-white rounded-lg hover:bg-brand-purple transition-colors disabled:opacity-50"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${refreshing === selected.id ? "animate-spin" : ""}`} />
                  {refreshing === selected.id ? "Refreshing..." : "Refresh Data"}
                </button>
              </div>
              <DemographicsPanel
                territoryId={selected.id}
                onRefresh={() => handleRefreshDemographics(selected.id)}
                isLoading={refreshing === selected.id}
                lastUpdated={selected.demographicsUpdatedAt}
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <MapIcon className="h-12 w-12 mx-auto mb-3" />
              <p className="text-lg font-medium">Select a Territory</p>
              <p className="text-sm mt-1">Choose a territory to view its demographic data</p>
            </div>
          )}
        </div>
      </div>
    </WideContainer>
  );
}
