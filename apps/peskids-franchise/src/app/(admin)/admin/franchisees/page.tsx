"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Franchisee {
  id: string;
  accountId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  territory?: string;
  selectedAt?: string;
  llcName?: string;
  launchDate?: string;
  currentMonthRevenue?: string | number;
  ytdRevenue?: string | number;
  stripeOnboarded: boolean;
  tcConnected: boolean;
  academyModulesCompleted: number;
  contactsCount: number;
  hasExpiredCerts: boolean;
}

export default function FranchiseesPage() {
  const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchFranchisees();
  }, []);

  const fetchFranchisees = async () => {
    try {
      const response = await fetch("/api/admin/franchisees");
      const data = await response.json();
      setFranchisees(data.franchisees || []);
    } catch (error) {
      console.error("Failed to fetch franchisees:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFranchisees = franchisees.filter((f) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      f.firstName.toLowerCase().includes(query) ||
      f.lastName.toLowerCase().includes(query) ||
      f.email.toLowerCase().includes(query) ||
      f.territory?.toLowerCase().includes(query) ||
      f.llcName?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Franchisees</h1>
          <p className="text-gray-500 mt-1">
            {franchisees.length} active franchisee{franchisees.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search franchisees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <UserGroupIcon className="h-4 w-4" />
            Total Franchisees
          </div>
          <p className="text-2xl font-bold text-gray-900">{franchisees.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <CheckCircleIcon className="h-4 w-4" />
            Stripe Active
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {franchisees.filter((f) => f.stripeOnboarded).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <CheckCircleIcon className="h-4 w-4" />
            TC Connected
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {franchisees.filter((f) => f.tcConnected).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <CurrencyDollarIcon className="h-4 w-4" />
            Network Revenue (YTD)
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(
              franchisees.reduce((sum, f) => sum + Number(f.ytdRevenue || 0), 0)
            )}
          </p>
        </div>
      </div>

      {/* Franchisees List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Franchisee
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Territory
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Revenue (MTD)
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Journey
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Selected
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredFranchisees.map((franchisee) => (
                <tr key={franchisee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/franchisees/${franchisee.id}`}
                      className="flex items-center gap-3 group"
                    >
                      <div className="h-10 w-10 rounded-full bg-brand-purple/10 flex items-center justify-center text-brand-purple font-medium text-sm flex-shrink-0">
                        {franchisee.firstName[0]}
                        {franchisee.lastName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 group-hover:text-brand-navy">
                          {franchisee.firstName} {franchisee.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{franchisee.email}</p>
                        {franchisee.llcName && (
                          <p className="text-xs text-gray-400">{franchisee.llcName}</p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">
                      {franchisee.territory || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">
                      {franchisee.currentMonthRevenue
                        ? formatCurrency(Number(franchisee.currentMonthRevenue))
                        : "$0.00"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          franchisee.stripeOnboarded
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {franchisee.stripeOnboarded ? (
                          <CheckCircleIcon className="h-3 w-3" />
                        ) : (
                          <XCircleIcon className="h-3 w-3" />
                        )}
                        Stripe
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          franchisee.tcConnected
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {franchisee.tcConnected ? (
                          <CheckCircleIcon className="h-3 w-3" />
                        ) : (
                          <XCircleIcon className="h-3 w-3" />
                        )}
                        TC
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-navy rounded-full"
                          style={{
                            width: `${Math.min(
                              (franchisee.academyModulesCompleted / 63) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {franchisee.academyModulesCompleted}/63
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">
                      {franchisee.selectedAt ? formatDate(franchisee.selectedAt) : "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/franchisees/${franchisee.id}`}
                      className="inline-flex items-center gap-1 text-sm text-brand-navy hover:text-brand-navy/80"
                    >
                      View
                      <ChevronRightIcon className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredFranchisees.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-gray-500">
                      {searchQuery
                        ? "No franchisees match your search."
                        : "No franchisees yet. Select prospects from the CRM to add franchisees."}
                    </p>
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
