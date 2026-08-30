"use client";

import { useState, useEffect, useCallback } from "react";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { Card, CardContent } from "@/components/shared/Card";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import {
  LinkIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  SignalIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";

// ─── Types ────────────────────────────────────────────────────────────────────

type LeadSourceCategory =
  | "PAID_SEARCH"
  | "PAID_SOCIAL"
  | "ORGANIC_SEARCH"
  | "ORGANIC_SOCIAL"
  | "REFERRAL"
  | "EMAIL"
  | "EVENTS"
  | "PARTNERSHIPS"
  | "DIRECT"
  | "OTHER";

interface CampaignSpend {
  id: string;
  month: number;
  year: number;
  amount: number;
  notes: string | null;
}

interface LeadSource {
  id: string;
  slug: string;
  name: string;
  category: LeadSourceCategory;
  utmSource: string | null;
  utmMedium: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  sessionCount: number;
  leadCount: number;
  totalSpend: number;
  cpl: number | null;
  spends: CampaignSpend[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: LeadSourceCategory[] = [
  "PAID_SEARCH",
  "PAID_SOCIAL",
  "ORGANIC_SEARCH",
  "ORGANIC_SOCIAL",
  "REFERRAL",
  "EMAIL",
  "EVENTS",
  "PARTNERSHIPS",
  "DIRECT",
  "OTHER",
];

const categoryLabels: Record<LeadSourceCategory, string> = {
  PAID_SEARCH: "Paid Search",
  PAID_SOCIAL: "Paid Social",
  ORGANIC_SEARCH: "Organic Search",
  ORGANIC_SOCIAL: "Organic Social",
  REFERRAL: "Referral",
  EMAIL: "Email",
  EVENTS: "Events",
  PARTNERSHIPS: "Partnerships",
  DIRECT: "Direct",
  OTHER: "Other",
};

const categoryColors: Record<LeadSourceCategory, string> = {
  PAID_SEARCH: "bg-blue-100 text-blue-800",
  PAID_SOCIAL: "bg-purple-100 text-purple-800",
  ORGANIC_SEARCH: "bg-green-100 text-green-800",
  ORGANIC_SOCIAL: "bg-teal-100 text-teal-800",
  REFERRAL: "bg-orange-100 text-orange-800",
  EMAIL: "bg-cyan-100 text-cyan-800",
  EVENTS: "bg-yellow-100 text-yellow-800",
  PARTNERSHIPS: "bg-indigo-100 text-indigo-800",
  DIRECT: "bg-gray-100 text-gray-800",
  OTHER: "bg-slate-100 text-slate-800",
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LeadSourcesPage() {
  // ─── Data state ─────────────────────────────────────────────────────────
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Add/Edit modal state ──────────────────────────────────────────────
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSource, setEditingSource] = useState<LeadSource | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // ─── Form fields ──────────────────────────────────────────────────────
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<LeadSourceCategory>("OTHER");
  const [formUtmSource, setFormUtmSource] = useState("");
  const [formUtmMedium, setFormUtmMedium] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  // ─── Spend modal state ────────────────────────────────────────────────
  const [showSpendModal, setShowSpendModal] = useState(false);
  const [spendTarget, setSpendTarget] = useState<LeadSource | null>(null);
  const [spendMonth, setSpendMonth] = useState(new Date().getMonth() + 1);
  const [spendYear, setSpendYear] = useState(new Date().getFullYear());
  const [spendAmount, setSpendAmount] = useState("");
  const [spendNotes, setSpendNotes] = useState("");
  const [savingSpend, setSavingSpend] = useState(false);
  const [spendError, setSpendError] = useState("");

  // ─── Delete modal state ───────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<LeadSource | null>(null);

  // ─── Toggling status state ────────────────────────────────────────────
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ─── Data Fetching ────────────────────────────────────────────────────

  const fetchLeadSources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/lead-sources");
      if (!res.ok) throw new Error("Failed to fetch lead sources");
      const data = await res.json();
      setLeadSources(data.leadSources || []);
    } catch (error) {
      console.error("Failed to fetch lead sources:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeadSources();
  }, [fetchLeadSources]);

  // ─── Summary metrics ─────────────────────────────────────────────────

  const totalSources = leadSources.length;
  const activeSources = leadSources.filter((s) => s.isActive).length;
  const totalMonthlySpend = leadSources.reduce((sum, s) => {
    // Get the most recent month's spend for each source
    if (s.spends && s.spends.length > 0) {
      const sorted = [...s.spends].sort(
        (a, b) => b.year - a.year || b.month - a.month
      );
      return sum + Number(sorted[0].amount);
    }
    return sum;
  }, 0);
  const sourcesWithLeads = leadSources.filter(
    (s) => s.cpl !== null && s.cpl > 0
  );
  const avgCpl =
    sourcesWithLeads.length > 0
      ? sourcesWithLeads.reduce((sum, s) => sum + (s.cpl || 0), 0) /
        sourcesWithLeads.length
      : 0;

  // ─── Form helpers ─────────────────────────────────────────────────────

  const resetForm = () => {
    setFormName("");
    setFormCategory("OTHER");
    setFormUtmSource("");
    setFormUtmMedium("");
    setFormNotes("");
    setFormIsActive(true);
    setErrorMessage("");
  };

  const openAdd = () => {
    resetForm();
    setEditingSource(null);
    setShowFormModal(true);
  };

  const openEdit = (source: LeadSource) => {
    setFormName(source.name);
    setFormCategory(source.category);
    setFormUtmSource(source.utmSource || "");
    setFormUtmMedium(source.utmMedium || "");
    setFormNotes(source.notes || "");
    setFormIsActive(source.isActive);
    setErrorMessage("");
    setEditingSource(source);
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditingSource(null);
    resetForm();
  };

  const openSpend = (source: LeadSource) => {
    setSpendTarget(source);
    setSpendMonth(new Date().getMonth() + 1);
    setSpendYear(new Date().getFullYear());
    setSpendAmount("");
    setSpendNotes("");
    setSpendError("");
    setShowSpendModal(true);
  };

  const closeSpendModal = () => {
    setShowSpendModal(false);
    setSpendTarget(null);
    setSpendError("");
  };

  // ─── Toggle active status ────────────────────────────────────────────

  const toggleActive = async (source: LeadSource) => {
    setTogglingId(source.id);
    try {
      const res = await fetch(`/api/admin/lead-sources/${source.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !source.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      fetchLeadSources();
    } catch (error) {
      console.error("Failed to toggle lead source status:", error);
    } finally {
      setTogglingId(null);
    }
  };

  // ─── Save (Create / Update) ──────────────────────────────────────────

  const handleSave = async () => {
    if (!formName.trim()) {
      setErrorMessage("Name is required.");
      return;
    }
    if (!formCategory) {
      setErrorMessage("Category is required.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const body: Record<string, unknown> = {
        name: formName.trim(),
        category: formCategory,
        utmSource: formUtmSource.trim() || null,
        utmMedium: formUtmMedium.trim() || null,
        notes: formNotes.trim() || null,
        isActive: formIsActive,
      };

      const url = editingSource
        ? `/api/admin/lead-sources/${editingSource.id}`
        : "/api/admin/lead-sources";
      const method = editingSource ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save lead source");
      }

      closeFormModal();
      fetchLeadSources();
    } catch (error: any) {
      setErrorMessage(error.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  // ─── Save spend ──────────────────────────────────────────────────────

  const handleSaveSpend = async () => {
    if (!spendTarget) return;

    const amount = parseFloat(spendAmount);
    if (isNaN(amount) || amount < 0) {
      setSpendError("Please enter a valid amount.");
      return;
    }

    setSavingSpend(true);
    setSpendError("");

    try {
      const res = await fetch(
        `/api/admin/lead-sources/${spendTarget.id}/spend`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            month: spendMonth,
            year: spendYear,
            amount,
            notes: spendNotes.trim() || null,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save spend record");
      }

      closeSpendModal();
      fetchLeadSources();
    } catch (error: any) {
      setSpendError(error.message || "An error occurred");
    } finally {
      setSavingSpend(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/lead-sources/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete lead source");
      setDeleteTarget(null);
      fetchLeadSources();
    } catch (error) {
      console.error("Failed to delete lead source:", error);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <WideContainer className="py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LinkIcon className="h-7 w-7 text-brand-navy" />
            Lead Sources
          </h1>
          <p className="text-gray-500 mt-1">
            Track where your leads come from and manage ad spend
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-navy text-white font-medium rounded-xl hover:bg-brand-navy/90 transition-colors shadow-sm"
        >
          <PlusIcon className="h-5 w-5" />
          Add Lead Source
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500 p-5">
          <div className="flex items-center gap-2 mb-2">
            <LinkIcon className="h-5 w-5 text-emerald-600" />
            <span className="text-sm text-gray-500">Total Sources</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{totalSources}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-amber-500 p-5">
          <div className="flex items-center gap-2 mb-2">
            <SignalIcon className="h-5 w-5 text-amber-600" />
            <span className="text-sm text-gray-500">Active Sources</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{activeSources}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-purple-500 p-5">
          <div className="flex items-center gap-2 mb-2">
            <BanknotesIcon className="h-5 w-5 text-purple-600" />
            <span className="text-sm text-gray-500">Total Monthly Spend</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {formatCurrency(totalMonthlySpend)}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-red-500 p-5">
          <div className="flex items-center gap-2 mb-2">
            <ChartBarIcon className="h-5 w-5 text-red-600" />
            <span className="text-sm text-gray-500">Avg CPL</span>
          </div>
          <p className="text-2xl font-bold text-red-600">
            {avgCpl > 0 ? formatCurrency(avgCpl) : "--"}
          </p>
        </div>
      </div>

      {/* Lead Sources Table */}
      {loading ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-brand-navy mb-3" />
              <p className="text-sm">Loading lead sources...</p>
            </div>
          </CardContent>
        </Card>
      ) : leadSources.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-gray-400">
              <LinkIcon className="h-12 w-12 mb-3" />
              <p className="text-lg font-medium text-gray-500">
                No lead sources yet
              </p>
              <p className="text-sm mt-1">
                Add your first lead source to start tracking attribution
              </p>
              <button
                onClick={openAdd}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-navy text-white text-sm font-medium rounded-lg hover:bg-brand-navy/90 transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                Add Lead Source
              </button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left font-semibold text-gray-600 px-6 py-3">
                    Name
                  </th>
                  <th className="text-left font-semibold text-gray-600 px-4 py-3">
                    Category
                  </th>
                  <th className="text-left font-semibold text-gray-600 px-4 py-3">
                    UTM Source / Medium
                  </th>
                  <th className="text-right font-semibold text-gray-600 px-4 py-3">
                    Sessions
                  </th>
                  <th className="text-right font-semibold text-gray-600 px-4 py-3">
                    Leads
                  </th>
                  <th className="text-right font-semibold text-gray-600 px-4 py-3">
                    Spend
                  </th>
                  <th className="text-right font-semibold text-gray-600 px-4 py-3">
                    CPL
                  </th>
                  <th className="text-center font-semibold text-gray-600 px-4 py-3">
                    Status
                  </th>
                  <th className="text-right font-semibold text-gray-600 px-6 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {leadSources.map((source) => (
                  <tr
                    key={source.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    {/* Name */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {source.name}
                      </div>
                      {source.notes && (
                        <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                          {source.notes}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          categoryColors[source.category] ||
                          "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {categoryLabels[source.category] || source.category}
                      </span>
                    </td>

                    {/* UTM Source / Medium */}
                    <td className="px-4 py-4">
                      {source.utmSource || source.utmMedium ? (
                        <div className="text-gray-700">
                          <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                            {source.utmSource || "--"}
                          </span>
                          <span className="text-gray-400 mx-1">/</span>
                          <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                            {source.utmMedium || "--"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300">--</span>
                      )}
                    </td>

                    {/* Sessions */}
                    <td className="px-4 py-4 text-right text-gray-700 tabular-nums">
                      {source.sessionCount !== undefined
                        ? source.sessionCount.toLocaleString()
                        : (source as any).sessions !== undefined
                          ? (source as any).sessions.toLocaleString()
                          : "0"}
                    </td>

                    {/* Leads */}
                    <td className="px-4 py-4 text-right text-gray-700 tabular-nums">
                      {source.leadCount !== undefined
                        ? source.leadCount.toLocaleString()
                        : (source as any).leads !== undefined
                          ? (source as any).leads.toLocaleString()
                          : "0"}
                    </td>

                    {/* Total Spend */}
                    <td className="px-4 py-4 text-right text-gray-700 tabular-nums">
                      {source.totalSpend > 0
                        ? formatCurrency(source.totalSpend)
                        : "--"}
                    </td>

                    {/* CPL */}
                    <td className="px-4 py-4 text-right tabular-nums">
                      {source.cpl !== null && source.cpl > 0 ? (
                        <span className="text-gray-700">
                          {formatCurrency(source.cpl)}
                        </span>
                      ) : (
                        <span className="text-gray-300">--</span>
                      )}
                    </td>

                    {/* Status Toggle */}
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => toggleActive(source)}
                        disabled={togglingId === source.id}
                        className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            source.isActive ? "bg-green-500" : "bg-gray-300"
                          }`}
                        />
                        <span
                          className={
                            source.isActive ? "text-green-700" : "text-gray-500"
                          }
                        >
                          {source.isActive ? "Active" : "Inactive"}
                        </span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openSpend(source)}
                          className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors"
                          title="Add Spend"
                        >
                          <CurrencyDollarIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(source)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(source)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── Add / Edit Lead Source Modal ─────────────────────────────────── */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={closeFormModal}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingSource ? "Edit Lead Source" : "Add Lead Source"}
              </h2>
              <button
                onClick={closeFormModal}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5">
              {errorMessage && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  {errorMessage}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Google Ads - Brand"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) =>
                    setFormCategory(e.target.value as LeadSourceCategory)
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {categoryLabels[cat]}
                    </option>
                  ))}
                </select>
              </div>

              {/* UTM Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  UTM Source{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formUtmSource}
                  onChange={(e) => setFormUtmSource(e.target.value)}
                  placeholder="e.g., google, facebook, newsletter"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors"
                />
              </div>

              {/* UTM Medium */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  UTM Medium{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formUtmMedium}
                  onChange={(e) => setFormUtmMedium(e.target.value)}
                  placeholder="e.g., cpc, social, email"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Notes{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Additional details about this lead source..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors resize-y"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-green-500 transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      Active
                    </span>
                    <p className="text-xs text-gray-400">
                      Active sources are included in attribution tracking
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
              <button
                onClick={closeFormModal}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-brand-navy hover:bg-brand-navy/90 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                    Saving...
                  </>
                ) : editingSource ? (
                  "Save Changes"
                ) : (
                  "Create Lead Source"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Spend Entry Modal ───────────────────────────────────────────── */}
      {showSpendModal && spendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={closeSpendModal}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Record Spend
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {spendTarget.name}
                </p>
              </div>
              <button
                onClick={closeSpendModal}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5">
              {spendError && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  {spendError}
                </div>
              )}

              {/* Month & Year */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Month <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={spendMonth}
                    onChange={(e) => setSpendMonth(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={idx} value={idx + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={spendYear}
                    onChange={(e) =>
                      setSpendYear(parseInt(e.target.value, 10) || 0)
                    }
                    min={2020}
                    max={2030}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors"
                  />
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Amount ($) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    value={spendAmount}
                    onChange={(e) => setSpendAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Notes{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={spendNotes}
                  onChange={(e) => setSpendNotes(e.target.value)}
                  placeholder="Campaign details, budget notes..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors resize-y"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
              <button
                onClick={closeSpendModal}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSpend}
                disabled={savingSpend}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-brand-navy hover:bg-brand-navy/90 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {savingSpend ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                    Saving...
                  </>
                ) : (
                  "Save Spend"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ───────────────────────────────────── */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Delete Lead Source"
        message={`Are you sure you want to delete "${deleteTarget?.name || ""}"? This will also remove all associated spend records. This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </WideContainer>
  );
}
