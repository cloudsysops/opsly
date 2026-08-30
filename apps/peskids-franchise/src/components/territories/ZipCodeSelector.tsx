"use client";

import { useState, useCallback } from "react";
import { XMarkIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface ZipCodeSelectorProps {
  onComplete: (polygon: GeoJSON.Feature, zipCodes: string[]) => void;
  onCancel: () => void;
}

interface ZipResult {
  zip: string;
  city: string;
  state: string;
}

export default function ZipCodeSelector({
  onComplete,
  onCancel,
}: ZipCodeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ZipResult[]>([]);
  const [selectedZips, setSelectedZips] = useState<ZipResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/territories/geocode?q=${encodeURIComponent(searchQuery)}&types=postcode`
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setSearchResults(
        (data.results || []).map(
          (r: { text: string; place_name: string }) => ({
            zip: r.text,
            city: r.place_name?.split(",")[0] || "",
            state: "",
          })
        )
      );
    } catch {
      // Fallback: treat query as ZIP code directly
      if (/^\d{5}$/.test(searchQuery.trim())) {
        setSearchResults([
          { zip: searchQuery.trim(), city: "ZIP Code", state: "" },
        ]);
      }
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const addZip = (zip: ZipResult) => {
    if (!selectedZips.find((z) => z.zip === zip.zip)) {
      setSelectedZips([...selectedZips, zip]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeZip = (zipCode: string) => {
    setSelectedZips(selectedZips.filter((z) => z.zip !== zipCode));
  };

  const handleMerge = async () => {
    if (selectedZips.length === 0) return;
    setIsMerging(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/territories/zip-boundaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zipCodes: selectedZips.map((z) => z.zip),
        }),
      });

      if (!res.ok) throw new Error("Failed to merge boundaries");
      const data = await res.json();
      if (data.boundary) {
        onComplete(
          data.boundary,
          selectedZips.map((z) => z.zip)
        );
      } else {
        throw new Error("No boundary generated");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to merge boundaries"
      );
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Enter ZIP codes to build a territory from postal boundaries.
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Enter ZIP code..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
        >
          {isSearching ? "..." : "Search"}
        </button>
      </div>

      {searchResults.length > 0 && (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-32 overflow-y-auto">
          {searchResults.map((r) => (
            <button
              key={r.zip}
              type="button"
              onClick={() => addZip(r)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex justify-between"
            >
              <span className="font-medium">{r.zip}</span>
              <span className="text-gray-500">{r.city}</span>
            </button>
          ))}
        </div>
      )}

      {selectedZips.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Selected ZIP Codes ({selectedZips.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {selectedZips.map((z) => (
              <span
                key={z.zip}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-navy/10 text-brand-navy text-xs font-medium"
              >
                {z.zip}
                <button
                  type="button"
                  onClick={() => removeZip(z.zip)}
                  className="hover:text-red-500"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleMerge}
          disabled={selectedZips.length === 0 || isMerging}
          className="flex-1 rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
        >
          {isMerging ? "Merging..." : "Merge Boundaries"}
        </button>
      </div>
    </div>
  );
}
