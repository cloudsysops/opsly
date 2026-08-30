"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { Card, CardContent } from "@/components/shared/Card";
import { formatDate } from "@/lib/utils";
import {
  ClipboardDocumentCheckIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

interface Audit {
  id: string;
  scheduledDate: string;
  completedAt: string | null;
  status: string;
  overallScore: number | null;
  auditorName: string;
  auditorEmail: string;
  notes: string | null;
  correctiveActionCount: number;
  template: {
    id: string;
    name: string;
    category: string;
  };
  franchisee: {
    id: string;
    name: string;
  };
}

interface AuditTemplate {
  id: string;
  name: string;
}

interface Franchisee {
  id: string;
  firstName: string;
  lastName: string;
}

interface AuditStats {
  scheduled: number;
  completedThisMonth: number;
  averageScore: number | null;
  openCorrectiveActions: number;
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-500",
};

function getScoreColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score > 80) return "text-green-600";
  if (score > 60) return "text-amber-600";
  return "text-red-600";
}

function getScoreBgColor(score: number | null): string {
  if (score === null) return "bg-gray-100";
  if (score > 80) return "bg-green-100";
  if (score > 60) return "bg-amber-100";
  return "bg-red-100";
}

export default function AuditsListPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [templates, setTemplates] = useState<AuditTemplate[]>([]);
  const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
  const [stats, setStats] = useState<AuditStats>({
    scheduled: 0,
    completedThisMonth: 0,
    averageScore: null,
    openCorrectiveActions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    templateId: "",
    franchiseeId: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchAudits();
  }, [filters]);

  async function fetchData() {
    try {
      const [templatesRes, franchiseesRes] = await Promise.all([
        fetch("/api/admin/operations/audits/templates"),
        fetch("/api/admin/franchisees"),
      ]);
      const templatesJson = await templatesRes.json();
      const franchiseesJson = await franchiseesRes.json();
      setTemplates(templatesJson.templates || []);
      setFranchisees(franchiseesJson.franchisees || franchiseesJson || []);
    } catch (err) {
      console.error("Error fetching filter data:", err);
    }
  }

  async function fetchAudits() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.templateId) params.set("templateId", filters.templateId);
      if (filters.franchiseeId) params.set("franchiseeId", filters.franchiseeId);

      const res = await fetch(`/api/admin/operations/audits?${params}`);
      const json = await res.json();
      setAudits(json.audits || []);
      if (json.stats) {
        setStats(json.stats);
      }
    } catch (err) {
      console.error("Error fetching audits:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <WideContainer className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="h-7 w-7 text-indigo-600" />
            Field Audits
          </h1>
          <p className="mt-1 text-gray-600">
            Schedule and manage franchise field audits
          </p>
        </div>
        <Link
          href="/admin/operations/audits/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <PlusIcon className="h-4 w-4" />
          Schedule Audit
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Scheduled</span>
            </div>
            <div className="text-2xl font-bold text-brand-navy">{stats.scheduled}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Completed This Month</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.completedThisMonth}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <ChartBarIcon className="h-5 w-5 text-indigo-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Average Score</span>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(stats.averageScore)}`}>
              {stats.averageScore !== null ? `${Math.round(stats.averageScore)}%` : "N/A"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Open Corrective Actions</span>
            </div>
            <div className="text-2xl font-bold text-amber-600">{stats.openCorrectiveActions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="rounded-md border-gray-300 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Template</label>
              <select
                value={filters.templateId}
                onChange={(e) => setFilters({ ...filters, templateId: e.target.value })}
                className="rounded-md border-gray-300 text-sm"
              >
                <option value="">All Templates</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Franchisee</label>
              <select
                value={filters.franchiseeId}
                onChange={(e) => setFilters({ ...filters, franchiseeId: e.target.value })}
                className="rounded-md border-gray-300 text-sm"
              >
                <option value="">All Franchisees</option>
                {franchisees.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.firstName} {f.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audits Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Franchisee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Template</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auditor</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center">
                      <div className="animate-pulse flex justify-center">
                        <div className="h-4 bg-gray-200 rounded w-24" />
                      </div>
                    </td>
                  </tr>
                ) : audits.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <ClipboardDocumentCheckIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No audits found</p>
                      <p className="text-gray-400 text-sm mt-1">Schedule your first audit to get started.</p>
                      <Link
                        href="/admin/operations/audits/new"
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Schedule Audit
                      </Link>
                    </td>
                  </tr>
                ) : (
                  audits.map((audit) => (
                    <tr key={audit.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {formatDate(audit.scheduledDate)}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">{audit.franchisee.name}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {audit.template.name}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {audit.auditorName}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {audit.overallScore !== null ? (
                          <div className="inline-flex items-center justify-center">
                            <span
                              className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${getScoreBgColor(audit.overallScore)} ${getScoreColor(audit.overallScore)}`}
                            >
                              {Math.round(audit.overallScore)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">--</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            STATUS_COLORS[audit.status] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {audit.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {audit.correctiveActionCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800">
                            <ExclamationTriangleIcon className="h-3 w-3" />
                            {audit.correctiveActionCount}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">0</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/admin/operations/audits/${audit.id}`}
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          <EyeIcon className="h-4 w-4" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </WideContainer>
  );
}
