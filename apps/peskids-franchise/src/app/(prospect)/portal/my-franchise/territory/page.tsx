"use client";

import { useState, useEffect } from "react";
import { DefaultContainer } from "@/components/shared/ResponsiveContainer";
import FranchiseeMapView from "@/components/territories/FranchiseeMapView";
import { MapIcon } from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

interface Territory {
  id: string;
  name: string;
  state: string;
  status: string;
  boundaryGeoJson?: unknown;
  centerLat?: number | null;
  centerLng?: number | null;
  radiusMiles?: number | null;
  population?: number | null;
  medianIncome?: number | null;
  children5to12?: number | null;
  territoryScore?: number | null;
  color?: string | null;
}

export default function FranchiseeTerritoryPage() {
  const [territory, setTerritory] = useState<Territory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/franchisee/territory")
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("No territory assigned yet");
          throw new Error("Failed to load territory");
        }
        return res.json();
      })
      .then(setTerritory)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <DefaultContainer>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
        </div>
      </DefaultContainer>
    );
  }

  if (error || !territory) {
    return (
      <DefaultContainer>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <MapIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">My Territory</h2>
          <p className="text-sm text-gray-500">
            {error || "Your territory will appear here once assigned."}
          </p>
        </div>
      </DefaultContainer>
    );
  }

  return (
    <DefaultContainer>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Territory</h1>
        <p className="text-sm text-gray-500 mt-1">
          {territory.name} &middot; {territory.state}
        </p>
      </div>

      <FranchiseeMapView territory={territory} />
    </DefaultContainer>
  );
}
