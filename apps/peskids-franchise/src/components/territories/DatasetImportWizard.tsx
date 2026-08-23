"use client";

import { useState, useRef } from "react";
import {
  ArrowUpTrayIcon,
  CheckIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

interface ColumnDef {
  name: string;
  type: string;
  mapping: string;
}

interface DatasetImportWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

const STEPS = ["Upload", "Map Columns", "Preview", "Import"];

const COLUMN_MAPPINGS = [
  { value: "skip", label: "Skip" },
  { value: "address", label: "Address" },
  { value: "city", label: "City" },
  { value: "state", label: "State" },
  { value: "zip", label: "ZIP Code" },
  { value: "lat", label: "Latitude" },
  { value: "lng", label: "Longitude" },
  { value: "name", label: "Name" },
  { value: "value", label: "Value" },
];

function autoDetectMapping(colName: string): string {
  const lower = colName.toLowerCase();
  if (lower.includes("address") || lower.includes("street")) return "address";
  if (lower === "city" || lower.includes("city")) return "city";
  if (lower === "state" || lower.includes("state")) return "state";
  if (lower.includes("zip") || lower.includes("postal")) return "zip";
  if (lower.includes("lat")) return "lat";
  if (lower.includes("lng") || lower.includes("lon")) return "lng";
  if (lower.includes("name")) return "name";
  return "skip";
}

export default function DatasetImportWizard({
  onComplete,
  onCancel,
}: DatasetImportWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [fileName, setFileName] = useState("");
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [datasetName, setDatasetName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    total: number;
    geocoded: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setDatasetName(file.name.replace(/\.(csv|xlsx?)$/i, ""));

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        setError("File must have at least a header row and one data row.");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      const columnDefs: ColumnDef[] = headers.map((h) => ({
        name: h,
        type: "text",
        mapping: autoDetectMapping(h),
      }));
      setColumns(columnDefs);

      const dataRows = lines.slice(1, Math.min(lines.length, 101)).map((line) => {
        const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          row[h] = values[i] || "";
        });
        return row;
      });
      setRows(dataRows);
      setError(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setIsImporting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/territories/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: datasetName,
          columns: columns.map((c) => ({
            name: c.name,
            type: c.type,
            mapping: c.mapping,
          })),
          rows: rows.map((row) => {
            const mapped: Record<string, string> = {};
            columns.forEach((col) => {
              if (col.mapping !== "skip") {
                mapped[col.mapping] = row[col.name];
              }
            });
            mapped._raw = JSON.stringify(row);
            return mapped;
          }),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Import failed");
      }

      const data = await res.json();
      setImportResult({
        total: data.pointsCreated || rows.length,
        geocoded: data.geocodedCount || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Import Dataset
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between px-2">
        {STEPS.map((label, index) => (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${
                  index < currentStep
                    ? "bg-brand-green text-white"
                    : index === currentStep
                      ? "bg-brand-navy text-white"
                      : "bg-gray-300 text-gray-600"
                }`}
              >
                {index < currentStep ? (
                  <CheckIcon className="h-3 w-3" />
                ) : (
                  index + 1
                )}
              </div>
              <span className="mt-0.5 text-[9px] text-gray-500">{label}</span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`mx-1 mt-[-10px] h-0.5 w-4 ${
                  index < currentStep ? "bg-brand-green" : "bg-gray-300"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Step 0: Upload */}
      {currentStep === 0 && (
        <div className="space-y-3">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-brand-navy hover:bg-blue-50/30 transition-colors"
          >
            {fileName ? (
              <div className="flex items-center justify-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-brand-navy" />
                <span className="text-sm font-medium text-gray-900">
                  {fileName}
                </span>
              </div>
            ) : (
              <>
                <ArrowUpTrayIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Click or drag to upload CSV
                </p>
                <p className="text-xs text-gray-400 mt-1">CSV files only</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          {fileName && (
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Dataset Name
              </label>
              <input
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
              />
            </div>
          )}
        </div>
      )}

      {/* Step 1: Column Mapping */}
      {currentStep === 1 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {columns.map((col, i) => (
            <div key={col.name} className="flex items-center gap-2">
              <span className="text-xs text-gray-700 w-24 truncate">
                {col.name}
              </span>
              <select
                value={col.mapping}
                onChange={(e) => {
                  const updated = [...columns];
                  updated[i] = { ...updated[i], mapping: e.target.value };
                  setColumns(updated);
                }}
                className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-brand-navy focus:outline-none"
              >
                {COLUMN_MAPPINGS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-gray-400 w-16 truncate">
                {rows[0]?.[col.name] || ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Step 2: Preview */}
      {currentStep === 2 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-600">
            Previewing {Math.min(10, rows.length)} of {rows.length} rows
          </p>
          <div className="overflow-x-auto max-h-48">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b">
                  {columns
                    .filter((c) => c.mapping !== "skip")
                    .map((c) => (
                      <th
                        key={c.name}
                        className="px-2 py-1 text-left font-medium text-gray-500"
                      >
                        {c.mapping}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {columns
                      .filter((c) => c.mapping !== "skip")
                      .map((c) => (
                        <td
                          key={c.name}
                          className="px-2 py-1 text-gray-700 truncate max-w-[100px]"
                        >
                          {row[c.name]}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step 3: Import */}
      {currentStep === 3 && (
        <div className="space-y-3 text-center py-4">
          {isImporting && (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-navy border-t-transparent mx-auto" />
              <p className="text-sm text-gray-600">Importing data...</p>
            </>
          )}
          {importResult && (
            <>
              <CheckIcon className="h-8 w-8 text-brand-green mx-auto" />
              <p className="text-sm font-medium text-gray-900">
                Import Complete
              </p>
              <p className="text-xs text-gray-500">
                {importResult.total} data points imported
              </p>
            </>
          )}
          {!isImporting && !importResult && (
            <>
              <p className="text-sm text-gray-600">
                Ready to import {rows.length} rows
              </p>
              <button
                type="button"
                onClick={handleImport}
                className="px-4 py-2 bg-brand-navy text-white text-sm font-medium rounded-lg hover:bg-opacity-90"
              >
                Start Import
              </button>
            </>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2">
        {currentStep > 0 && !importResult && (
          <button
            type="button"
            onClick={() => setCurrentStep((s) => s - 1)}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
        )}
        {currentStep < 3 && (
          <button
            type="button"
            onClick={() => setCurrentStep((s) => s + 1)}
            disabled={currentStep === 0 && !fileName}
            className="flex-1 rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
          >
            Next
          </button>
        )}
        {importResult && (
          <button
            type="button"
            onClick={onComplete}
            className="flex-1 rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
