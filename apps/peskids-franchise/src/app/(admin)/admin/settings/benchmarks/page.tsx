"use client";

import { useState, useEffect } from "react";
import { DefaultContainer } from "@/components/shared/ResponsiveContainer";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
  FlagIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

type CompanyType = "COMPETITOR" | "ACQUISITION_TARGET" | "ACQUIRER" | "INDUSTRY_BENCHMARK";

interface IndustryBenchmark {
  id: string;
  companyName: string;
  companyType: CompanyType;
  parentCompany: string | null;
  category: string;
  dataYear: number;
  systemWideRevenue: number | null;
  franchiseeCount: number | null;
  totalUnits: number | null;
  avgRevenuePerUnit: number | null;
  topPerformerRevenue: number | null;
  royaltyRate: number | null;
  childrenEnrolled: number | null;
  fundingRaised: number | null;
  dataSource: string | null;
  sourceUrl: string | null;
  notes: string | null;
  lastVerifiedAt: string | null;
  isStale?: boolean;
}

interface GrowthMilestone {
  id: string;
  name: string;
  targetYear: number;
  displayOrder: number;
  systemWideRevenueTarget: number | null;
  avgRevenuePerUnitTarget: number | null;
  franchiseeCountTarget: number | null;
  statesTarget: number | null;
  childrenEnrolledTarget: number | null;
  operatingMarginTarget: number | null;
  comparableCompany: string | null;
  comparableNotes: string | null;
  keyObjectives: string[] | null;
}

const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  COMPETITOR: "Competitor",
  ACQUISITION_TARGET: "Acquisition Target",
  ACQUIRER: "Potential Acquirer",
  INDUSTRY_BENCHMARK: "Industry Benchmark",
};

const CATEGORIES = [
  { value: "youth-sports", label: "Youth Sports" },
  { value: "tutoring", label: "Tutoring & Education" },
  { value: "enrichment", label: "Enrichment Programs" },
  { value: "childcare", label: "Childcare" },
  { value: "fitness", label: "Kids Fitness" },
];

