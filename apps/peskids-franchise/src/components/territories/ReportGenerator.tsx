"use client";

import { useState } from "react";
import {
  DocumentChartBarIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";

interface Territory {
  id: string;
  name: string;
  state: string;
}

interface ReportGeneratorProps {
  territories: Territory[];
}

type ReportType = "analysis" | "comparison" | "sales";

const REPORT_TYPES = [
  { id: "analysis" as const, label: "Territory Analysis", description: "Full analysis of a single territory" },
  { id: "comparison" as const, label: "Territory Comparison", description: "Side-by-side comparison of 2-4 territories" },
  { id: "sales" as const, label: "Franchise Sales Package", description: "Prospect-facing territory highlights" },
];

export default function ReportGenerator({
  territories,
}: ReportGeneratorProps) {
  const [reportType, setReportType] = useState<ReportType>("analysis");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTerritory = (id: string) => {
    if (reportType === "analysis" || reportType === "sales") {
      setSelectedIds([id]);
    } else {
      setSelectedIds((prev) =>
        prev.includes(id)
          ? prev.filter((i) => i !== id)
          : prev.length < 4
            ? [...prev, id]
            : prev
      );
    }
  };

  const handleGenerate = async () => {
    if (selectedIds.length === 0) return;
    setIsLoading(true);
    setError(null);

    try {
      let url: string;
      let options: RequestInit;

      if (reportType === "comparison") {
        url = "/api/admin/territories/compare";
        options = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ territoryIds: selectedIds }),
        };
      } else {
        url = `/api/admin/territories/${selectedIds[0]}/report`;
        options = { method: "GET" };
      }

      const res = await fetch(url, options);
      if (!res.ok) throw new Error("Failed to generate report");
      const data = await res.json();
      setReport(data.report || data.comparison || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (report) {
      navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    }
  };

  const handleDownload = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `territory-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <DocumentChartBarIcon className="h-5 w-5 text-brand-navy" />
        <h3 className="text-sm font-semibold text-gray-900">
          Generate Report
        </h3>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Report Type
        </label>
        <div className="space-y-2">
          {REPORT_TYPES.map((rt) => (
            <button
              key={rt.id}
              type="button"
              onClick={() => {
                setReportType(rt.id);
                setSelectedIds([]);
                setReport(null);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                reportType === rt.id
                  ? "border-brand-navy bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p className="text-xs font-medium text-gray-900">{rt.label}</p>
              <p className="text-[10px] text-gray-500">{rt.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Select Territor{reportType === "comparison" ? "ies (2-4)" : "y"}
        </label>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {territories.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleTerritory(t.id)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs ${
                selectedIds.includes(t.id)
                  ? "bg-brand-navy text-white"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="flex-1 text-left">{t.name}</span>
              <span className="text-[10px] opacity-70">{t.state}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={selectedIds.length === 0 || isLoading}
        className="w-full rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
      >
        {isLoading ? "Generating..." : "Generate Report"}
      </button>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {report && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <ClipboardDocumentIcon className="h-3.5 w-3.5" />
              Copy
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <ArrowDownTrayIcon className="h-3.5 w-3.5" />
              Download
            </button>
          </div>
          <pre className="max-h-40 overflow-auto rounded-lg bg-gray-50 p-3 text-[10px] text-gray-700">
            {JSON.stringify(report, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
