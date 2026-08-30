"use client";

import { useState } from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

interface ExportButtonProps {
  startDate: string;
  endDate: string;
}

export default function ExportButton({ startDate, endDate }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch(
        `/api/admin/analytics/export?start=${startDate}&end=${endDate}`
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prospects-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
      setAlertMsg("Failed to export data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleExport}
        disabled={exporting}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exporting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-slate-600" />
            Exporting...
          </>
        ) : (
          <>
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export CSV
          </>
        )}
      </button>

      <ConfirmModal
        isOpen={!!alertMsg}
        title="Notice"
        message={alertMsg || ""}
        confirmLabel="OK"
        cancelLabel=""
        confirmVariant="primary"
        onConfirm={() => setAlertMsg(null)}
        onCancel={() => setAlertMsg(null)}
      />
    </>
  );
}
