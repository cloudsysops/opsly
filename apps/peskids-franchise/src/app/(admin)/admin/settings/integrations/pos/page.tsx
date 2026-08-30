"use client";

import { useState, useEffect } from "react";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { DefaultContainer } from "@/components/shared/ResponsiveContainer";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

interface POSIntegration {
  id: string;
  franchiseeAccountId: string;
  franchiseeName: string;
  provider: string;
  providerName: string | null;
  status: string;
  connectedAt: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastError: string | null;
  syncFrequency: string;
  autoSync: boolean;
}

const providerLabels: Record<string, string> = {
  SQUARE: "Square",
  STRIPE_TERMINAL: "Stripe Terminal",
  TOAST: "Toast",
  CLOVER: "Clover",
  SHOPIFY: "Shopify",
  TUTORCRUNCHER: "TutorCruncher",
  MANUAL: "Manual Entry",
  OTHER: "Other",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-800",
  CONNECTING: "bg-yellow-100 text-yellow-800",
  CONNECTED: "bg-green-100 text-green-800",
  ERROR: "bg-red-100 text-red-800",
  DISCONNECTED: "bg-gray-100 text-gray-800",
  EXPIRED: "bg-orange-100 text-orange-800",
};

export default function POSIntegrationsPage() {
  const [integrations, setIntegrations] = useState<POSIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch("/api/admin/pos-integrations");
      const data = await res.json();
      setIntegrations(data.integrations || []);
    } catch (error) {
      console.error("Failed to fetch POS integrations:", error);
    } finally {
      setLoading(false);
    }
  };

  const syncIntegration = async (id: string) => {
    try {
      await fetch(`/api/admin/pos-integrations/${id}/sync`, { method: "POST" });
      fetchIntegrations();
    } catch (error) {
      console.error("Failed to sync:", error);
    }
  };

  const deleteIntegration = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDeleteIntegration = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);

    try {
      await fetch(`/api/admin/pos-integrations/${id}`, { method: "DELETE" });
      fetchIntegrations();
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const connectedCount = integrations.filter((i) => i.status === "CONNECTED").length;
  const errorCount = integrations.filter((i) => i.status === "ERROR").length;

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
        <div className="flex items-start justify-between">
          <div>
            <Link
              href="/admin/settings/integrations"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back to Integrations
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">POS Integrations</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage point-of-sale system connections for revenue tracking
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-purple hover:bg-brand-purple/90"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Integration
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Connected</p>
                <p className="text-2xl font-bold text-gray-900">{connectedCount}</p>
              </div>
              <CheckCircleIcon className="h-10 w-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Errors</p>
                <p className="text-2xl font-bold text-gray-900">{errorCount}</p>
              </div>
              <ExclamationCircleIcon className="h-10 w-10 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">{integrations.length}</p>
              </div>
              <CreditCardIcon className="h-10 w-10 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Integrations List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Franchisee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Sync
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frequency
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {integrations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <CreditCardIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 font-medium">No POS integrations configured</p>
                    <p className="text-sm">
                      Add a POS integration to automatically sync revenue data.
                    </p>
                  </td>
                </tr>
              ) : (
                integrations.map((integration) => (
                  <tr key={integration.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium text-gray-900">{integration.franchiseeName}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-gray-900">
                        {providerLabels[integration.provider] || integration.provider}
                      </p>
                      {integration.providerName && (
                        <p className="text-sm text-gray-500">{integration.providerName}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[integration.status]
                        }`}
                      >
                        {integration.status}
                      </span>
                      {integration.lastError && (
                        <p className="text-xs text-red-500 mt-1 truncate max-w-xs">
                          {integration.lastError}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {integration.lastSyncAt
                        ? new Date(integration.lastSyncAt).toLocaleString()
                        : "Never"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{integration.syncFrequency}</span>
                      {integration.autoSync && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Auto
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => syncIntegration(integration.id)}
                          className="text-brand-purple hover:text-brand-purple/80"
                          title="Sync Now"
                        >
                          <ArrowPathIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => deleteIntegration(integration.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Remove"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Supported Providers */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Supported POS Systems</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(providerLabels).map(([key, label]) => (
              <div key={key} className="flex items-center gap-3 p-3 border rounded-lg">
                <CreditCardIcon className="h-6 w-6 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Remove Integration"
        message="Are you sure you want to remove this POS integration?"
        confirmLabel="Remove"
        confirmVariant="danger"
        onConfirm={confirmDeleteIntegration}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* Add Integration Modal */}
      {showAddModal && (
        <AddPOSIntegrationModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            fetchIntegrations();
          }}
        />
      )}
    </DefaultContainer>
  );
}

interface AddPOSIntegrationModalProps {
  onClose: () => void;
  onAdded: () => void;
}

function AddPOSIntegrationModal({ onClose, onAdded }: AddPOSIntegrationModalProps) {
  const [franchisees, setFranchisees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    franchiseeAccountId: "",
    provider: "SQUARE",
    providerName: "",
    merchantId: "",
    locationId: "",
    apiKey: "",
    syncFrequency: "DAILY",
    autoSync: true,
  });

  useEffect(() => {
    fetchFranchisees();
  }, []);

  const fetchFranchisees = async () => {
    try {
      const res = await fetch("/api/admin/franchisees?status=active");
      const data = await res.json();
      setFranchisees(data.franchisees || []);
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
      const res = await fetch("/api/admin/pos-integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add integration");
      }

      onAdded();
    } catch (error: any) {
      console.error("Failed to add integration:", error);
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
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-auto z-10">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">Add POS Integration</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                    {f.prospect.firstName} {f.prospect.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">POS Provider</label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
              >
                {Object.entries(providerLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {formData.provider === "OTHER" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Provider Name</label>
                <input
                  type="text"
                  value={formData.providerName}
                  onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                />
              </div>
            )}

            {formData.provider !== "MANUAL" && formData.provider !== "TUTORCRUNCHER" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Merchant ID</label>
                  <input
                    type="text"
                    value={formData.merchantId}
                    onChange={(e) => setFormData({ ...formData, merchantId: e.target.value })}
                    placeholder="Optional"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">API Key</label>
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    placeholder="Optional - for automatic sync"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Sync Frequency</label>
              <select
                value={formData.syncFrequency}
                onChange={(e) => setFormData({ ...formData, syncFrequency: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
              >
                <option value="REAL_TIME">Real-time</option>
                <option value="HOURLY">Hourly</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoSync"
                checked={formData.autoSync}
                onChange={(e) => setFormData({ ...formData, autoSync: e.target.checked })}
                className="h-4 w-4 text-brand-purple focus:ring-brand-purple border-gray-300 rounded"
              />
              <label htmlFor="autoSync" className="ml-2 text-sm text-gray-700">
                Enable automatic sync
              </label>
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
                disabled={submitting || !formData.franchiseeAccountId}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-purple rounded-md hover:bg-brand-purple/90 disabled:opacity-50"
              >
                {submitting ? "Adding..." : "Add Integration"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
