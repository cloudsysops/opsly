"use client";

import { useState, useEffect } from "react";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import {
  ChartBarIcon,
  PlusIcon,
  PlayIcon,
  CalendarIcon,
  DocumentArrowDownIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface CustomReport {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  reportType: string;
  dataSource: string;
  chartType: string | null;
  isSystem: boolean;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  schedules: ReportSchedule[];
}

interface ReportSchedule {
  id: string;
  frequency: string;
  time: string;
  recipients: string[];
  format: string;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

const reportTypeLabels: Record<string, string> = {
  FINANCIAL: "Financial",
  OPERATIONAL: "Operational",
  COMPLIANCE: "Compliance",
  MARKETING: "Marketing",
  PERFORMANCE: "Performance",
  CUSTOM: "Custom",
};

const chartTypeLabels: Record<string, string> = {
  LINE: "Line Chart",
  BAR: "Bar Chart",
  PIE: "Pie Chart",
  DONUT: "Donut Chart",
  AREA: "Area Chart",
  TABLE: "Data Table",
  KPI: "KPI Cards",
  HEATMAP: "Heatmap",
};

export default function CustomReportsPage() {
  const [reports, setReports] = useState<CustomReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<CustomReport | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/admin/reports");
      const data = await res.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await fetch(`/api/admin/reports/${deleteId}`, { method: "DELETE" });
      fetchReports();
    } catch (error) {
      console.error("Failed to delete report:", error);
    } finally {
      setDeleteId(null);
    }
  };

  const runReport = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/reports/${id}/run`, { method: "POST" });
      if (res.ok) {
        // Download the result
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `report-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Failed to run report:", error);
    }
  };

  const systemReports = reports.filter((r) => r.isSystem);
  const customReports = reports.filter((r) => !r.isSystem);

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
            <h1 className="text-2xl font-bold text-gray-900">Custom Reports</h1>
            <p className="mt-1 text-sm text-gray-500">
              Create and manage custom reports with scheduled delivery
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-purple hover:bg-brand-purple/90"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Report
          </button>
        </div>

        {/* System Reports */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-medium text-gray-900">System Reports</h2>
            <p className="text-sm text-gray-500">Built-in reports for common analytics needs</p>
          </div>
          <div className="divide-y divide-gray-200">
            {systemReports.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No system reports available
              </div>
            ) : (
              systemReports.map((report) => (
                <ReportRow
                  key={report.id}
                  report={report}
                  onRun={() => runReport(report.id)}
                  onSchedule={() => {
                    setSelectedReport(report);
                    setShowScheduleModal(true);
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Custom Reports */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-medium text-gray-900">Custom Reports</h2>
            <p className="text-sm text-gray-500">Reports you&apos;ve created</p>
          </div>
          <div className="divide-y divide-gray-200">
            {customReports.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 font-medium">No custom reports yet</p>
                <p className="text-sm">Create your first custom report to get started.</p>
              </div>
            ) : (
              customReports.map((report) => (
                <ReportRow
                  key={report.id}
                  report={report}
                  onRun={() => runReport(report.id)}
                  onSchedule={() => {
                    setSelectedReport(report);
                    setShowScheduleModal(true);
                  }}
                  onDelete={() => deleteReport(report.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Report Modal */}
      {showCreateModal && (
        <CreateReportModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchReports();
          }}
        />
      )}

      {/* Schedule Modal */}
      {showScheduleModal && selectedReport && (
        <ScheduleReportModal
          report={selectedReport}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedReport(null);
          }}
          onSaved={() => {
            setShowScheduleModal(false);
            setSelectedReport(null);
            fetchReports();
          }}
        />
      )}
      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Report"
        message="Are you sure you want to delete this report? This cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </WideContainer>
  );
}

interface ReportRowProps {
  report: CustomReport;
  onRun: () => void;
  onSchedule: () => void;
  onDelete?: () => void;
}

function ReportRow({ report, onRun, onSchedule, onDelete }: ReportRowProps) {
  const activeSchedules = report.schedules.filter((s) => s.isActive);

  return (
    <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-900 truncate">{report.name}</h3>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              report.reportType === "FINANCIAL"
                ? "bg-green-100 text-green-800"
                : report.reportType === "OPERATIONAL"
                ? "bg-blue-100 text-blue-800"
                : report.reportType === "COMPLIANCE"
                ? "bg-purple-100 text-purple-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {reportTypeLabels[report.reportType]}
          </span>
          {report.chartType && (
            <span className="text-xs text-gray-500">
              {chartTypeLabels[report.chartType]}
            </span>
          )}
        </div>
        {report.description && (
          <p className="text-sm text-gray-500 truncate">{report.description}</p>
        )}
        {activeSchedules.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <ClockIcon className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-500">
              {activeSchedules.length} active schedule(s)
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 ml-4">
        <button
          onClick={onRun}
          className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <PlayIcon className="h-4 w-4 mr-1" />
          Run
        </button>
        <button
          onClick={onSchedule}
          className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <CalendarIcon className="h-4 w-4 mr-1" />
          Schedule
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 p-1"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

interface CreateReportModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateReportModal({ onClose, onCreated }: CreateReportModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    reportType: "FINANCIAL",
    dataSource: "franchisee_revenue",
    chartType: "BAR",
    isPublic: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Failed to create report");
      }

      onCreated();
    } catch (err) {
      console.error("Failed to create report:", err);
      setError("Failed to create report");
    } finally {
      setSubmitting(false);
    }
  };

  const dataSources = [
    { value: "franchisee_revenue", label: "Franchisee Revenue" },
    { value: "royalty_invoices", label: "Royalty Invoices" },
    { value: "health_scores", label: "Health Scores" },
    { value: "compliance", label: "Compliance Status" },
    { value: "agreements", label: "Franchise Agreements" },
    { value: "prospects", label: "Prospect Pipeline" },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-auto z-10">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">Create Custom Report</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Report Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Monthly Revenue Summary"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does this report show?"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Report Type</label>
                <select
                  value={formData.reportType}
                  onChange={(e) => setFormData({ ...formData, reportType: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                >
                  {Object.entries(reportTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Chart Type</label>
                <select
                  value={formData.chartType}
                  onChange={(e) => setFormData({ ...formData, chartType: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                >
                  {Object.entries(chartTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Data Source</label>
              <select
                value={formData.dataSource}
                onChange={(e) => setFormData({ ...formData, dataSource: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
              >
                {dataSources.map((ds) => (
                  <option key={ds.value} value={ds.value}>
                    {ds.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="h-4 w-4 text-brand-purple focus:ring-brand-purple border-gray-300 rounded"
              />
              <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
                Make available to franchisees
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                {error}
              </div>
            )}

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
                disabled={submitting || !formData.name}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-purple rounded-md hover:bg-brand-purple/90 disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Report"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

interface ScheduleReportModalProps {
  report: CustomReport;
  onClose: () => void;
  onSaved: () => void;
}

function ScheduleReportModal({ report, onClose, onSaved }: ScheduleReportModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [schedules, setSchedules] = useState(report.schedules);
  const [error, setError] = useState<string | null>(null);
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null);
  const [newSchedule, setNewSchedule] = useState({
    frequency: "WEEKLY",
    dayOfWeek: 1,
    dayOfMonth: 1,
    time: "09:00",
    recipients: "",
    format: "PDF",
  });

  const addSchedule = async () => {
    setError(null);

    if (!newSchedule.recipients) {
      setError("Please enter at least one recipient email");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/reports/${report.id}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newSchedule,
          recipients: newSchedule.recipients.split(",").map((e) => e.trim()),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create schedule");
      }

      onSaved();
    } catch (err) {
      console.error("Failed to create schedule:", err);
      setError("Failed to create schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSchedule = async (scheduleId: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/reports/${report.id}/schedules/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      onSaved();
    } catch (error) {
      console.error("Failed to toggle schedule:", error);
    }
  };

  const deleteSchedule = (scheduleId: string) => {
    setDeleteScheduleId(scheduleId);
  };

  const confirmDeleteSchedule = async () => {
    if (!deleteScheduleId) return;
    try {
      await fetch(`/api/admin/reports/${report.id}/schedules/${deleteScheduleId}`, {
        method: "DELETE",
      });
      onSaved();
    } catch (err) {
      console.error("Failed to delete schedule:", err);
    } finally {
      setDeleteScheduleId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-auto z-10 max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Schedule Report</h3>
              <p className="text-sm text-gray-500">{report.name}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Existing Schedules */}
            {schedules.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Active Schedules</h4>
                <div className="space-y-2">
                  {schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {schedule.frequency} at {schedule.time}
                        </p>
                        <p className="text-xs text-gray-500">
                          {schedule.recipients.join(", ")} • {schedule.format}
                        </p>
                        {schedule.nextRunAt && (
                          <p className="text-xs text-gray-400">
                            Next run: {new Date(schedule.nextRunAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSchedule(schedule.id, schedule.isActive)}
                          className={`px-2 py-1 text-xs rounded ${
                            schedule.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {schedule.isActive ? "Active" : "Paused"}
                        </button>
                        <button
                          onClick={() => deleteSchedule(schedule.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Schedule Form */}
            <div className="border-t pt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Add New Schedule</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Frequency</label>
                    <select
                      value={newSchedule.frequency}
                      onChange={(e) => setNewSchedule({ ...newSchedule, frequency: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                    >
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Time (UTC)</label>
                    <input
                      type="time"
                      value={newSchedule.time}
                      onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                    />
                  </div>
                </div>

                {newSchedule.frequency === "WEEKLY" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Day of Week</label>
                    <select
                      value={newSchedule.dayOfWeek}
                      onChange={(e) =>
                        setNewSchedule({ ...newSchedule, dayOfWeek: parseInt(e.target.value) })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                    >
                      <option value={0}>Sunday</option>
                      <option value={1}>Monday</option>
                      <option value={2}>Tuesday</option>
                      <option value={3}>Wednesday</option>
                      <option value={4}>Thursday</option>
                      <option value={5}>Friday</option>
                      <option value={6}>Saturday</option>
                    </select>
                  </div>
                )}

                {newSchedule.frequency === "MONTHLY" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Day of Month</label>
                    <input
                      type="number"
                      min={1}
                      max={28}
                      value={newSchedule.dayOfMonth}
                      onChange={(e) =>
                        setNewSchedule({ ...newSchedule, dayOfMonth: parseInt(e.target.value) })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Recipients (comma-separated emails)
                  </label>
                  <input
                    type="text"
                    value={newSchedule.recipients}
                    onChange={(e) => setNewSchedule({ ...newSchedule, recipients: e.target.value })}
                    placeholder="email1@example.com, email2@example.com"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Export Format</label>
                  <select
                    value={newSchedule.format}
                    onChange={(e) => setNewSchedule({ ...newSchedule, format: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                  >
                    <option value="PDF">PDF</option>
                    <option value="EXCEL">Excel</option>
                    <option value="CSV">CSV</option>
                  </select>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  onClick={addSchedule}
                  disabled={submitting || !newSchedule.recipients}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-brand-purple rounded-md hover:bg-brand-purple/90 disabled:opacity-50"
                >
                  {submitting ? "Adding..." : "Add Schedule"}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Done
              </button>
            </div>
          </div>

          <ConfirmModal
            isOpen={!!deleteScheduleId}
            title="Delete Schedule"
            message="Are you sure you want to delete this schedule? This cannot be undone."
            confirmLabel="Delete"
            confirmVariant="danger"
            onConfirm={confirmDeleteSchedule}
            onCancel={() => setDeleteScheduleId(null)}
          />
        </div>
      </div>
    </div>
  );
}
