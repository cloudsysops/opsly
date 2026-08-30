"use client";

import { useState, useEffect } from "react";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import TerritoryComparisonView from "@/components/territories/TerritoryComparisonView";
import ReportGenerator from "@/components/territories/ReportGenerator";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

interface Territory {
  id: string;
  name: string;
  state: string;
  status: string;
  territoryScore?: number | null;
  population?: number | null;
  medianIncome?: number | null;
  children5to12?: number | null;
}

export default function ReportsPage() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"reports" | "compare">("reports");

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
        <h1 className="text-2xl font-bold text-gray-900">Reports & Comparison</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate territory reports and compare territories side-by-side
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px space-x-6">
          {(["reports", "compare"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-brand-navy text-brand-navy"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "reports" ? "Generate Reports" : "Compare Territories"}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "reports" ? (
        territories.length > 0 ? (
          <ReportGenerator territories={territories} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            <DocumentTextIcon className="h-12 w-12 mx-auto mb-3" />
            <p className="text-lg font-medium">No Territories</p>
            <p className="text-sm mt-1">Create territories first to generate reports</p>
          </div>
        )
      ) : (
        <TerritoryComparisonView territories={territories} />
      )}
    </WideContainer>
  );
}
