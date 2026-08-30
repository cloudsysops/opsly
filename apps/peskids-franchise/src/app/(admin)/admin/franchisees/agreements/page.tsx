"use client";

import { useState, useEffect } from "react";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import {
  DocumentTextIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

interface Agreement {
  id: string;
  agreementNumber: string;
  franchiseeAccount: {
    id: string;
    prospect: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  startDate: string;
  endDate: string;
  termYears: number;
  status: string;
  territoryDescription: string | null;
  renewals: {
    id: string;
    renewalNumber: number;
    status: string;
    effectiveDate: string | null;
  }[];
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  PENDING_SIGNATURE: "bg-yellow-100 text-yellow-800",
  ACTIVE: "bg-green-100 text-green-800",
  RENEWAL_ELIGIBLE: "bg-blue-100 text-blue-800",
  RENEWAL_IN_PROGRESS: "bg-purple-100 text-purple-800",
  RENEWED: "bg-emerald-100 text-emerald-800",
  TERMINATED: "bg-red-100 text-red-800",
  EXPIRED: "bg-gray-100 text-gray-800",
  TRANSFERRED: "bg-orange-100 text-orange-800",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_SIGNATURE: "Pending Signature",
  ACTIVE: "Active",
  RENEWAL_ELIGIBLE: "Renewal Eligible",
  RENEWAL_IN_PROGRESS: "Renewal In Progress",
  RENEWED: "Renewed",
  TERMINATED: "Terminated",
  EXPIRED: "Expired",
  TRANSFERRED: "Transferred",
};

export default function AgreementsPage() {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewModal, setShowNewModal] = useState(false);

  useEffect(() => {
    fetchAgreements();
  }, []);

  const fetchAgreements = async () => {
    try {
      const res = await fetch("/api/admin/agreements");
      const data = await res.json();
      setAgreements(data.agreements || []);
    } catch (error) {
      console.error("Failed to fetch agreements:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAgreements = agreements.filter((a) => {
    const matchesSearch =
      searchQuery === "" ||
      a.agreementNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${a.franchiseeAccount.prospect.firstName} ${a.franchiseeAccount.prospect.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || a.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const activeCount = agreements.filter((a) => a.status === "ACTIVE").length;
  const renewalEligibleCount = agreements.filter(
    (a) => a.status === "RENEWAL_ELIGIBLE" || a.status === "RENEWAL_IN_PROGRESS"
  ).length;
  const expiringIn90Days = agreements.filter((a) => {
    const endDate = new Date(a.endDate);
    const today = new Date();
    const daysUntil = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 90 && daysUntil > 0;
  }).length;

  function getDaysUntilExpiry(endDate: string): number {
    const end = new Date(endDate);
    const today = new Date();
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  function getExpiryBadge(endDate: string, status: string) {
    if (status === "TERMINATED" || status === "EXPIRED" || status === "TRANSFERRED") {
      return null;
    }
    const days = getDaysUntilExpiry(endDate);
    if (days <= 0) {
      return (
        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
          <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
          Expired
        </span>
      );
    }
    if (days <= 90) {
      return (
        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
          <ClockIcon className="h-3 w-3 mr-1" />
          {days} days left
        </span>
      );
    }
    if (days <= 180) {
      return (
        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          <CalendarIcon className="h-3 w-3 mr-1" />
          {days} days left
        </span>
      );
    }
    return null;
  }

  if (loading) {
    return (
      <WideContainer>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </WideContainer>
    );
  }

  return (
    <WideContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Franchise Agreements</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage franchise agreements and renewal workflows
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-purple hover:bg-brand-purple/90"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Agreement
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Agreements</p>
                <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
              </div>
              <CheckCircleIcon className="h-10 w-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Agreements</p>
                <p className="text-2xl font-bold text-gray-900">{agreements.length}</p>
              </div>
              <DocumentTextIcon className="h-10 w-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Renewals In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{renewalEligibleCount}</p>
              </div>
              <ArrowPathIcon className="h-10 w-10 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Expiring in 90 Days</p>
                <p className="text-2xl font-bold text-gray-900">{expiringIn90Days}</p>
              </div>
              <ExclamationTriangleIcon className="h-10 w-10 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by agreement number or franchisee name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-brand-purple focus:border-brand-purple"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none w-full sm:w-48 px-4 py-2 pr-8 border border-gray-300 rounded-md focus:ring-brand-purple focus:border-brand-purple bg-white"
              >
                <option value="all">All Statuses</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Agreements Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agreement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Franchisee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Term
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Renewals
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAgreements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {agreements.length === 0 ? (
                      <div>
                        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 font-medium">No agreements yet</p>
                        <p className="text-sm">Create your first franchise agreement to get started.</p>
                      </div>
                    ) : (
                      <p>No agreements match your filters</p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredAgreements.map((agreement) => (
                  <tr key={agreement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/franchisees/agreements/${agreement.id}`}
                        className="text-brand-purple hover:text-brand-purple/80 font-medium"
                      >
                        {agreement.agreementNumber}
                      </Link>
                      {agreement.territoryDescription && (
                        <p className="text-sm text-gray-500 truncate max-w-xs">
                          {agreement.territoryDescription}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/franchisees/${agreement.franchiseeAccount.id}`}
                        className="text-gray-900 hover:text-brand-purple"
                      >
                        {agreement.franchiseeAccount.prospect.firstName}{" "}
                        {agreement.franchiseeAccount.prospect.lastName}
                      </Link>
                      <p className="text-sm text-gray-500">
                        {agreement.franchiseeAccount.prospect.email}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(agreement.startDate).toLocaleDateString()} -{" "}
                        {new Date(agreement.endDate).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {agreement.termYears} year term
                        {getExpiryBadge(agreement.endDate, agreement.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[agreement.status] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {statusLabels[agreement.status] || agreement.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {agreement.renewals.length === 0 ? (
                        <span>Original term</span>
                      ) : (
                        <span>{agreement.renewals.length} renewal(s)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/franchisees/agreements/${agreement.id}`}
                        className="text-brand-purple hover:text-brand-purple/80"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Agreement Modal */}
      {showNewModal && (
        <NewAgreementModal
          onClose={() => setShowNewModal(false)}
          onCreated={() => {
            setShowNewModal(false);
            fetchAgreements();
          }}
        />
      )}
    </WideContainer>
  );
}

interface NewAgreementModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function NewAgreementModal({ onClose, onCreated }: NewAgreementModalProps) {
  const [franchisees, setFranchisees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    franchiseeAccountId: "",
    startDate: new Date().toISOString().split("T")[0],
    termYears: 10,
    territoryDescription: "",
    initialFranchiseFee: "49500",
    royaltyPercent: "7",
    brandFundPercent: "1",
    systemsFeePercent: "2",
    renewalTermYears: 10,
    renewalFee: "10000",
    renewalNoticeMonths: 6,
  });

  useEffect(() => {
    fetchFranchisees();
  }, []);

  const fetchFranchisees = async () => {
    try {
      const res = await fetch("/api/admin/franchisees?status=active");
      const data = await res.json();
      // Filter out franchisees who already have agreements
      const available = (data.franchisees || []).filter(
        (f: any) => !f.hasAgreement
      );
      setFranchisees(available);
    } catch (error) {
      console.error("Failed to fetch franchisees:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          initialFranchiseFee: parseFloat(formData.initialFranchiseFee),
          royaltyPercent: parseFloat(formData.royaltyPercent),
          brandFundPercent: parseFloat(formData.brandFundPercent),
          systemsFeePercent: parseFloat(formData.systemsFeePercent),
          renewalFee: parseFloat(formData.renewalFee),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create agreement");
      }

      onCreated();
    } catch (error: any) {
      console.error("Failed to create agreement:", error);
      setAlertMsg(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
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
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl sm:max-w-2xl sm:w-full mx-auto z-10">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">New Franchise Agreement</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Franchisee Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Franchisee</label>
              <select
                required
                value={formData.franchiseeAccountId}
                onChange={(e) => setFormData({ ...formData, franchiseeAccountId: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
              >
                <option value="">Select a franchisee...</option>
                {franchisees.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.prospect.firstName} {f.prospect.lastName} ({f.prospect.email})
                  </option>
                ))}
              </select>
              {franchisees.length === 0 && !loading && (
                <p className="mt-1 text-sm text-yellow-600">
                  All franchisees already have agreements or no franchisees are available.
                </p>
              )}
            </div>

            {/* Term Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Term (Years)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={25}
                  value={formData.termYears}
                  onChange={(e) => setFormData({ ...formData, termYears: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                />
              </div>
            </div>

            {/* Territory */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Territory Description</label>
              <textarea
                rows={2}
                value={formData.territoryDescription}
                onChange={(e) => setFormData({ ...formData, territoryDescription: e.target.value })}
                placeholder="e.g., Westside Metro Area including Davidson, Williamson, and Rutherford counties"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
              />
            </div>

            {/* Financial Terms */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Financial Terms</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Initial Franchise Fee ($)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.initialFranchiseFee}
                    onChange={(e) => setFormData({ ...formData, initialFranchiseFee: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Royalty (%)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    step={0.1}
                    value={formData.royaltyPercent}
                    onChange={(e) => setFormData({ ...formData, royaltyPercent: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Brand Fund (%)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    step={0.1}
                    value={formData.brandFundPercent}
                    onChange={(e) => setFormData({ ...formData, brandFundPercent: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Systems Fee (%)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    step={0.1}
                    value={formData.systemsFeePercent}
                    onChange={(e) => setFormData({ ...formData, systemsFeePercent: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  />
                </div>
              </div>
            </div>

            {/* Renewal Terms */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Renewal Terms</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Renewal Term (Years)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={25}
                    value={formData.renewalTermYears}
                    onChange={(e) => setFormData({ ...formData, renewalTermYears: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Renewal Fee ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.renewalFee}
                    onChange={(e) => setFormData({ ...formData, renewalFee: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notice Period (Months)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={24}
                    value={formData.renewalNoticeMonths}
                    onChange={(e) => setFormData({ ...formData, renewalNoticeMonths: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !formData.franchiseeAccountId}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-purple rounded-md hover:bg-brand-purple/90 disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Agreement"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
