"use client";

import { useState, useEffect } from "react";

interface AdminBoundaryConfig {
  level: "state" | "county";
  stateCode: string;
  countyName?: string;
}

interface AdminBoundarySelectorProps {
  onComplete: (polygon: GeoJSON.Feature, config: AdminBoundaryConfig) => void;
  onCancel: () => void;
}

const US_STATES = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" }, { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" }, { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" }, { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" }, { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" }, { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" }, { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" }, { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" }, { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" }, { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" }, { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" }, { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" }, { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" }, { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" }, { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" }, { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

export default function AdminBoundarySelector({
  onComplete,
  onCancel,
}: AdminBoundarySelectorProps) {
  const [level, setLevel] = useState<"state" | "county">("county");
  const [stateCode, setStateCode] = useState("");
  const [counties, setCounties] = useState<{ name: string; fips: string }[]>([]);
  const [selectedCounty, setSelectedCounty] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (level === "county" && stateCode) {
      loadCounties();
    }
  }, [stateCode, level]);

  const loadCounties = async () => {
    try {
      const res = await fetch(
        `/api/admin/territories/boundaries?type=county&stateCode=${stateCode}`
      );
      if (!res.ok) return;
      const data = await res.json();
      const countyList = (data.features || []).map(
        (f: { properties: { NAME: string; COUNTY: string } }) => ({
          name: f.properties.NAME,
          fips: f.properties.COUNTY,
        })
      );
      setCounties(countyList.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)));
    } catch {
      setCounties([]);
    }
  };

  const handleSubmit = async () => {
    if (!stateCode) {
      setError("Please select a state.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        type: level,
        stateCode,
      });
      if (level === "county" && selectedCounty) {
        params.set("countyName", selectedCounty);
      }

      const res = await fetch(
        `/api/admin/territories/boundaries?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch boundary");
      const data = await res.json();

      let feature: GeoJSON.Feature | null = null;
      if (data.features && data.features.length > 0) {
        feature = level === "county" && selectedCounty
          ? data.features.find(
              (f: GeoJSON.Feature) =>
                (f.properties as Record<string, string>)?.NAME === selectedCounty
            ) || data.features[0]
          : data.features[0];
      }

      if (feature) {
        onComplete(feature, {
          level,
          stateCode,
          countyName: selectedCounty || undefined,
        });
      } else {
        throw new Error("No boundary found");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch boundary"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Select an administrative boundary to use as territory.
      </p>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Boundary Level
        </label>
        <div className="flex gap-2">
          {(["state", "county"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                level === l
                  ? "bg-brand-navy text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {l.charAt(0).toUpperCase() + l.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700">
          State <span className="text-red-500">*</span>
        </label>
        <select
          value={stateCode}
          onChange={(e) => {
            setStateCode(e.target.value);
            setSelectedCounty("");
          }}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
        >
          <option value="">Select a state</option>
          {US_STATES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {level === "county" && stateCode && (
        <div>
          <label className="block text-xs font-medium text-gray-700">
            County
          </label>
          <select
            value={selectedCounty}
            onChange={(e) => setSelectedCounty(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
          >
            <option value="">All counties (entire state)</option>
            {counties.map((c) => (
              <option key={c.fips} value={c.name}>
                {c.name} County
              </option>
            ))}
          </select>
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
          onClick={handleSubmit}
          disabled={!stateCode || isLoading}
          className="flex-1 rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
        >
          {isLoading ? "Loading..." : "Use Boundary"}
        </button>
      </div>
    </div>
  );
}
