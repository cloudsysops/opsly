"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { Card, CardContent } from "@/components/shared/Card";
import {
  PlusIcon,
  XMarkIcon,
  AcademicCapIcon,
  UserGroupIcon,
  CheckCircleIcon,
  PauseCircleIcon,
  ArrowsUpDownIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

interface Program {
  id: string;
  slug: string;
  name: string;
  description: string;
  programType: "ONBOARDING" | "CONTINUING_EDUCATION" | "CERTIFICATION";
  isActive: boolean;
  isDefault: boolean;
  sequence: number;
  enrollmentCount: number;
  completedCount: number;
  createdAt: string;
}

const programTypeLabels: Record<string, { label: string; color: string }> = {
  ONBOARDING: { label: "Onboarding", color: "bg-emerald-100 text-emerald-700" },
  CONTINUING_EDUCATION: { label: "Continuing Education", color: "bg-blue-100 text-blue-700" },
  CERTIFICATION: { label: "Certification", color: "bg-purple-100 text-purple-700" },
};

export default function ProgramsPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  // New program modal state
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    programType: "ONBOARDING" as Program["programType"],
    isActive: true,
    isDefault: false,
    sequence: 0,
  });
  const [saving, setSaving] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const fetchPrograms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/bootcamp/programs");
      const data = await res.json();
      setPrograms(data.programs || []);
    } catch (error) {
      console.error("Failed to fetch programs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const startNew = () => {
    setForm({
      name: "",
      description: "",
      programType: "ONBOARDING",
      isActive: true,
      isDefault: false,
      sequence: programs.length,
    });
    setShowEditor(true);
  };

  const saveProgram = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/admin/bootcamp/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setAlertMsg(data.error || "Failed to save program");
        return;
      }

      const { program } = await res.json();
      setShowEditor(false);
      router.push(`/admin/learning/programs/${program.id}`);
    } catch (error) {
      console.error("Failed to save program:", error);
      setAlertMsg("Failed to save program");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (program: Program) => {
    try {
      const res = await fetch(`/api/admin/bootcamp/programs/${program.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !program.isActive }),
      });

      if (!res.ok) {
        const data = await res.json();
        setAlertMsg(data.error || "Failed to update program");
        return;
      }

      await fetchPrograms();
    } catch (error) {
      console.error("Failed to toggle program:", error);
      setAlertMsg("Failed to toggle program");
    }
  };

  // Stats
  const totalPrograms = programs.length;
  const activePrograms = programs.filter((p) => p.isActive).length;
  const totalEnrollments = programs.reduce((sum, p) => sum + p.enrollmentCount, 0);
  const totalCompletions = programs.reduce((sum, p) => sum + p.completedCount, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">
            Learning Programs
          </h1>
          <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-gray-600">
            Manage training programs and track enrollments
          </p>
        </div>
        <button
          onClick={startNew}
          className="flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-lg text-sm font-medium hover:bg-brand-purple transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Program
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-navy/10 rounded-lg">
                <AcademicCapIcon className="h-5 w-5 text-brand-navy" />
              </div>
              <div>
                <div className="text-2xl font-bold text-brand-navy">{totalPrograms}</div>
                <div className="text-xs text-gray-500">Total Programs</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">{activePrograms}</div>
                <div className="text-xs text-gray-500">Active Programs</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserGroupIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{totalEnrollments}</div>
                <div className="text-xs text-gray-500">Total Enrollments</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{totalCompletions}</div>
                <div className="text-xs text-gray-500">Completions</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Programs List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
        </div>
      ) : programs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AcademicCapIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No programs created yet</p>
            <button
              onClick={startNew}
              className="mt-2 text-sm text-brand-purple hover:underline"
            >
              Create your first program
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {programs
            .sort((a, b) => a.sequence - b.sequence)
            .map((program) => (
              <div
                key={program.id}
                onClick={() => router.push(`/admin/learning/programs/${program.id}`)}
                className="cursor-pointer"
              >
                <Card className="hover:shadow-xl transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex-shrink-0 w-12 h-12 bg-brand-navy/10 rounded-lg flex items-center justify-center">
                          <AcademicCapIcon className="h-6 w-6 text-brand-navy" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900">
                              {program.name}
                            </h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                programTypeLabels[program.programType]?.color ||
                                "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {programTypeLabels[program.programType]?.label || program.programType}
                            </span>
                            {program.isDefault && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                Default
                              </span>
                            )}
                            {!program.isActive && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {program.description}
                          </p>
                          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <UserGroupIcon className="h-4 w-4" />
                              <span>{program.enrollmentCount} enrolled</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircleIcon className="h-4 w-4" />
                              <span>{program.completedCount} completed</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <ArrowsUpDownIcon className="h-4 w-4" />
                              <span>Order: {program.sequence}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions — only toggle */}
                      <div className="flex items-center gap-2 sm:flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleActive(program);
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            program.isActive
                              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          }`}
                        >
                          {program.isActive ? (
                            <>
                              <PauseCircleIcon className="h-4 w-4" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="h-4 w-4" />
                              Activate
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
        </div>
      )}

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

      {/* New Program Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-brand-navy">New Program</h2>
              <button
                onClick={() => setShowEditor(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Program Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                  placeholder="e.g., 90-Day Launch Journey"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                  placeholder="Describe the program..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Program Type
                </label>
                <select
                  value={form.programType}
                  onChange={(e) =>
                    setForm({ ...form, programType: e.target.value as Program["programType"] })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                >
                  <option value="ONBOARDING">Onboarding</option>
                  <option value="CONTINUING_EDUCATION">Continuing Education</option>
                  <option value="CERTIFICATION">Certification</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={form.sequence}
                  onChange={(e) =>
                    setForm({ ...form, sequence: parseInt(e.target.value) || 0 })
                  }
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Lower numbers display first</p>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-brand-navy focus:ring-brand-purple"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-brand-navy focus:ring-brand-purple"
                  />
                  <span className="text-sm text-gray-700">Auto-enroll new franchisees</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveProgram}
                disabled={saving || !form.name || !form.description}
                className="px-4 py-2 bg-brand-navy text-white rounded-lg text-sm font-medium hover:bg-brand-purple transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Creating..." : "Create Program"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