export default function BenchmarkSettingsPage() {
  const [benchmarks, setBenchmarks] = useState<IndustryBenchmark[]>([]);
  const [milestones, setMilestones] = useState<GrowthMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"benchmarks" | "milestones">("benchmarks");

  // Modal states
  const [showBenchmarkModal, setShowBenchmarkModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editingBenchmark, setEditingBenchmark] = useState<IndustryBenchmark | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<GrowthMilestone | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteBenchmarkId, setDeleteBenchmarkId] = useState<string | null>(null);
  const [deleteMilestoneId, setDeleteMilestoneId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showStaleOnly, setShowStaleOnly] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/industry-benchmarks");
      const data = await res.json();
      setBenchmarks(data.benchmarks || []);
      setMilestones(data.milestones || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBenchmark = async (data: Partial<IndustryBenchmark>) => {
    setSaving(true);
    setSaveError(null);
    try {
      const url = editingBenchmark
        ? `/api/admin/industry-benchmarks/${editingBenchmark.id}`
        : "/api/admin/industry-benchmarks";
      const method = editingBenchmark ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to save");

      await fetchData();
      setShowBenchmarkModal(false);
      setEditingBenchmark(null);
    } catch (error) {
      console.error("Failed to save benchmark:", error);
      setSaveError("Failed to save benchmark");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBenchmark = (id: string) => {
    setDeleteBenchmarkId(id);
  };

  const confirmDeleteBenchmark = async () => {
    if (!deleteBenchmarkId) return;
    try {
      await fetch(`/api/admin/industry-benchmarks/${deleteBenchmarkId}`, { method: "DELETE" });
      await fetchData();
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setDeleteBenchmarkId(null);
    }
  };

  const handleSaveMilestone = async (data: Partial<GrowthMilestone>) => {
    setSaving(true);
    setSaveError(null);
    try {
      const url = editingMilestone
        ? `/api/admin/growth-milestones/${editingMilestone.id}`
        : "/api/admin/growth-milestones";
      const method = editingMilestone ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to save");

      await fetchData();
      setShowMilestoneModal(false);
      setEditingMilestone(null);
    } catch (error) {
      console.error("Failed to save milestone:", error);
      setSaveError("Failed to save milestone");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMilestone = (id: string) => {
    setDeleteMilestoneId(id);
  };

  const confirmDeleteMilestone = async () => {
    if (!deleteMilestoneId) return;
    try {
      await fetch(`/api/admin/growth-milestones/${deleteMilestoneId}`, { method: "DELETE" });
      await fetchData();
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setDeleteMilestoneId(null);
    }
  };

  const handleMarkVerified = async (id: string) => {
    try {
      await fetch(`/api/admin/industry-benchmarks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastVerifiedAt: new Date().toISOString() }),
      });
      await fetchData();
    } catch (error) {
      console.error("Failed to mark as verified:", error);
    }
  };

  if (loading) {
    return (
      <DefaultContainer>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </DefaultContainer>
    );
  }

  return (
    <DefaultContainer>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Benchmark Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage industry benchmarks and STC growth milestones
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">How to Update Benchmark Data</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  <strong>Annual FDD Updates (March-May):</strong> Search
                  "FranchiseChatter [Company Name] FDD" for latest Item 19 revenue data
                </li>
                <li>
                  <strong>Franchise Times Top 400:</strong> Published annually with
                  system-wide sales rankings
                </li>
                <li>
                  <strong>Press Releases:</strong> Check company newsrooms for funding
                  announcements, unit counts
                </li>
                <li>
                  <strong>Industry Reports:</strong> IFA, IBISWorld, and franchise
                  consultancy reports
                </li>
              </ol>
              <p className="mt-2 text-xs">
                Always record your data source and URL for future reference.
              </p>
            </div>
          </div>
        </div>

        {/* Save Error Banner */}
        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {saveError}
            <button onClick={() => setSaveError(null)} className="ml-2 text-red-500">&times;</button>
          </div>
        )}

        {/* Staleness Banner */}
        {benchmarks.filter(b => b.isStale).length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-medium text-amber-800">
                {benchmarks.filter(b => b.isStale).length} of {benchmarks.length} benchmarks need updating
              </span>
            </div>
            <button
              onClick={() => setShowStaleOnly(!showStaleOnly)}
              className="text-sm text-amber-700 hover:text-amber-900 font-medium"
            >
              {showStaleOnly ? "Show All" : "Show Only Stale"}
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab("benchmarks")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "benchmarks"
                  ? "border-brand-purple text-brand-purple"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <ChartBarIcon className="h-4 w-4 inline mr-2" />
              Industry Benchmarks ({benchmarks.length})
            </button>
            <button
              onClick={() => setActiveTab("milestones")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "milestones"
                  ? "border-brand-purple text-brand-purple"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <FlagIcon className="h-4 w-4 inline mr-2" />
              Growth Milestones ({milestones.length})
            </button>
          </nav>
        </div>

        {/* Benchmarks Tab */}
        {activeTab === "benchmarks" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setEditingBenchmark(null);
                  setShowBenchmarkModal(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-brand-purple text-white rounded-md hover:bg-brand-purple/90"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Benchmark
              </button>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Company
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      System Revenue
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Units
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Avg/Unit
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Year
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Last Verified
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(showStaleOnly ? benchmarks.filter(b => b.isStale) : benchmarks).map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{b.companyName}</div>
                        {b.parentCompany && (
                          <div className="text-xs text-gray-500">{b.parentCompany}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            b.companyType === "ACQUIRER"
                              ? "bg-green-100 text-green-800"
                              : b.companyType === "ACQUISITION_TARGET"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {COMPANY_TYPE_LABELS[b.companyType]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {b.systemWideRevenue
                          ? `$${(Number(b.systemWideRevenue) / 1000000).toFixed(1)}M`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {b.totalUnits || b.franchiseeCount || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {b.avgRevenuePerUnit
                          ? `$${(Number(b.avgRevenuePerUnit) / 1000).toFixed(0)}K`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">
                        {b.dataYear}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {b.lastVerifiedAt ? (
                          <span className="text-xs text-gray-500">
                            {new Date(b.lastVerifiedAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Never</span>
                        )}
                        {b.isStale && (
                          <span className="inline-flex ml-1 w-2 h-2 rounded-full bg-amber-400"></span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleMarkVerified(b.id)}
                          className="text-gray-400 hover:text-green-600 mr-2"
                          title="Mark as Verified"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingBenchmark(b);
                            setShowBenchmarkModal(true);
                          }}
                          className="text-gray-400 hover:text-gray-600 mr-2"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBenchmark(b.id)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {benchmarks.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No benchmarks added yet. Click "Add Benchmark" to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Milestones Tab */}
        {activeTab === "milestones" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setEditingMilestone(null);
                  setShowMilestoneModal(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-brand-purple text-white rounded-md hover:bg-brand-purple/90"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Milestone
              </button>
            </div>

            <div className="grid gap-4">
              {milestones.map((m) => (
                <div key={m.id} className="bg-white shadow rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{m.name}</h3>
                      <p className="text-sm text-gray-500">
                        Target Year: {m.targetYear}
                        {m.comparableCompany && ` • Comparable: ${m.comparableCompany}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingMilestone(m);
                          setShowMilestoneModal(true);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMilestone(m.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {m.systemWideRevenueTarget && (
                      <div>
                        <div className="text-gray-500">Revenue Target</div>
                        <div className="font-medium">
                          ${(Number(m.systemWideRevenueTarget) / 1000000).toFixed(1)}M
                        </div>
                      </div>
                    )}
                    {m.franchiseeCountTarget && (
                      <div>
                        <div className="text-gray-500">Franchisee Target</div>
                        <div className="font-medium">{m.franchiseeCountTarget}</div>
                      </div>
                    )}
                    {m.avgRevenuePerUnitTarget && (
                      <div>
                        <div className="text-gray-500">Avg/Unit Target</div>
                        <div className="font-medium">
                          ${(Number(m.avgRevenuePerUnitTarget) / 1000).toFixed(0)}K
                        </div>
                      </div>
                    )}
                    {m.statesTarget && (
                      <div>
                        <div className="text-gray-500">States Target</div>
                        <div className="font-medium">{m.statesTarget}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {milestones.length === 0 && (
                <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
                  No milestones added yet. Click "Add Milestone" to set growth targets.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Benchmark Modal */}
        {showBenchmarkModal && (
          <BenchmarkModal
            benchmark={editingBenchmark}
            onSave={handleSaveBenchmark}
            onClose={() => {
              setShowBenchmarkModal(false);
              setEditingBenchmark(null);
            }}
            saving={saving}
          />
        )}

        {/* Milestone Modal */}
        {showMilestoneModal && (
          <MilestoneModal
            milestone={editingMilestone}
            onSave={handleSaveMilestone}
            onClose={() => {
              setShowMilestoneModal(false);
              setEditingMilestone(null);
            }}
            saving={saving}
          />
        )}
        {/* Delete Benchmark Confirm */}
        <ConfirmModal
          isOpen={!!deleteBenchmarkId}
          title="Delete Benchmark"
          message="Delete this benchmark? This cannot be undone."
          confirmLabel="Delete"
          confirmVariant="danger"
          onConfirm={confirmDeleteBenchmark}
          onCancel={() => setDeleteBenchmarkId(null)}
        />

        {/* Delete Milestone Confirm */}
        <ConfirmModal
          isOpen={!!deleteMilestoneId}
          title="Delete Milestone"
          message="Delete this milestone? This cannot be undone."
          confirmLabel="Delete"
          confirmVariant="danger"
          onConfirm={confirmDeleteMilestone}
          onCancel={() => setDeleteMilestoneId(null)}
        />
      </div>
    </DefaultContainer>
  );
}

// Benchmark Modal Component
function BenchmarkModal({
  benchmark,
  onSave,
  onClose,
  saving,
}: {
  benchmark: IndustryBenchmark | null;
  onSave: (data: Partial<IndustryBenchmark>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [formData, setFormData] = useState({
    companyName: benchmark?.companyName || "",
    companyType: benchmark?.companyType || "COMPETITOR",
    parentCompany: benchmark?.parentCompany || "",
    category: benchmark?.category || "youth-sports",
    dataYear: benchmark?.dataYear || new Date().getFullYear(),
    systemWideRevenue: benchmark?.systemWideRevenue || "",
    franchiseeCount: benchmark?.franchiseeCount || "",
    totalUnits: benchmark?.totalUnits || "",
    avgRevenuePerUnit: benchmark?.avgRevenuePerUnit || "",
    topPerformerRevenue: benchmark?.topPerformerRevenue || "",
    royaltyRate: benchmark?.royaltyRate || "",
    childrenEnrolled: benchmark?.childrenEnrolled || "",
    fundingRaised: benchmark?.fundingRaised || "",
    dataSource: benchmark?.dataSource || "",
    sourceUrl: benchmark?.sourceUrl || "",
    notes: benchmark?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      systemWideRevenue: formData.systemWideRevenue
        ? Number(formData.systemWideRevenue)
        : null,
      franchiseeCount: formData.franchiseeCount
        ? Number(formData.franchiseeCount)
        : null,
      totalUnits: formData.totalUnits ? Number(formData.totalUnits) : null,
      avgRevenuePerUnit: formData.avgRevenuePerUnit
        ? Number(formData.avgRevenuePerUnit)
        : null,
      topPerformerRevenue: formData.topPerformerRevenue
        ? Number(formData.topPerformerRevenue)
        : null,
      royaltyRate: formData.royaltyRate ? Number(formData.royaltyRate) : null,
      childrenEnrolled: formData.childrenEnrolled
        ? Number(formData.childrenEnrolled)
        : null,
      fundingRaised: formData.fundingRaised
        ? Number(formData.fundingRaised)
        : null,
      parentCompany: formData.parentCompany || null,
      dataSource: formData.dataSource || null,
      sourceUrl: formData.sourceUrl || null,
      notes: formData.notes || null,
    } as any);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">
            {benchmark ? "Edit Benchmark" : "Add Industry Benchmark"}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                placeholder="e.g., Soccer Shots"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Type *
              </label>
              <select
                required
                value={formData.companyType}
                onChange={(e) =>
                  setFormData({ ...formData, companyType: e.target.value as CompanyType })
                }
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
              >
                {Object.entries(COMPANY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent Company
              </label>
              <input
                type="text"
                value={formData.parentCompany}
                onChange={(e) =>
                  setFormData({ ...formData, parentCompany: e.target.value })
                }
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                placeholder="e.g., Stronger Youth Brands"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Year *
              </label>
              <input
                type="number"
                required
                min={2020}
                max={2030}
                value={formData.dataYear}
                onChange={(e) =>
                  setFormData({ ...formData, dataYear: parseInt(e.target.value) })
                }
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Financial Metrics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System-Wide Revenue ($)
                </label>
                <input
                  type="number"
                  value={formData.systemWideRevenue}
                  onChange={(e) =>
                    setFormData({ ...formData, systemWideRevenue: e.target.value })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  placeholder="e.g., 105000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Avg Revenue Per Unit ($)
                </label>
                <input
                  type="number"
                  value={formData.avgRevenuePerUnit}
                  onChange={(e) =>
                    setFormData({ ...formData, avgRevenuePerUnit: e.target.value })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  placeholder="e.g., 243000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Top Performer Revenue ($)
                </label>
                <input
                  type="number"
                  value={formData.topPerformerRevenue}
                  onChange={(e) =>
                    setFormData({ ...formData, topPerformerRevenue: e.target.value })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  placeholder="e.g., 650000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Royalty Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.royaltyRate}
                  onChange={(e) =>
                    setFormData({ ...formData, royaltyRate: e.target.value })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  placeholder="e.g., 7"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Scale Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Franchisee Count
                </label>
                <input
                  type="number"
                  value={formData.franchiseeCount}
                  onChange={(e) =>
                    setFormData({ ...formData, franchiseeCount: e.target.value })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  placeholder="e.g., 306"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Units
                </label>
                <input
                  type="number"
                  value={formData.totalUnits}
                  onChange={(e) =>
                    setFormData({ ...formData, totalUnits: e.target.value })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  placeholder="e.g., 329"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Children Enrolled
                </label>
                <input
                  type="number"
                  value={formData.childrenEnrolled}
                  onChange={(e) =>
                    setFormData({ ...formData, childrenEnrolled: e.target.value })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  placeholder="e.g., 600000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Funding Raised ($)
                </label>
                <input
                  type="number"
                  value={formData.fundingRaised}
                  onChange={(e) =>
                    setFormData({ ...formData, fundingRaised: e.target.value })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  placeholder="e.g., 125000000"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Data Source</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source
                </label>
                <input
                  type="text"
                  value={formData.dataSource}
                  onChange={(e) =>
                    setFormData({ ...formData, dataSource: e.target.value })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  placeholder="e.g., FDD Item 19, Franchise Times"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source URL
                </label>
                <input
                  type="url"
                  value={formData.sourceUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, sourceUrl: e.target.value })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  placeholder="https://..."
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={2}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  placeholder="Any additional context..."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-purple rounded-md hover:bg-brand-purple/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : benchmark ? "Update" : "Add Benchmark"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Milestone Modal Component
function MilestoneModal({
  milestone,
  onSave,
  onClose,
  saving,
}: {
  milestone: GrowthMilestone | null;
  onSave: (data: Partial<GrowthMilestone>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [formData, setFormData] = useState({
    name: milestone?.name || "",
    targetYear: milestone?.targetYear || new Date().getFullYear() + 1,
    displayOrder: milestone?.displayOrder || 0,
    systemWideRevenueTarget: milestone?.systemWideRevenueTarget || "",
    avgRevenuePerUnitTarget: milestone?.avgRevenuePerUnitTarget || "",
    franchiseeCountTarget: milestone?.franchiseeCountTarget || "",
    statesTarget: milestone?.statesTarget || "",
    childrenEnrolledTarget: milestone?.childrenEnrolledTarget || "",
    operatingMarginTarget: milestone?.operatingMarginTarget || "",
    comparableCompany: milestone?.comparableCompany || "",
    comparableNotes: milestone?.comparableNotes || "",
    keyObjectives: (milestone?.keyObjectives || []).join("\n"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      systemWideRevenueTarget: formData.systemWideRevenueTarget
        ? Number(formData.systemWideRevenueTarget)
        : null,
      avgRevenuePerUnitTarget: formData.avgRevenuePerUnitTarget
        ? Number(formData.avgRevenuePerUnitTarget)
        : null,
      franchiseeCountTarget: formData.franchiseeCountTarget
        ? Number(formData.franchiseeCountTarget)
        : null,
      statesTarget: formData.statesTarget ? Number(formData.statesTarget) : null,
      childrenEnrolledTarget: formData.childrenEnrolledTarget
        ? Number(formData.childrenEnrolledTarget)
        : null,
      operatingMarginTarget: formData.operatingMarginTarget
        ? Number(formData.operatingMarginTarget)
        : null,
      comparableCompany: formData.comparableCompany || null,
      comparableNotes: formData.comparableNotes || null,
      keyObjectives: formData.keyObjectives
        ? formData.keyObjectives.split("\n").filter((s) => s.trim())
        : null,
    } as any);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">
            {milestone ? "Edit Milestone" : "Add Growth Milestone"}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Milestone Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                placeholder="e.g., Year 1, Year 3, Acquisition Ready"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Year *
              </label>
              <input
                type="number"
                required
                min={2024}
                max={2040}
                value={formData.targetYear}
                onChange={(e) =>
                  setFormData({ ...formData, targetYear: parseInt(e.target.value) })
                }
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Order
              </label>
              <input
                type="number"
                min={0}
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({ ...formData, displayOrder: parseInt(e.target.value) })
                }
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Targets</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Revenue ($)
                </label>
                <input
                  type="number"
                  value={formData.systemWideRevenueTarget}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      systemWideRevenueTarget: e.target.value,
                    })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  placeholder="e.g., 1500000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Franchisee Count
                </label>
                <input
                  type="number"
                  value={formData.franchiseeCountTarget}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      franchiseeCountTarget: e.target.value,
                    })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  placeholder="e.g., 8"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Avg Revenue/Unit ($)
                </label>
                <input
                  type="number"
                  value={formData.avgRevenuePerUnitTarget}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      avgRevenuePerUnitTarget: e.target.value,
                    })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  placeholder="e.g., 200000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  States Operating
                </label>
                <input
                  type="number"
                  value={formData.statesTarget}
                  onChange={(e) =>
                    setFormData({ ...formData, statesTarget: e.target.value })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  placeholder="e.g., 5"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Reference</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comparable Company/Stage
                </label>
                <input
                  type="text"
                  value={formData.comparableCompany}
                  onChange={(e) =>
                    setFormData({ ...formData, comparableCompany: e.target.value })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  placeholder="e.g., Soccer Shots at SYB investment"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key Objectives (one per line)
                </label>
                <textarea
                  value={formData.keyObjectives}
                  onChange={(e) =>
                    setFormData({ ...formData, keyObjectives: e.target.value })
                  }
                  rows={4}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  placeholder="Prove unit economics&#10;Multi-state presence&#10;75%+ franchisee renewal rate"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-purple rounded-md hover:bg-brand-purple/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : milestone ? "Update" : "Add Milestone"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
