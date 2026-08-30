"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Labels & constants
// ---------------------------------------------------------------------------

const TRIGGER_LABELS: Record<string, string> = {
  NEW_INQUIRY: "New Inquiry",
  STAGE_CHANGE: "Stage Change",
  TIME_DELAY: "Time Delay",
  INACTIVITY: "Inactivity",
  FORM_SUBMITTED: "Form Submitted",
  PREWORK_COMPLETED: "Pre-work Completed",
  MANUAL: "Manual Trigger",
};

const ACTION_LABELS: Record<string, string> = {
  SEND_EMAIL: "Send Email",
  CREATE_TASK: "Create Task",
  CHANGE_STAGE: "Change Stage",
  NOTIFY_ADMIN: "Notify Admin",
  ADD_NOTE: "Add Note",
};

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "connection", label: "Connection" },
  { value: "conversion", label: "Conversion" },
  { value: "retention", label: "Retention" },
  { value: "custom", label: "Custom" },
];

const CATEGORY_COLORS: Record<string, string> = {
  connection: "bg-blue-100 text-blue-700",
  conversion: "bg-green-100 text-green-700",
  retention: "bg-amber-100 text-amber-700",
  custom: "bg-purple-100 text-purple-700",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkflowAction {
  id: string;
  actionType: string;
  actionConfig: Record<string, unknown>;
  delayMinutes: number;
  order: number;
  nodeId: string | null;
}

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  isActive: boolean;
  category: string | null;
  isTemplate: boolean;
  actions: WorkflowAction[];
  conditions: unknown[];
  _count: { actions: number };
  stats: { totalExecutions: number; failedExecutions: number; period: string };
  createdAt: string;
  updatedAt: string;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  category: string | null;
  actions: WorkflowAction[];
  conditions: unknown[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WorkflowsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"workflows" | "templates">(
    "workflows"
  );
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cloningId, setCloningId] = useState<string | null>(null);

  // ---- Fetch workflows ----
  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/workflows");
      const data = await res.json();
      if (data.workflows) {
        setWorkflows(data.workflows);
      }
    } catch (err) {
      console.error("Failed to fetch workflows:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---- Fetch templates ----
  const fetchTemplates = useCallback(async () => {
    try {
      setTemplatesLoading(true);
      const res = await fetch("/api/admin/workflows/templates");
      const data = await res.json();
      if (data.templates) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  useEffect(() => {
    if (activeTab === "templates" && templates.length === 0) {
      fetchTemplates();
    }
  }, [activeTab, templates.length, fetchTemplates]);

  // ---- Toggle workflow active status ----
  async function handleToggle(workflowId: string) {
    try {
      const res = await fetch(`/api/admin/workflows/${workflowId}/toggle`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.workflow) {
        setWorkflows((prev) =>
          prev.map((w) =>
            w.id === workflowId ? { ...w, isActive: data.workflow.isActive } : w
          )
        );
      }
    } catch (err) {
      console.error("Failed to toggle workflow:", err);
    }
  }

  // ---- Clone template ----
  async function handleUseTemplate(templateId: string) {
    try {
      setCloningId(templateId);
      const res = await fetch(`/api/admin/workflows/${templateId}/clone`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.workflow?.id) {
        router.push(`/admin/workflows/${data.workflow.id}/builder`);
      }
    } catch (err) {
      console.error("Failed to clone template:", err);
    } finally {
      setCloningId(null);
    }
  }

  // ---- Derived data ----
  const activeCount = workflows.filter((w) => w.isActive).length;
  const totalActions = workflows.reduce(
    (sum, w) => sum + w.actions.length,
    0
  );

  const filteredWorkflows =
    categoryFilter === "all"
      ? workflows
      : workflows.filter((w) => w.category === categoryFilter);

  const filteredTemplates =
    categoryFilter === "all"
      ? templates
      : templates.filter((t) => t.category === categoryFilter);

  // ---- Render ----
  return (
    <WideContainer className="py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">
            Workflow Automation
          </h1>
          <p className="text-gray-600 mt-1">
            Automate prospect follow-ups and notifications
          </p>
        </div>
        <Link
          href="/admin/workflows/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-purple transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create Workflow
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-3xl font-bold text-brand-navy">
            {loading ? "-" : workflows.length}
          </div>
          <div className="text-sm text-gray-500">Total Workflows</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-3xl font-bold text-green-600">
            {loading ? "-" : activeCount}
          </div>
          <div className="text-sm text-gray-500">Active Workflows</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-3xl font-bold text-brand-purple">
            {loading ? "-" : totalActions}
          </div>
          <div className="text-sm text-gray-500">Total Actions</div>
        </div>
      </div>

      {/* Tabs + Filter */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("workflows")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "workflows"
                ? "border-b-2 border-brand-navy text-brand-navy"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            My Workflows
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "templates"
                ? "border-b-2 border-brand-navy text-brand-navy"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Templates
          </button>
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-sm border rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-cyan"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* My Workflows Tab */}
      {activeTab === "workflows" && (
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-brand-navy">All Workflows</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="p-8 text-center">
              <svg
                className="w-12 h-12 mx-auto text-gray-300 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
              <p className="text-gray-500 mb-4">
                {categoryFilter !== "all"
                  ? "No workflows in this category"
                  : "No workflows yet"}
              </p>
              <Link
                href="/admin/workflows/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-purple transition-colors text-sm"
              >
                Create your first workflow
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {filteredWorkflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <Link
                          href={`/admin/workflows/${workflow.id}/builder`}
                          className="font-medium text-gray-900 hover:text-brand-cyan"
                        >
                          {workflow.name}
                        </Link>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            workflow.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {workflow.isActive ? "Active" : "Inactive"}
                        </span>
                        {workflow.category && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                              CATEGORY_COLORS[workflow.category] ||
                              "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {workflow.category}
                          </span>
                        )}
                      </div>

                      {workflow.description && (
                        <p className="text-sm text-gray-500 mb-2 line-clamp-1">
                          {workflow.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                          {TRIGGER_LABELS[workflow.triggerType] ||
                            workflow.triggerType}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 6h16M4 12h16M4 18h7"
                            />
                          </svg>
                          {workflow.actions.length} action
                          {workflow.actions.length !== 1 ? "s" : ""}
                        </span>
                        {workflow.stats.totalExecutions > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                              />
                            </svg>
                            {workflow.stats.totalExecutions} executions (30d)
                          </span>
                        )}
                        <span className="text-gray-400">
                          Updated{" "}
                          {formatDistanceToNow(new Date(workflow.updatedAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleToggle(workflow.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          workflow.isActive ? "bg-green-500" : "bg-gray-300"
                        }`}
                        title={
                          workflow.isActive
                            ? "Deactivate workflow"
                            : "Activate workflow"
                        }
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            workflow.isActive
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                      <Link
                        href={`/admin/workflows/${workflow.id}/builder`}
                        className="p-2 text-gray-400 hover:text-brand-cyan rounded-lg hover:bg-gray-100 transition-colors"
                        title="Edit workflow"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </Link>
                    </div>
                  </div>

                  {/* Action chips */}
                  {workflow.actions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {workflow.actions.map((action, index) => (
                        <div
                          key={action.id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
                        >
                          {index > 0 && action.delayMinutes > 0 && (
                            <span className="text-gray-400 mr-1">
                              +
                              {action.delayMinutes >= 60
                                ? `${Math.round(action.delayMinutes / 60)}h`
                                : `${action.delayMinutes}m`}
                            </span>
                          )}
                          {ACTION_LABELS[action.actionType] ||
                            action.actionType}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div>
          {templatesLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="bg-white rounded-lg border p-8 text-center">
              <svg
                className="w-12 h-12 mx-auto text-gray-300 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <p className="text-gray-500">
                {categoryFilter !== "all"
                  ? "No templates in this category"
                  : "No templates available yet"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white rounded-lg border p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">
                      {template.name}
                    </h3>
                    {template.category && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                          CATEGORY_COLORS[template.category] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {template.category}
                      </span>
                    )}
                  </div>

                  {template.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                    <span className="inline-flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      {TRIGGER_LABELS[template.triggerType] ||
                        template.triggerType}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 6h16M4 12h16M4 18h7"
                        />
                      </svg>
                      {template.actions.length} action
                      {template.actions.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <button
                    onClick={() => handleUseTemplate(template.id)}
                    disabled={cloningId === template.id}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-purple transition-colors text-sm disabled:opacity-50"
                  >
                    {cloningId === template.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        Use Template
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </WideContainer>
  );
}
