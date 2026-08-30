"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { CalendarIcon } from "@heroicons/react/24/outline";

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
}

const presets = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 12 months", days: 365 },
  { label: "All time", days: 0 },
];

export default function DateRangeFilter({
  startDate,
  endDate,
}: DateRangeFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);

  useEffect(() => {
    setStart(startDate);
    setEnd(endDate);
  }, [startDate, endDate]);

  const applyFilter = (newStart: string, newEnd: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("start", newStart);
    params.set("end", newEnd);
    router.push(`/admin/analytics?${params.toString()}`);
  };

  const handlePreset = (days: number) => {
    const end = new Date();
    const endStr = end.toISOString().split("T")[0];

    let startStr: string;
    if (days === 0) {
      // All time - use a very old date
      startStr = "2020-01-01";
    } else {
      const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
      startStr = start.toISOString().split("T")[0];
    }

    applyFilter(startStr, endStr);
  };

  const handleCustomApply = () => {
    applyFilter(start, end);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handlePreset(preset.days)}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-slate-500">
          <CalendarIcon className="h-4 w-4" />
          <span className="text-sm">Custom:</span>
        </div>
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-cyan/50"
        />
        <span className="text-slate-400">to</span>
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-cyan/50"
        />
        <button
          onClick={handleCustomApply}
          className="px-3 py-1.5 text-sm font-medium text-white bg-brand-navy rounded-lg hover:bg-brand-purple transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
