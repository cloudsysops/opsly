"use client";

import { useState, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  AcademicCapIcon,
  BuildingStorefrontIcon,
  BuildingLibraryIcon,
  SparklesIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

interface POIResult {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  address?: string;
}

interface POISearchPanelProps {
  territoryId: string;
  bounds?: { south: number; west: number; north: number; east: number };
  onResultsChange?: (results: POIResult[]) => void;
}

const CATEGORIES = [
  { id: "schools", label: "Schools", icon: AcademicCapIcon, color: "bg-blue-100 text-blue-700" },
  { id: "competitors", label: "Competitors", icon: BuildingStorefrontIcon, color: "bg-red-100 text-red-700" },
  { id: "community", label: "Community", icon: BuildingLibraryIcon, color: "bg-green-100 text-green-700" },
  { id: "recreation", label: "Recreation", icon: SparklesIcon, color: "bg-purple-100 text-purple-700" },
  { id: "childcare", label: "Childcare", icon: UserGroupIcon, color: "bg-amber-100 text-amber-700" },
];

export default function POISearchPanel({
  territoryId,
  bounds,
  onResultsChange,
}: POISearchPanelProps) {
  const [results, setResults] = useState<POIResult[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [customQuery, setCustomQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const searchCategory = useCallback(
    async (category: string) => {
      if (!bounds) return;
      setIsLoading(true);
      setActiveCategory(category);

      try {
        const res = await fetch("/api/admin/territories/poi/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bounds, category, marketId: territoryId }),
        });

        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        const newResults = data.results || [];
        setResults(newResults);
        setCategoryCounts((prev) => ({
          ...prev,
          [category]: newResults.length,
        }));
        onResultsChange?.(newResults);
      } catch (err) {
        console.error("POI search error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [bounds, territoryId, onResultsChange]
  );

  const searchCustom = useCallback(async () => {
    if (!bounds || !customQuery.trim()) return;
    setIsLoading(true);
    setActiveCategory("custom");

    try {
      const res = await fetch("/api/admin/territories/poi/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bounds,
          keyword: customQuery.trim(),
          marketId: territoryId,
        }),
      });

      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.results || []);
      onResultsChange?.(data.results || []);
    } catch (err) {
      console.error("Custom search error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [bounds, customQuery, territoryId, onResultsChange]);

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Points of Interest
      </h4>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const count = categoryCounts[cat.id];
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => searchCategory(cat.id)}
              disabled={!bounds || isLoading}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
                activeCategory === cat.id
                  ? "bg-brand-navy text-white"
                  : cat.color
              } disabled:opacity-50`}
            >
              <Icon className="h-3 w-3" />
              {cat.label}
              {count !== undefined && (
                <span className="ml-0.5 bg-white/20 px-1 rounded-full">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-1.5">
        <input
          type="text"
          value={customQuery}
          onChange={(e) => setCustomQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchCustom()}
          placeholder="Custom search..."
          className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-brand-navy focus:outline-none"
        />
        <button
          type="button"
          onClick={searchCustom}
          disabled={!bounds || isLoading}
          className="px-2 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
        >
          <MagnifyingGlassIcon className="h-3.5 w-3.5 text-gray-600" />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-3">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-navy border-t-transparent" />
          <span className="ml-2 text-xs text-gray-500">Searching...</span>
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          <p className="text-[10px] text-gray-500">
            {results.length} results found
          </p>
          {results.map((poi) => (
            <div
              key={poi.id}
              className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-xs"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {poi.name}
                </p>
                {poi.address && (
                  <p className="text-gray-500 truncate">{poi.address}</p>
                )}
              </div>
              <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-gray-100 text-[10px] text-gray-600">
                {poi.category}
              </span>
            </div>
          ))}
        </div>
      )}

      {!isLoading && results.length === 0 && activeCategory && (
        <p className="text-xs text-gray-400 text-center py-2">
          No results found
        </p>
      )}

      {!bounds && (
        <p className="text-xs text-gray-400 text-center py-2">
          Select a territory to search for POIs
        </p>
      )}
    </div>
  );
}
