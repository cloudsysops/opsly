"use client";

import { useEffect, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface PipelineFiltersProps {
  filters: {
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    territoryFilter: string;
    setTerritoryFilter: (t: string) => void;
    scoreFilter: string;
    setScoreFilter: (s: string) => void;
  };
  territories: string[];
}

export function PipelineFilters({ filters, territories }: PipelineFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.searchQuery);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      filters.setSearchQuery(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, filters.setSearchQuery]);

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email, or territory..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-cyan/50 focus:border-brand-cyan"
        />
      </div>

      {/* Territory Filter */}
      <select
        value={filters.territoryFilter}
        onChange={(e) => filters.setTerritoryFilter(e.target.value)}
        className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-cyan/50 focus:border-brand-cyan bg-white"
      >
        <option value="all">All Territories</option>
        {territories.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {/* Score Filter */}
      <select
        value={filters.scoreFilter}
        onChange={(e) => filters.setScoreFilter(e.target.value)}
        className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-cyan/50 focus:border-brand-cyan bg-white"
      >
        <option value="all">All Scores</option>
        <option value="high">High (80+)</option>
        <option value="medium">Medium (50-79)</option>
        <option value="low">Low (&lt;50)</option>
      </select>
    </div>
  );
}
