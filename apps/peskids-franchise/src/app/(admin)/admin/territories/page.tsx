"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  PlusIcon,
  ChevronRightIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

interface Territory {
  id: string;
  name: string;
  state: string;
  status: string;
  description?: string;
  population?: number;
  medianIncome?: number;
  centerLat?: number;
  centerLng?: number;
  radiusMiles?: number;
  franchiseeAccount?: {
    id: string;
    prospect: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  } | null;
}

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  RESERVED: "bg-yellow-100 text-yellow-700",
  SOLD: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  COMING_SOON: "bg-purple-100 text-purple-700",
  UNAVAILABLE: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  SOLD: "Sold",
  ACTIVE: "Active",
  COMING_SOON: "Coming Soon",
  UNAVAILABLE: "Unavailable",
};

function formatNumber(n: number | undefined | null): string {
  if (n == null) return "--";
  return new Intl.NumberFormat("en-US").format(n);
}

export default function TerritoriesPage() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetchTerritories();
  }, [statusFilter]);

  const fetchTerritories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "200");

      const response = await fetch(`/api/admin/territories?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch territories");
      }
      const data = await response.json();
      setTerritories(data.territories || []);
    } catch (err) {
      console.error("Failed to fetch territories:", err);
      setError("Failed to load territories. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTerritories = territories.filter((t) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(query) ||
      t.state.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query) ||
      t.franchiseeAccount?.prospect?.firstName?.toLowerCase().includes(query) ||
      t.franchiseeAccount?.prospect?.lastName?.toLowerCase().includes(query)
    );
  });

  const stats = {
    total: territories.length,
    available: territories.filter((t) => t.status === "AVAILABLE").length,
    sold: territories.filter((t) => t.status === "SOLD" || t.status === "ACTIVE").length,
    reserved: territories.filter((t) => t.status === "RESERVED").length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchTerritories}
            className="mt-3 text-sm text-red-600 underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Territory Management</h1>
          <p className="text-gray-500 mt-1">
            {territories.length} territor{territories.length !== 1 ? "ies" : "y"} total
          </p>
        </div>

        <Link
          href="/admin/territories/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy/90 transition-colors text-sm font-medium"
        >
          <PlusIcon className="h-4 w-4" />
          Add Territory
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <MapPinIcon className="h-4 w-4" />
            Total Territories
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <span className="h-2 w-2 rounded-full bg-green-500 inline-block"></span>
            Available
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.available}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <span className="h-2 w-2 rounded-full bg-blue-500 inline-block"></span>
            Sold / Active
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.sold}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <span className="h-2 w-2 rounded-full bg-yellow-500 inline-block"></span>
            Reserved
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.reserved}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search territories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-navy focus:border-brand-navy text-sm"
        >
          <option value="">All Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="RESERVED">Reserved</option>
          <option value="SOLD">Sold</option>
          <option value="ACTIVE">Active</option>
          <option value="COMING_SOON">Coming Soon</option>
          <option value="UNAVAILABLE">Unavailable</option>
        </select>
      </div>

      {/* Territory Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Name
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  State
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Assigned To
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Population
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTerritories.map((territory) => (
                <tr key={territory.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="font-medium text-gray-900">{territory.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">{territory.state}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_STYLES[territory.status] || STATUS_STYLES.UNAVAILABLE
                      }`}
                    >
                      {STATUS_LABELS[territory.status] || territory.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {territory.franchiseeAccount ? (
                      <Link
                        href={`/admin/franchisees/${territory.franchiseeAccount.prospect.id}`}
                        className="text-sm text-brand-navy hover:underline"
                      >
                        {territory.franchiseeAccount.prospect.firstName}{" "}
                        {territory.franchiseeAccount.prospect.lastName}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-400">&mdash;</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">
                      {formatNumber(territory.population)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/territories/${territory.id}`}
                        className="inline-flex items-center gap-1 text-sm text-brand-navy hover:text-brand-navy/80"
                      >
                        View
                        <ChevronRightIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/admin/territories/${territory.id}?edit=true`}
                        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTerritories.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <MapPinIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">
                      {searchQuery || statusFilter
                        ? "No territories match your filters."
                        : "No territories yet. Add your first territory to get started."}
                    </p>
                    {!searchQuery && !statusFilter && (
                      <Link
                        href="/admin/territories/new"
                        className="mt-3 inline-flex items-center gap-1 text-sm text-brand-navy hover:underline"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Add Territory
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
