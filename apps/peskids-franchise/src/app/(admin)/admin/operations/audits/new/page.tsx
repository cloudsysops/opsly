"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { Card, CardHeader, CardContent } from "@/components/shared/Card";
import {
  ArrowLeftIcon,
  ClipboardDocumentCheckIcon,
  CalendarDaysIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";

interface AuditTemplate {
  id: string;
  name: string;
  category: string;
  description: string | null;
  itemCount: number;
}

interface Franchisee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function ScheduleAuditPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [templates, setTemplates] = useState<AuditTemplate[]>([]);
  const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    templateId: "",
    franchiseeId: "",
    auditorName: "",
    auditorEmail: "",
    scheduledDate: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (session?.user) {
      setForm((prev) => ({
        ...prev,
        auditorName: prev.auditorName || session.user?.name || "",
        auditorEmail: prev.auditorEmail || session.user?.email || "",
      }));
    }
  }, [session]);

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
      console.error("Error fetching data:", err);
      setError("Failed to load form data");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(startNow: boolean) {
    if (!form.templateId || !form.franchiseeId || !form.auditorName || !form.scheduledDate) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/operations/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          startNow,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to create audit");
        return;
      }

      router.push(`/admin/operations/audits/${json.audit.id}`);
    } catch (err) {
      console.error("Error creating audit:", err);
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <WideContainer className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </WideContainer>
    );
  }

  return (
    <WideContainer className="space-y-6 max-w-3xl">
      {/* Back Link */}
      <Link
        href="/admin/operations/audits"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Audits
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy flex items-center gap-2">
          <ClipboardDocumentCheckIcon className="h-7 w-7 text-indigo-600" />
          Schedule Audit
        </h1>
        <p className="mt-1 text-gray-600">
          Schedule a new field audit for a franchisee
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">Audit Details</h2>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Audit Template <span className="text-red-500">*</span>
            </label>
            <select
              value={form.templateId}
              onChange={(e) => setForm({ ...form, templateId: e.target.value })}
              className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select a template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category.replace(/_/g, " ")})
                </option>
              ))}
            </select>
            {form.templateId && (
              <p className="text-xs text-gray-500 mt-1">
                {templates.find((t) => t.id === form.templateId)?.description || ""}
              </p>
            )}
          </div>

          {/* Franchisee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Franchisee <span className="text-red-500">*</span>
            </label>
            <select
              value={form.franchiseeId}
              onChange={(e) => setForm({ ...form, franchiseeId: e.target.value })}
              className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select a franchisee...</option>
              {franchisees.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.firstName} {f.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Auditor Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Auditor Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.auditorName}
              onChange={(e) => setForm({ ...form, auditorName: e.target.value })}
              className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter auditor name"
            />
          </div>

          {/* Auditor Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Auditor Email
            </label>
            <input
              type="email"
              value={form.auditorEmail}
              onChange={(e) => setForm({ ...form, auditorEmail: e.target.value })}
              className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter auditor email"
            />
          </div>

          {/* Scheduled Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scheduled Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                className="w-full rounded-lg border-gray-300 text-sm pl-10 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Any additional notes or instructions for the audit..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CalendarDaysIcon className="h-4 w-4" />
              {submitting ? "Scheduling..." : "Schedule Audit"}
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlayIcon className="h-4 w-4" />
              {submitting ? "Starting..." : "Start Audit Now"}
            </button>
          </div>
        </CardContent>
      </Card>
    </WideContainer>
  );
}
