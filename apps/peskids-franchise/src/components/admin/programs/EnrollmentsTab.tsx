"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/shared/Card";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import {
  UserGroupIcon,
  CheckCircleIcon,
  UserPlusIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

interface EnrollmentsTabProps {
  programId: string;
}

interface Enrollment {
  id: string;
  prospectId: string;
  prospect: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  status: string;
  enrolledAt: string;
  completedAt: string | null;
  progressPercentage: number;
  completedModules: number;
  totalModules: number;
}

interface AvailableFranchisee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  ENROLLED: {
    label: "Enrolled",
    className: "bg-blue-100 text-blue-700",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-amber-100 text-amber-700",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-100 text-emerald-700",
  },
};

export default function EnrollmentsTab({ programId }: EnrollmentsTabProps) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [availableFranchisees, setAvailableFranchisees] = useState<AvailableFranchisee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [enrollingIds, setEnrollingIds] = useState<Set<string>>(new Set());
  const [unenrollingId, setUnenrollingId] = useState<string | null>(null);
  const [confirmUnenroll, setConfirmUnenroll] = useState<Enrollment | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      const res = await fetch(`/api/admin/bootcamp/programs/${programId}/enrollments`);
      if (!res.ok) throw new Error("Failed to load enrollments");
      const data = await res.json();
      setEnrollments(data.enrollments);
      setAvailableFranchisees(data.availableFranchisees);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  const handleEnroll = async (prospectIds: string[]) => {
    setEnrollingIds((prev) => new Set([...prev, ...prospectIds]));
    try {
      const res = await fetch(`/api/admin/bootcamp/programs/${programId}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectIds }),
      });
      if (!res.ok) throw new Error("Failed to enroll");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enroll");
    } finally {
      setEnrollingIds(new Set());
    }
  };

  const handleUnenroll = async () => {
    if (!confirmUnenroll) return;
    const prospectId = confirmUnenroll.prospectId;
    setConfirmUnenroll(null);
    setUnenrollingId(prospectId);
    try {
      const res = await fetch(
        `/api/admin/bootcamp/programs/${programId}/enrollments?prospectId=${prospectId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to unenroll");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unenroll");
    } finally {
      setUnenrollingId(null);
    }
  };

  const filteredAvailable = useMemo(() => {
    if (!search.trim()) return availableFranchisees;
    const q = search.toLowerCase();
    return availableFranchisees.filter(
      (f) =>
        `${f.firstName} ${f.lastName}`.toLowerCase().includes(q) ||
        f.email.toLowerCase().includes(q)
    );
  }, [availableFranchisees, search]);

  const activeCount = enrollments.filter((e) => e.status !== "COMPLETED").length;
  const completedCount = enrollments.filter((e) => e.status === "COMPLETED").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="px-4 py-2 text-sm font-medium text-white bg-brand-navy rounded-lg hover:bg-brand-purple transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <UserGroupIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Enrollments</p>
                <p className="text-2xl font-bold text-brand-navy">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-brand-navy">{completedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50">
                <UserPlusIcon className="h-5 w-5 text-brand-purple" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Available</p>
                <p className="text-2xl font-bold text-brand-navy">{availableFranchisees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Enrolled Franchisees */}
        <div className="lg:col-span-3">
          <Card>
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-brand-navy">
                Enrolled Franchisees
              </h3>
            </div>
            <CardContent className="p-0">
              {enrollments.length === 0 ? (
                <div className="px-6 py-10 text-center text-gray-500">
                  No franchisees enrolled yet. Add them from the list on the right.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {enrollments.map((enrollment) => {
                    const badge = statusConfig[enrollment.status] ?? {
                      label: enrollment.status,
                      className: "bg-gray-100 text-gray-700",
                    };
                    return (
                      <div
                        key={enrollment.id}
                        className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                      >
                        {/* Name & email */}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {enrollment.prospect.firstName} {enrollment.prospect.lastName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{enrollment.prospect.email}</p>
                        </div>

                        {/* Progress bar */}
                        <div className="w-24 shrink-0">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>{enrollment.progressPercentage}%</span>
                            <span>
                              {enrollment.completedModules}/{enrollment.totalModules}
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-cyan rounded-full transition-all"
                              style={{ width: `${enrollment.progressPercentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Status badge */}
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${badge.className}`}
                        >
                          {badge.label}
                        </span>

                        {/* Unenroll button */}
                        <button
                          onClick={() => setConfirmUnenroll(enrollment)}
                          disabled={unenrollingId === enrollment.prospectId}
                          className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 shrink-0"
                          title="Unenroll"
                        >
                          {unenrollingId === enrollment.prospectId ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-500" />
                          ) : (
                            <XMarkIcon className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Available Franchisees */}
        <div className="lg:col-span-2">
          <Card>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-brand-navy">
                Available Franchisees
              </h3>
              {availableFranchisees.length > 0 && (
                <button
                  onClick={() => handleEnroll(availableFranchisees.map((f) => f.id))}
                  disabled={enrollingIds.size > 0}
                  className="text-sm font-medium text-brand-purple hover:text-brand-navy transition-colors disabled:opacity-50"
                >
                  Enroll All
                </button>
              )}
            </div>
            <div className="px-6 py-3 border-b border-gray-100">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple/40 focus:border-brand-purple"
                />
              </div>
            </div>
            <CardContent className="p-0">
              {filteredAvailable.length === 0 ? (
                <div className="px-6 py-10 text-center text-gray-500 text-sm">
                  {availableFranchisees.length === 0
                    ? "All franchisees are enrolled."
                    : "No results match your search."}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                  {filteredAvailable.map((franchisee) => {
                    const isEnrolling = enrollingIds.has(franchisee.id);
                    return (
                      <div
                        key={franchisee.id}
                        className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {franchisee.firstName} {franchisee.lastName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{franchisee.email}</p>
                        </div>
                        <button
                          onClick={() => handleEnroll([franchisee.id])}
                          disabled={isEnrolling}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-brand-navy rounded-lg hover:bg-brand-purple transition-colors disabled:opacity-50 shrink-0"
                        >
                          {isEnrolling ? "Enrolling..." : "Enroll"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Unenroll Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmUnenroll !== null}
        title="Unenroll Franchisee"
        message={
          confirmUnenroll
            ? `Are you sure you want to unenroll ${confirmUnenroll.prospect.firstName} ${confirmUnenroll.prospect.lastName}? Their progress will be lost.`
            : ""
        }
        confirmLabel="Unenroll"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={handleUnenroll}
        onCancel={() => setConfirmUnenroll(null)}
      />
    </div>
  );
}
