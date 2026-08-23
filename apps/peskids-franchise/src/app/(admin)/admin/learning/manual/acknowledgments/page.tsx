"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import {
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { WideContainer } from "@/components/shared/ResponsiveContainer";

interface AckPage {
  id: string;
  title: string;
  sectionTitle: string | null;
  version: number;
}

interface AckFranchisee {
  id: string;
  name: string;
  territory: string | null;
  progress: number;
  acknowledgments: Record<
    string,
    {
      status: "acknowledged" | "outdated" | "pending";
      acknowledgedAt: string | null;
      acknowledgedVersion: number | null;
    }
  >;
}

interface AckData {
  pages: AckPage[];
  franchisees: AckFranchisee[];
  stats: {
    completionRate: number;
    acknowledged: number;
    outdated: number;
    pending: number;
  };
}

export default function AcknowledgmentsDashboardPage() {
  const [data, setData] = useState<AckData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/operations/manual/acknowledgments");
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Failed to fetch acknowledgment data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          Failed to load acknowledgment data. Please try again.
        </p>
      </div>
    );
  }

  const { pages, franchisees, stats } = data;

  return (
    <WideContainer className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ClipboardDocumentCheckIcon className="h-8 w-8 text-brand-navy" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">
            Manual Acknowledgments
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Track franchisee acknowledgment of operations manual pages
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <ClipboardDocumentCheckIcon className="h-4 w-4" />
            Completion Rate
          </div>
          <p className="text-2xl font-bold text-brand-navy">
            {stats.completionRate}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <CheckCircleIcon className="h-4 w-4" />
            Acknowledged
          </div>
          <p className="text-2xl font-bold text-green-600">
            {stats.acknowledged}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <ExclamationTriangleIcon className="h-4 w-4" />
            Outdated
          </div>
          <p className="text-2xl font-bold text-amber-600">
            {stats.outdated}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <ClockIcon className="h-4 w-4" />
            Pending
          </div>
          <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
        </div>
      </div>

      {/* Matrix Table */}
      {pages.length === 0 || franchisees.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">
            No acknowledgment data yet
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {pages.length === 0
              ? "Create manual pages with acknowledgment requirements to see data here."
              : "No franchisees found to track acknowledgments for."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="sticky left-0 z-10 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3 min-w-[200px]">
                    Franchisee
                  </th>
                  {pages.map((page) => (
                    <th
                      key={page.id}
                      className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 min-w-[120px]"
                    >
                      <div
                        className="truncate max-w-[120px]"
                        title={page.title}
                      >
                        {page.title}
                      </div>
                      {page.sectionTitle && (
                        <div className="text-[10px] text-gray-400 font-normal normal-case truncate max-w-[120px]">
                          {page.sectionTitle}
                        </div>
                      )}
                    </th>
                  ))}
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3 min-w-[140px]">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {franchisees.map((franchisee) => (
                  <tr key={franchisee.id} className="hover:bg-gray-50">
                    <td className="sticky left-0 z-10 bg-white px-6 py-3 group-hover:bg-gray-50">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {franchisee.name}
                        </p>
                        {franchisee.territory && (
                          <p className="text-xs text-gray-400">
                            {franchisee.territory}
                          </p>
                        )}
                      </div>
                    </td>
                    {pages.map((page) => {
                      const ack = franchisee.acknowledgments[page.id];
                      return (
                        <td key={page.id} className="px-4 py-3 text-center">
                          {ack?.status === "acknowledged" ? (
                            <CheckCircleIcon
                              className="h-5 w-5 text-green-500 mx-auto"
                              title={`Acknowledged v${ack.acknowledgedVersion}`}
                            />
                          ) : ack?.status === "outdated" ? (
                            <ClockIcon
                              className="h-5 w-5 text-amber-500 mx-auto"
                              title={`Outdated - acknowledged v${ack.acknowledgedVersion}, current v${page.version}`}
                            />
                          ) : (
                            <div
                              className="h-5 w-5 rounded-full border-2 border-gray-200 mx-auto"
                              title="Not yet acknowledged"
                            />
                          )}
                        </td>
                      );
                    })}
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              franchisee.progress === 100
                                ? "bg-green-500"
                                : franchisee.progress >= 50
                                  ? "bg-amber-500"
                                  : "bg-red-400"
                            }`}
                            style={{
                              width: `${Math.max(franchisee.progress, 2)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 w-10 text-right">
                          {franchisee.progress}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      {pages.length > 0 && franchisees.length > 0 && (
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <span className="font-medium text-gray-700">Legend:</span>
          <div className="flex items-center gap-1.5">
            <CheckCircleIcon className="h-4 w-4 text-green-500" />
            <span>Acknowledged</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ClockIcon className="h-4 w-4 text-amber-500" />
            <span>Outdated (needs re-acknowledgment)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded-full border-2 border-gray-200" />
            <span>Not yet acknowledged</span>
          </div>
        </div>
      )}
    </WideContainer>
  );
}
