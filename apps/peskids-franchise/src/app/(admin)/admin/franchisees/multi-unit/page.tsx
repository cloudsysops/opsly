"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronRightIcon,
  MapPinIcon,
  BuildingOffice2Icon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { DevelopmentAgreementModal } from "@/components/admin/franchisees/DevelopmentAgreementModal";

export const dynamic = "force-dynamic";

interface Territory {
  id: string;
  name: string;
  state: string;
  status: string;
  assignedAt: string | null;
}

interface ScheduleItem {
  unitNumber: number;
  deadline: string;
  status: string;
}

interface Operator {
  id: string;
  prospectId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  selectedAt: string | null;
  llcName: string | null;
  operatorType: string;
  territoryCount: number;
  territories: Territory[];
  ytdRevenue: number;
  currentMonthRevenue: number;
  stripeOnboarded: boolean;
  developmentAgreement: {
    id: string;
    totalUnits: number;
    developmentFee: number;
    startDate: string;
    endDate: string;
    schedule: ScheduleItem[];
  } | null;
}

const OPERATOR_TYPE_LABELS: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  MULTI_UNIT: {
    label: "Multi-Unit",
    bg: "bg-blue-100",
    text: "text-blue-700",
  },
  AREA_DEVELOPER: {
    label: "Area Developer",
    bg: "bg-purple-100",
    text: "text-purple-700",
  },
  REGIONAL_DEVELOPER: {
    label: "Regional Developer",
    bg: "bg-indigo-100",
    text: "text-indigo-700",
  },
  MASTER_FRANCHISEE: {
    label: "Master Franchisee",
    bg: "bg-amber-100",
    text: "text-amber-700",
  },
};

function getNextMilestone(schedule: ScheduleItem[]): ScheduleItem | null {
  const pending = schedule
    .filter((s) => s.status !== "COMPLETED")
    .sort(
      (a, b) =>
        new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    );
  return pending.length > 0 ? pending[0] : null;
}

