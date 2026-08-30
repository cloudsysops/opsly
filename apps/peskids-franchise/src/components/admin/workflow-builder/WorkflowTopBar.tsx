"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ClockIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import type { WorkflowMeta } from "./useWorkflowBuilder";

// ============================================
// TYPES
// ============================================

interface WorkflowTopBarProps {
  workflowMeta: WorkflowMeta;
  onMetaChange: (updates: Partial<WorkflowMeta>) => void;
  onSave: () => void;
  onToggle: () => void;
  isDirty: boolean;
  isSaving: boolean;
  isActive: boolean;
  workflowId: string | null;
}

// ============================================
// CATEGORY CONFIG
// ============================================

const CATEGORIES = [
  { value: "connection", label: "Connection", color: "bg-blue-100 text-blue-700" },
  { value: "conversion", label: "Conversion", color: "bg-green-100 text-green-700" },
  { value: "retention", label: "Retention", color: "bg-purple-100 text-purple-700" },
  { value: "custom", label: "Custom", color: "bg-gray-100 text-gray-700" },
];

function getCategoryStyle(category: string): string {
  const match = CATEGORIES.find((c) => c.value === category);
  return match ? match.color : "bg-gray-100 text-gray-600";
}

function getCategoryLabel(category: string): string {
  const match = CATEGORIES.find((c) => c.value === category);
  return match ? match.label : category || "No Category";
}

// ============================================
// COMPONENT
// ============================================

export default function WorkflowTopBar({
  workflowMeta,
  onMetaChange,
  onSave,
  onToggle,
  isDirty,
  isSaving,
  isActive,
  workflowId,
}: WorkflowTopBarProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(workflowMeta.name);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  // Sync name value when meta changes externally
  useEffect(() => {
    if (!isEditingName) {
      setNameValue(workflowMeta.name);
    }
  }, [workflowMeta.name, isEditingName]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Close category dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(e.target as HTMLElement)) {
        setShowCategoryDropdown(false);
      }
    }
    if (showCategoryDropdown) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showCategoryDropdown]);

  function commitName() {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== workflowMeta.name) {
      onMetaChange({ name: trimmed });
    } else {
      setNameValue(workflowMeta.name);
    }
    setIsEditingName(false);
  }

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      {/* Left side */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Back link */}
        <Link
          href="/admin/workflows"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-navy transition-colors flex-shrink-0"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Workflows</span>
        </Link>

        <div className="h-5 w-px bg-gray-300 flex-shrink-0" />

        {/* Editable name */}
        <div className="min-w-0">
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") {
                  setNameValue(workflowMeta.name);
                  setIsEditingName(false);
                }
              }}
              className="text-lg font-semibold text-brand-navy bg-transparent border-b-2 border-brand-purple outline-none px-0 py-0 w-full max-w-[300px]"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="text-lg font-semibold text-brand-navy hover:text-brand-purple transition-colors truncate max-w-[300px] text-left"
              title="Click to edit name"
            >
              {workflowMeta.name || "Untitled Workflow"}
            </button>
          )}
        </div>

        {/* Category badge */}
        <div ref={categoryRef} className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium transition-colors ${getCategoryStyle(workflowMeta.category)}`}
          >
            {getCategoryLabel(workflowMeta.category)}
          </button>

          {showCategoryDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[140px]">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => {
                    onMetaChange({ category: cat.value });
                    setShowCategoryDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors ${
                    workflowMeta.category === cat.value
                      ? "font-medium text-brand-navy"
                      : "text-gray-700"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dirty indicator */}
        {isDirty && (
          <span className="text-xs text-amber-600 font-medium flex-shrink-0">
            Unsaved changes
          </span>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Active/Inactive toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {isActive ? "Active" : "Inactive"}
          </span>
          <button
            type="button"
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isActive ? "bg-green-500" : "bg-gray-300"
            }`}
            title={isActive ? "Deactivate workflow" : "Activate workflow"}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isActive ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Test Run button (disabled / coming soon) */}
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-400 cursor-not-allowed"
          title="Coming soon"
        >
          <PlayIcon className="w-4 h-4" />
          Test Run
        </button>

        {/* Save button */}
        <button
          type="button"
          onClick={onSave}
          disabled={!isDirty || isSaving}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            !isDirty || isSaving
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-brand-navy text-white hover:bg-brand-purple"
          }`}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>

        {/* History link */}
        {workflowId && (
          <Link
            href={`/admin/workflows/${workflowId}/history`}
            className="p-2 text-gray-400 hover:text-brand-navy rounded-lg hover:bg-gray-100 transition-colors"
            title="Execution history"
          >
            <ClockIcon className="w-5 h-5" />
          </Link>
        )}
      </div>
    </div>
  );
}
