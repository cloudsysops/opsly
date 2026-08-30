"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { Card, CardHeader, CardContent } from "@/components/shared/Card";
import {
  ArrowLeftIcon,
  TicketIcon,
  ExclamationCircleIcon,
  LightBulbIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";

const CATEGORY_OPTIONS = [
  { value: "TECHNICAL", label: "Technical", icon: "🔧", description: "System issues, bugs, login problems" },
  { value: "BILLING", label: "Billing", icon: "💳", description: "Invoices, payments, royalty questions" },
  { value: "OPERATIONS", label: "Operations", icon: "⚙️", description: "Scheduling, tutors, classes" },
  { value: "MARKETING", label: "Marketing", icon: "📢", description: "Marketing materials, campaigns" },
  { value: "TRAINING", label: "Training", icon: "📚", description: "Academy, certifications, learning" },
  { value: "COMPLIANCE", label: "Compliance", icon: "✅", description: "Audits, certifications, policies" },
  { value: "OTHER", label: "Other", icon: "📋", description: "General questions and requests" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low", description: "General questions, not time-sensitive" },
  { value: "MEDIUM", label: "Medium", description: "Normal business issues" },
  { value: "HIGH", label: "High", description: "Urgent issues affecting operations" },
  { value: "URGENT", label: "Urgent", description: "Critical - business stopped" },
];

export default function NewTicketPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!subject.trim()) {
      setError("Subject is required.");
      return;
    }
    if (!category) {
      setError("Please select a category.");
      return;
    }
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/franchisee/operations/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          priority,
          description: description.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create ticket");
      }

      const data = await res.json();
      router.push(`/portal/support/${data.ticket.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WideContainer className="space-y-6">
      {/* Back link */}
      <Link
        href="/portal/support"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-purple transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Help Desk
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy flex items-center gap-3">
          <TicketIcon className="h-8 w-8 text-indigo-600" />
          New Support Ticket
        </h1>
        <p className="mt-1 text-gray-600">
          Describe your issue and we&apos;ll get back to you as soon as possible.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Subject */}
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary of your issue..."
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-brand-purple"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Keep it short and descriptive</p>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {CATEGORY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setCategory(opt.value)}
                        className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all text-center ${
                          category === opt.value
                            ? "border-brand-purple bg-brand-purple/5"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-xl mb-1">{opt.icon}</span>
                        <span className={`text-sm font-medium ${category === opt.value ? "text-brand-purple" : "text-gray-700"}`}>
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </div>
                  {category && (
                    <p className="mt-2 text-xs text-gray-500">
                      {CATEGORY_OPTIONS.find((c) => c.value === category)?.description}
                    </p>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRIORITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPriority(opt.value)}
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                          priority === opt.value
                            ? opt.value === "URGENT"
                              ? "border-red-500 bg-red-50 text-red-700"
                              : opt.value === "HIGH"
                              ? "border-orange-500 bg-orange-50 text-orange-700"
                              : opt.value === "MEDIUM"
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-500 bg-gray-50 text-gray-700"
                            : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-sm font-medium">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {PRIORITY_OPTIONS.find((p) => p.value === priority)?.description}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please describe your issue in detail. Include any relevant steps, error messages, or context that could help us resolve this faster..."
                    rows={8}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-brand-purple resize-none"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    The more detail you provide, the faster we can help you.
                  </p>
                </div>

                {/* Submit */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-brand-purple text-white font-medium rounded-lg hover:bg-brand-purple/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                    {submitting ? "Submitting..." : "Submit Ticket"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tips */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <LightBulbIcon className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-700">Tips for Fast Resolution</h3>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-2">
                  <span className="text-brand-purple font-bold">1.</span>
                  <span>Be specific about what&apos;s happening vs. what you expected</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-purple font-bold">2.</span>
                  <span>Include any error messages you&apos;re seeing</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-purple font-bold">3.</span>
                  <span>List the steps that led to the issue</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-purple font-bold">4.</span>
                  <span>Mention when the problem started</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Response Time */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-5">
              <h3 className="font-semibold text-blue-800 text-sm mb-2">Expected Response Times</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center justify-between">
                  <span className="text-blue-700">Urgent</span>
                  <span className="font-medium text-blue-800">4 hours</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-blue-700">High</span>
                  <span className="font-medium text-blue-800">8 hours</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-blue-700">Medium</span>
                  <span className="font-medium text-blue-800">24 hours</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-blue-700">Low</span>
                  <span className="font-medium text-blue-800">48 hours</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card className="bg-gray-50">
            <CardContent className="py-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-2">Need Immediate Help?</h3>
              <p className="text-xs text-gray-600">
                For critical issues affecting your business, email us directly at{" "}
                <a href="mailto:franchising@acmefranchise.com" className="text-brand-purple hover:underline">
                  franchising@acmefranchise.com
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </WideContainer>
  );
}