function getMilestoneColor(deadline: string): string {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const daysUntil = Math.ceil(
    (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntil < 0) return "text-red-600"; // overdue
  if (daysUntil <= 30) return "text-amber-600"; // < 30 days
  return "text-green-600"; // > 30 days
}

function getMilestoneBgColor(deadline: string): string {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const daysUntil = Math.ceil(
    (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntil < 0) return "bg-red-50";
  if (daysUntil <= 30) return "bg-amber-50";
  return "bg-green-50";
}

export default function MultiUnitOperatorsPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<{
    id: string;
    totalUnits: number;
    developmentFee: number;
    startDate: string;
    endDate: string;
    schedule: ScheduleItem[];
    franchiseeAccountIds?: string[];
  } | null>(null);
  const [deleteAgreementId, setDeleteAgreementId] = useState<string | null>(
    null
  );

  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    try {
      const response = await fetch("/api/admin/multi-unit-operators");
      const data = await response.json();
      setOperators(data.operators || []);
    } catch (error) {
      console.error("Failed to fetch multi-unit operators:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAgreement = () => {
    setEditingAgreement(null);
    setShowAgreementModal(true);
  };

  const handleEditAgreement = (operator: Operator) => {
    if (!operator.developmentAgreement) return;
    setEditingAgreement({
      ...operator.developmentAgreement,
      franchiseeAccountIds: [operator.id],
    });
    setShowAgreementModal(true);
  };

  const handleAgreementSaved = () => {
    setShowAgreementModal(false);
    setEditingAgreement(null);
    fetchOperators();
  };

  const confirmDeleteAgreement = async () => {
    if (!deleteAgreementId) return;
    try {
      await fetch(
        `/api/admin/development-agreements/${deleteAgreementId}`,
        { method: "DELETE" }
      );
      setDeleteAgreementId(null);
      fetchOperators();
    } catch (error) {
      console.error("Failed to delete development agreement:", error);
      setDeleteAgreementId(null);
    }
  };

  const agreementCount = operators.filter(
    (op) => op.developmentAgreement
  ).length;

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
          <h1 className="text-2xl font-bold text-gray-900">
            Multi-Unit Operators
          </h1>
          <p className="text-gray-500 mt-1">
            {operators.length} multi-unit operator
            {operators.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateAgreement}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-purple transition-colors text-sm font-medium"
          >
            <PlusIcon className="h-4 w-4" />
            Create Agreement
          </button>
          <Link
            href="/admin/franchisees"
            className="text-sm text-brand-navy hover:text-brand-navy/80 font-medium"
          >
            View All Franchisees
          </Link>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <BuildingOffice2Icon className="h-4 w-4" />
            Total Operators
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {operators.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <MapPinIcon className="h-4 w-4" />
            Total Territories
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {operators.reduce((sum, op) => sum + op.territoryCount, 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">Combined YTD Revenue</div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(
              operators.reduce((sum, op) => sum + op.ytdRevenue, 0)
            )}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">Avg Territories</div>
          <p className="text-2xl font-bold text-gray-900">
            {operators.length > 0
              ? (
                  operators.reduce((sum, op) => sum + op.territoryCount, 0) /
                  operators.length
                ).toFixed(1)
              : "0"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <DocumentTextIcon className="h-4 w-4" />
            Dev Agreements
          </div>
          <p className="text-2xl font-bold text-gray-900">{agreementCount}</p>
        </div>
      </div>

      {/* Operators Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Operator
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  # Territories
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Total Revenue (YTD)
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Operator Type
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Agreement Progress
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {operators.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <BuildingOffice2Icon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">
                      No multi-unit operators yet
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Franchisees with 2 or more territories will appear here
                      automatically.
                    </p>
                  </td>
                </tr>
              ) : (
                operators.map((operator) => {
                  const typeInfo =
                    OPERATOR_TYPE_LABELS[operator.operatorType] ||
                    OPERATOR_TYPE_LABELS.MULTI_UNIT;

                  const agreement = operator.developmentAgreement;
                  const completedUnits = agreement
                    ? agreement.schedule.filter(
                        (s) => s.status === "COMPLETED"
                      ).length
                    : 0;
                  const nextMilestone = agreement
                    ? getNextMilestone(agreement.schedule)
                    : null;

                  return (
                    <tr key={operator.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-brand-purple/10 flex items-center justify-center text-brand-purple font-medium text-sm flex-shrink-0">
                            {operator.firstName[0]}
                            {operator.lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {operator.firstName} {operator.lastName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {operator.email}
                            </p>
                            {operator.llcName && (
                              <p className="text-xs text-gray-400">
                                {operator.llcName}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-gray-900">
                            {operator.territoryCount}
                          </span>
                          <div className="flex flex-col">
                            {operator.territories.slice(0, 3).map((t) => (
                              <span
                                key={t.id}
                                className="text-xs text-gray-500"
                              >
                                {t.name}, {t.state}
                              </span>
                            ))}
                            {operator.territories.length > 3 && (
                              <span className="text-xs text-gray-400">
                                +{operator.territories.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(operator.ytdRevenue)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.bg} ${typeInfo.text}`}
                        >
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {agreement ? (
                          <div className="space-y-2">
                            {/* Progress bar */}
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-medium text-gray-700">
                                  {completedUnits} of {agreement.totalUnits}{" "}
                                  units opened
                                </span>
                                <span className="text-gray-500">
                                  {agreement.totalUnits > 0
                                    ? Math.round(
                                        (completedUnits /
                                          agreement.totalUnits) *
                                          100
                                      )
                                    : 0}
                                  %
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-brand-purple rounded-full h-2 transition-all"
                                  style={{
                                    width: `${
                                      agreement.totalUnits > 0
                                        ? (completedUnits /
                                            agreement.totalUnits) *
                                          100
                                        : 0
                                    }%`,
                                  }}
                                />
                              </div>
                            </div>

                            {/* Next milestone */}
                            {nextMilestone && (
                              <div
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${getMilestoneBgColor(
                                  nextMilestone.deadline
                                )} ${getMilestoneColor(
                                  nextMilestone.deadline
                                )}`}
                              >
                                Next: Unit #{nextMilestone.unitNumber} due{" "}
                                {formatDate(nextMilestone.deadline)}
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditAgreement(operator)}
                                className="inline-flex items-center gap-1 text-xs text-brand-navy hover:text-brand-purple transition-colors"
                                title="Edit Agreement"
                              >
                                <PencilIcon className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteAgreementId(agreement.id)
                                }
                                className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 transition-colors"
                                title="Remove Agreement"
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            No agreement
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/franchisees/${operator.prospectId}`}
                          className="inline-flex items-center gap-1 text-sm text-brand-navy hover:text-brand-navy/80"
                        >
                          View Profile
                          <ChevronRightIcon className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Development Agreement Modal */}
      <DevelopmentAgreementModal
        isOpen={showAgreementModal}
        agreement={editingAgreement}
        operators={operators.map((op) => ({
          id: op.id,
          firstName: op.firstName,
          lastName: op.lastName,
        }))}
        onClose={() => {
          setShowAgreementModal(false);
          setEditingAgreement(null);
        }}
        onSaved={handleAgreementSaved}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteAgreementId !== null}
        title="Remove Development Agreement"
        message="Are you sure you want to remove this development agreement? This will unlink all associated franchisee accounts. This action cannot be undone."
        confirmLabel="Remove Agreement"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={confirmDeleteAgreement}
        onCancel={() => setDeleteAgreementId(null)}
      />
    </div>
  );
}
