"use client";

import { useState, useEffect } from "react";
import {
  XMarkIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

interface ScheduleRow {
  unitNumber: number;
  deadline: string;
  status: string;
}

interface AgreementData {
  id: string;
  totalUnits: number;
  developmentFee: number;
  startDate: string;
  endDate: string;
  schedule: ScheduleRow[];
  franchiseeAccountIds?: string[];
}

interface DevelopmentAgreementModalProps {
  isOpen: boolean;
  agreement?: AgreementData | null;
  operators: Array<{ id: string; firstName: string; lastName: string }>;
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "ON_TRACK", label: "On Track" },
  { value: "DELAYED", label: "Delayed" },
  { value: "COMPLETED", label: "Completed" },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  ON_TRACK: "bg-green-100 text-green-700",
  DELAYED: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-blue-100 text-blue-700",
};

export function DevelopmentAgreementModal({
  isOpen,
  agreement,
  operators,
  onClose,
  onSaved,
}: DevelopmentAgreementModalProps) {
  const [totalUnits, setTotalUnits] = useState(2);
  const [developmentFee, setDevelopmentFee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!agreement;

  // Initialize form when modal opens or agreement changes
  useEffect(() => {
    if (!isOpen) return;

    if (agreement) {
      setTotalUnits(agreement.totalUnits);
      setDevelopmentFee(String(agreement.developmentFee));
      setStartDate(agreement.startDate.split("T")[0]);
      setEndDate(agreement.endDate.split("T")[0]);
      setSchedule(
        agreement.schedule.map((s) => ({
          ...s,
          deadline: s.deadline.split("T")[0],
        }))
      );
      setSelectedAccountIds(agreement.franchiseeAccountIds || []);
    } else {
      setTotalUnits(2);
      setDevelopmentFee("");
      setStartDate("");
      setEndDate("");
      setSchedule(
        Array.from({ length: 2 }, (_, i) => ({
          unitNumber: i + 1,
          deadline: "",
          status: "PENDING",
        }))
      );
      setSelectedAccountIds([]);
    }
    setError(null);
  }, [isOpen, agreement]);

  // Auto-generate schedule rows when totalUnits changes
  useEffect(() => {
    if (totalUnits < 1) return;

    setSchedule((prev) => {
      if (prev.length === totalUnits) return prev;

      if (totalUnits > prev.length) {
        // Add new rows
        const newRows = Array.from(
          { length: totalUnits - prev.length },
          (_, i) => ({
            unitNumber: prev.length + i + 1,
            deadline: "",
            status: "PENDING",
          })
        );
        return [...prev, ...newRows];
      }

      // Trim rows
      return prev.slice(0, totalUnits).map((row, i) => ({
        ...row,
        unitNumber: i + 1,
      }));
    });
  }, [totalUnits]);

  const updateScheduleRow = (
    index: number,
    field: keyof ScheduleRow,
    value: string | number
  ) => {
    setSchedule((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const validate = (): string | null => {
    if (totalUnits < 1) return "Total units must be at least 1.";
    if (!developmentFee || isNaN(Number(developmentFee)) || Number(developmentFee) < 0)
      return "Please enter a valid development fee.";
    if (!startDate) return "Start date is required.";
    if (!endDate) return "End date is required.";
    if (new Date(endDate) <= new Date(startDate))
      return "End date must be after start date.";
    for (let i = 0; i < schedule.length; i++) {
      if (!schedule[i].deadline) {
        return `Deadline is required for Unit #${schedule[i].unitNumber}.`;
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const body = {
        totalUnits,
        developmentFee: Number(developmentFee),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        schedule: schedule.map((s) => ({
          unitNumber: s.unitNumber,
          deadline: s.deadline,
          status: s.status,
        })),
        franchiseeAccountIds: selectedAccountIds,
      };

      const url = isEditing
        ? `/api/admin/development-agreements/${agreement.id}`
        : "/api/admin/development-agreements";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save development agreement.");
      }

      onSaved();
    } catch (err) {
      console.error("Error saving development agreement:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save development agreement. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dev-agreement-modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3
              id="dev-agreement-modal-title"
              className="text-lg font-semibold text-brand-navy"
            >
              {isEditing
                ? "Edit Development Agreement"
                : "Create Development Agreement"}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              aria-label="Close dialog"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div
              className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm"
              role="alert"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Top row: Total Units + Development Fee */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Units *
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={totalUnits}
                  onChange={(e) =>
                    setTotalUnits(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Development Fee *
                </label>
                <div className="relative">
                  <CurrencyDollarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={developmentFee}
                    onChange={(e) => setDevelopmentFee(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Date row: Start + End */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <div className="relative">
                  <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <div className="relative">
                  <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Schedule Editor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit Development Schedule
              </label>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">
                        Unit #
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">
                        Deadline *
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {schedule.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-purple/10 text-brand-purple text-xs font-semibold">
                            {row.unitNumber}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="date"
                            value={row.deadline}
                            onChange={(e) =>
                              updateScheduleRow(index, "deadline", e.target.value)
                            }
                            className="w-full px-2 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={row.status}
                            onChange={(e) =>
                              updateScheduleRow(index, "status", e.target.value)
                            }
                            className={`px-2 py-1.5 border rounded-lg text-sm font-medium focus:ring-2 focus:ring-brand-cyan focus:border-transparent ${
                              STATUS_COLORS[row.status] || ""
                            }`}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Link Franchisee Accounts */}
            {operators.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link Franchisee Accounts
                </label>
                <div className="border rounded-lg max-h-40 overflow-y-auto p-3 space-y-2">
                  {operators.map((op) => (
                    <label
                      key={op.id}
                      className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAccountIds.includes(op.id)}
                        onChange={() => toggleAccount(op.id)}
                        className="h-4 w-4 rounded border-gray-300 text-brand-purple focus:ring-brand-cyan"
                      />
                      <span className="text-sm text-gray-700">
                        {op.firstName} {op.lastName}
                      </span>
                    </label>
                  ))}
                </div>
                {selectedAccountIds.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedAccountIds.length} account
                    {selectedAccountIds.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-white bg-brand-navy rounded-lg hover:bg-brand-purple transition-colors disabled:opacity-50"
              >
                {isSubmitting
                  ? "Saving..."
                  : isEditing
                    ? "Update Agreement"
                    : "Create Agreement"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
