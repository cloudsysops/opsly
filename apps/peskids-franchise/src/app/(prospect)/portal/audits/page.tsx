"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { Card, CardHeader, CardContent } from "@/components/shared/Card";
import { formatDate } from "@/lib/utils";
import {
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

interface FranchiseeAudit {
  id: string;
  scheduledDate: string;
  completedAt: string | null;
  status: string;
  overallScore: number | null;
  auditorName: string;
  correctiveActionCount: number;
  template: {
    id: string;
    name: string;
    category: string;
  };
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  SCHEDULED: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Scheduled', icon: CalendarDaysIcon },
  IN_PROGRESS: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'In Progress', icon: ClockIcon },
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed', icon: CheckCircleIcon },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Cancelled', icon: ClockIcon },
};

function getScoreColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

function getScoreRingColor(score: number | null): string {
  if (score === null) return "border-gray-200";
  if (score >= 80) return "border-green-500";
  if (score >= 60) return "border-amber-500";
  return "border-red-500";
}

function getScoreBg(score: number | null): string {
  if (score === null) return "bg-gray-50";
  if (score >= 80) return "bg-green-50";
  if (score >= 60) return "bg-amber-50";
  return "bg-red-50";
}

function getScoreLabel(score: number | null): string {
  if (score === null) return "N/A";
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 70) return "Satisfactory";
  if (score >= 60) return "Needs Work";
  return "Critical";
}

export default function FranchiseeAuditsPage() {
  const [audits, setAudits] = useState<FranchiseeAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAudits();
  }, []);

  async function fetchAudits() {
    try {
      const res = await fetch("/api/franchisee/operations/audits");
      const json = await res.json();

      if (json.error) {
        setError(json.error);
        return;
      }

      setAudits(json.audits || []);
    } catch (err) {
      console.error("Error fetching audits:", err);
      setError("Failed to load audit reports");
    } finally {
      setLoading(false);
    }
  }

  // Calculate summary stats
  const completedAudits = audits.filter(a => a.status === 'COMPLETED');
  const scheduledAudits = audits.filter(a => a.status === 'SCHEDULED');
  const pendingActions = audits.reduce((sum, a) => sum + a.correctiveActionCount, 0);
  const avgScore = completedAudits.length > 0
    ? completedAudits.reduce((sum, a) => sum + (a.overallScore || 0), 0) / completedAudits.length
    : null;

  if (loading) {
    return (
      <WideContainer className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </WideContainer>
    );
  }

  if (error) {
    return (
      <WideContainer className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </WideContainer>
    );
  }

  return (
    <WideContainer className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy flex items-center gap-3">
          <ClipboardDocumentCheckIcon className="h-8 w-8 text-indigo-600" />
          Audit Reports
        </h1>
        <p className="mt-1 text-gray-600">
          View your field audit results and corrective actions
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <span className="text-sm text-gray-500">Completed Audits</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{completedAudits.length}</p>
          </CardContent>
        </Card>

        <Card className={scheduledAudits.length > 0 ? 'border-blue-300 bg-blue-50' : ''}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDaysIcon className={`h-5 w-5 ${scheduledAudits.length > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className="text-sm text-gray-500">Upcoming</span>
            </div>
            <p className={`text-2xl font-bold ${scheduledAudits.length > 0 ? 'text-blue-600' : 'text-gray-600'}`}>
              {scheduledAudits.length}
            </p>
          </CardContent>
        </Card>

        <Card className={pendingActions > 0 ? 'border-amber-300 bg-amber-50' : ''}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <ExclamationTriangleIcon className={`h-5 w-5 ${pendingActions > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
              <span className="text-sm text-gray-500">Open Actions</span>
            </div>
            <p className={`text-2xl font-bold ${pendingActions > 0 ? 'text-amber-600' : 'text-gray-600'}`}>
              {pendingActions}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardDocumentCheckIcon className="h-5 w-5 text-brand-purple" />
              <span className="text-sm text-gray-500">Average Score</span>
            </div>
            <p className={`text-2xl font-bold ${getScoreColor(avgScore)}`}>
              {avgScore !== null ? `${Math.round(avgScore)}%` : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Audits Alert */}
      {scheduledAudits.length > 0 && (
        <Card className="border-blue-300 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-800">Upcoming Audits</span>
            </div>
            <div className="space-y-2">
              {scheduledAudits.map((audit) => (
                <div key={audit.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200">
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{audit.template.name}</span>
                    <span className="text-blue-600 ml-2 text-sm">
                      {formatDate(audit.scheduledDate)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    Auditor: {audit.auditorName}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audits List */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">Audit History</h2>
        </CardHeader>
        <CardContent>
          {audits.length === 0 ? (
            <div className="py-12 text-center">
              <ClipboardDocumentCheckIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No audits have been conducted yet.</p>
              <p className="text-gray-400 text-sm mt-1">
                Your audit results will appear here once an audit has been completed.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {audits.map((audit) => {
                const status = STATUS_CONFIG[audit.status] || STATUS_CONFIG.SCHEDULED;
                const StatusIcon = status.icon;

                return (
                  <Link
                    key={audit.id}
                    href={`/portal/audits/${audit.id}`}
                    className="block"
                  >
                    <div className="flex items-center gap-6 p-5 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all">
                      {/* Score Circle */}
                      <div
                        className={`flex-shrink-0 w-20 h-20 rounded-full border-4 ${getScoreRingColor(audit.overallScore)} ${getScoreBg(audit.overallScore)} flex flex-col items-center justify-center`}
                      >
                        {audit.overallScore !== null ? (
                          <>
                            <span className={`text-2xl font-bold ${getScoreColor(audit.overallScore)}`}>
                              {Math.round(audit.overallScore)}
                            </span>
                            <span className="text-xs text-gray-500">Score</span>
                          </>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </div>

                      {/* Audit Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {audit.template.name}
                          </h3>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                            {status.label}
                          </span>
                          {audit.correctiveActionCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                              {audit.correctiveActionCount} action{audit.correctiveActionCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <CalendarDaysIcon className="h-4 w-4" />
                            {audit.completedAt
                              ? formatDate(audit.completedAt)
                              : formatDate(audit.scheduledDate)}
                          </span>
                          <span>Auditor: {audit.auditorName}</span>
                          <span className="text-gray-400">{audit.template.category}</span>
                        </div>
                        {audit.overallScore !== null && (
                          <p className={`text-sm font-medium mt-2 ${getScoreColor(audit.overallScore)}`}>
                            {getScoreLabel(audit.overallScore)}
                          </p>
                        )}
                      </div>

                      {/* Arrow */}
                      <ArrowRightIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-gray-50">
        <CardContent className="py-6">
          <h3 className="font-semibold text-gray-900 mb-2">About Audits</h3>
          <p className="text-sm text-gray-600">
            Field audits help ensure consistent quality across all Peskids Franchises.
            After each audit, you&apos;ll receive a detailed report with your scores and any corrective
            actions needed. Questions? Contact{' '}
            <a href="mailto:franchising@peskids.com" className="text-brand-purple hover:underline">
              franchising@peskids.com
            </a>
          </p>
        </CardContent>
      </Card>
    </WideContainer>
  );
}
