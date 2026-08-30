"use client";

import { useState, useEffect } from "react";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import POISearchPanel from "@/components/territories/POISearchPanel";
import CompetitorList from "@/components/territories/CompetitorList";
import { MapIcon } from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

interface Territory {
  id: string;
  name: string;
  state: string;
  competitorCount?: number | null;
  schoolCount?: number | null;
}

export default function CompetitorsPage() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        <h1 className="text-2xl font-bold text-gray-900">Competitor Analysis</h1>
        <p className="text-sm text-gray-500 mt-1">
          Search and track competitors within territory boundaries
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
                  {t.competitorCount != null ? `${t.competitorCount} competitors` : "Not scanned"}{" "}
                  &middot;{" "}
                  {t.schoolCount != null ? `${t.schoolCount} schools` : ""}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Competitor Panel */}
        <div className="lg:col-span-2 space-y-6">
          {selected ? (
            <>
              <POISearchPanel territoryId={selected.id} />
              <CompetitorList territoryId={selected.id} competitors={[]} />
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <MapIcon className="h-12 w-12 mx-auto mb-3" />
              <p className="text-lg font-medium">Select a Territory</p>
              <p className="text-sm mt-1">Choose a territory to search for competitors and POI</p>
            </div>
          )}
        </div>
      </div>
    </WideContainer>
  );
}
