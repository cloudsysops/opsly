"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Bars3Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  EnvelopeIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { BlockEditor, BlockTypePicker } from "./BlockEditor";
import ModuleResourceLinker from "./ModuleResourceLinker";
import { TipTapEditor } from "@/components/shared/TipTapEditor";
import type { ModuleData, ContentBlockData, BlockType } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Known FranchiseeAccount fields that data collection can map to
const PROFILE_FIELD_OPTIONS = [
  { value: "", label: "Custom (saves to profile data)" },
  { value: "ein", label: "EIN" },
  { value: "llcName", label: "LLC / Entity Name" },
  { value: "stateOfIncorporation", label: "State of Incorporation" },
  { value: "insuranceCarrier", label: "Insurance Carrier" },
  { value: "insurancePolicyNumber", label: "Insurance Policy Number" },
  { value: "insuranceExpiry", label: "Insurance Expiry Date" },
  { value: "insuranceEffectiveDate", label: "Insurance Effective Date" },
  { value: "insuranceCoverageType", label: "Insurance Coverage Type" },
  { value: "insuranceCOIUrl", label: "Insurance COI (file upload)" },
];

interface DataFieldRow {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  saveToProfile?: boolean;
  profileField?: string;
}

interface SectionEntry {
  id: string;
  type: "step-guide" | "data-collection" | "block";
}

interface ModuleEditorProps {
  module: ModuleData | null;
  phaseId: string;
  programType: string;
  onSave: () => void;
  onDelete?: () => void;
  saving: boolean;
  setSaving: (saving: boolean) => void;
}

// ---------------------------------------------------------------------------
// SortableSectionCard — drag-and-drop wrapper for Step Guide / Data Collection
// ---------------------------------------------------------------------------

function SortableSectionCard({
  id,
  label,
  badgeColor,
  badge,
  defaultOpen,
  children,
}: {
  id: string;
  label: string;
  badgeColor: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultOpen ?? false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg bg-white shadow-sm">
      <div className="flex items-center gap-2 p-2.5 border-b bg-gray-50/80">
        <button
          {...attributes}
          {...listeners}
          className="p-1 hover:bg-gray-200 rounded cursor-grab active:cursor-grabbing touch-none"
          title="Drag to reorder"
        >
          <Bars3Icon className="w-3.5 h-3.5 text-gray-400" />
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 hover:bg-gray-200 rounded"
        >
          {expanded ? (
            <ChevronDownIcon className="w-3.5 h-3.5 text-gray-500" />
          ) : (
            <ChevronRightIcon className="w-3.5 h-3.5 text-gray-500" />
          )}
        </button>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${badgeColor}`}>
          {label}
        </span>
        <div className="flex-1" />
        {badge}
      </div>
      {expanded && <div className="p-4">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ModuleEditor
// ---------------------------------------------------------------------------

export function ModuleEditor({
  module,
  phaseId,
  programType,
  onSave,
  onDelete,
  saving,
  setSaving,
}: ModuleEditorProps) {
  const isOnboarding = programType === "ONBOARDING";

  const [form, setForm] = useState({
    title: "",
    description: "",
    moduleType: "READING",
    points: 10,
    duration: 15,
    resourceUrl: "",
    stepWhat: "",
    stepHow: "",
    stepWhy: "",
    resourcePageId: "",
    owner: "" as string,
    verificationType: "" as string,
    targetDay: null as number | null,
    isMilestone: false,
    notifyFranchisor: false,
    franchisorActionText: "" as string,
    completionEmailTemplateId: "" as string,
  });

  // Email templates for completion email dropdown
  const [emailTemplates, setEmailTemplates] = useState<
    Array<{ id: string; name: string; slug: string; subject: string }>
  >([]);

  useEffect(() => {
    if (isOnboarding) {
      fetch("/api/admin/email-templates?active=true")
        .then((res) => (res.ok ? res.json() : { templates: [] }))
        .then((data) => setEmailTemplates(data.templates || []))
        .catch(() => {});
    }
  }, [isOnboarding]);

  const [blocks, setBlocks] = useState<ContentBlockData[]>([]);
  const [dataFields, setDataFields] = useState<DataFieldRow[]>([]);
  const [sections, setSections] = useState<SectionEntry[]>([]);
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  // Build section entries from module data
  useEffect(() => {
    if (module) {
      setForm({
        title: module.title,
        description: module.description || "",
        moduleType: module.moduleType,
        points: module.points || 10,
        duration: module.duration || 15,
        resourceUrl: module.resourceUrl || "",
        stepWhat: module.stepWhat || "",
        stepHow: module.stepHow || "",
        stepWhy: module.stepWhy || "",
        resourcePageId: module.resourcePageId || "",
        owner: module.owner || "",
        verificationType: module.verificationType || "",
        targetDay: module.targetDay,
        isMilestone: module.isMilestone,
        notifyFranchisor: module.notifyFranchisor,
        franchisorActionText: module.franchisorActionText || "",
        completionEmailTemplateId: module.completionEmailTemplateId || "",
      });
      const moduleBlocks = module.contentBlocks || [];
      setBlocks(moduleBlocks);
      setDataFields(module.dataFields || []);

      // Build sections from stored order or default
      const blockIds = moduleBlocks.map((b) => b.id);
      const stored = module.sectionOrder;

      if (stored && Array.isArray(stored) && stored.length > 0) {
        const entries: SectionEntry[] = [];
        const blockIdSet = new Set(blockIds);
        const seen = new Set<string>();

        for (const id of stored as string[]) {
          if (id === "step-guide" || id === "data-collection") {
            entries.push({ id, type: id });
          } else if (blockIdSet.has(id)) {
            entries.push({ id, type: "block" });
          }
          seen.add(id);
        }
        // Add missing blocks
        for (const id of blockIds) {
          if (!seen.has(id)) entries.push({ id, type: "block" });
        }
        // Ensure special sections exist for onboarding
        if (isOnboarding) {
          if (!seen.has("step-guide")) entries.unshift({ id: "step-guide", type: "step-guide" });
          if (!seen.has("data-collection")) entries.push({ id: "data-collection", type: "data-collection" });
        }
        setSections(entries);
      } else {
        // Default order
        if (isOnboarding) {
          setSections([
            { id: "step-guide", type: "step-guide" },
            ...blockIds.map((id) => ({ id, type: "block" as const })),
            { id: "data-collection", type: "data-collection" },
          ]);
        } else {
          setSections(blockIds.map((id) => ({ id, type: "block" as const })));
        }
      }

      setHasUnsavedChanges(false);
    } else {
      // New module
      setForm({
        title: "",
        description: "",
        moduleType: "READING",
        points: 10,
        duration: 15,
        resourceUrl: "",
        stepWhat: "",
        stepHow: "",
        stepWhy: "",
        resourcePageId: "",
        owner: "",
        verificationType: "",
        targetDay: null,
        isMilestone: false,
        notifyFranchisor: false,
        franchisorActionText: "",
        completionEmailTemplateId: "",
      });
      setBlocks([]);
      setDataFields([]);
      setSections(
        isOnboarding
          ? [
              { id: "step-guide", type: "step-guide" },
              { id: "data-collection", type: "data-collection" },
            ]
          : []
      );
      setHasUnsavedChanges(false);
    }
  }, [module, isOnboarding]);

  const markDirty = () => setHasUnsavedChanges(true);

  // -- DnD -------------------------------------------------------------------

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSectionDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setSections((prev) => {
        const oldIdx = prev.findIndex((s) => s.id === active.id);
        const newIdx = prev.findIndex((s) => s.id === over.id);
        if (oldIdx === -1 || newIdx === -1) return prev;
        const next = [...prev];
        const [moved] = next.splice(oldIdx, 1);
        next.splice(newIdx, 0, moved);
        return next;
      });
      markDirty();
    },
    []
  );

  // -- Block management -------------------------------------------------------

  const addBlock = (type: BlockType) => {
    const newBlock: ContentBlockData = {
      id: `temp-${Date.now()}`,
      moduleId: module?.id || "",
      type,
      order: blocks.length,
    };
    setBlocks((prev) => [...prev, newBlock]);

    // Insert before data-collection if it exists, otherwise append
    setSections((prev) => {
      const dcIdx = prev.findIndex((s) => s.id === "data-collection");
      const entry: SectionEntry = { id: newBlock.id, type: "block" };
      if (dcIdx === -1) return [...prev, entry];
      const next = [...prev];
      next.splice(dcIdx, 0, entry);
      return next;
    });
    markDirty();
  };

  const updateBlock = (blockId: string, updated: ContentBlockData) => {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? updated : b)));
    markDirty();
  };

  const deleteBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setSections((prev) => prev.filter((s) => s.id !== blockId));
    markDirty();
  };

  // -- Save ------------------------------------------------------------------

  const handleSave = async () => {
    setSaving(true);
    try {
      const sectionOrder = sections.map((s) => s.id);

      const moduleUrl = module
        ? `/api/admin/bootcamp/modules/${module.id}`
        : "/api/admin/bootcamp/modules";
      const moduleMethod = module ? "PUT" : "POST";

      const moduleRes = await fetch(moduleUrl, {
        method: moduleMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseId,
          title: form.title,
          description: form.description || undefined,
          moduleType: form.moduleType,
          points: form.points,
          duration: form.duration,
          resourceUrl: form.resourceUrl || undefined,
          stepWhat: form.stepWhat || undefined,
          stepHow: form.stepHow || undefined,
          stepWhy: form.stepWhy || undefined,
          resourcePageId: form.resourcePageId || undefined,
          dataFields: dataFields.length > 0 ? dataFields : undefined,
          sectionOrder,
          owner: form.owner || null,
          verificationType: form.verificationType || null,
          targetDay: form.targetDay,
          isMilestone: form.isMilestone,
          notifyFranchisor: form.notifyFranchisor,
          franchisorActionText: form.franchisorActionText || null,
          completionEmailTemplateId: form.completionEmailTemplateId || null,
        }),
      });

      if (!moduleRes.ok) {
        const data = await moduleRes.json();
        console.error("Save module error:", data.error);
        return;
      }

      const { module: savedModule } = await moduleRes.json();
      const moduleId = savedModule.id;

      // Save content blocks
      if (module) {
        const existingIds = new Set((module.contentBlocks || []).map((b) => b.id));
        const currentIds = new Set(blocks.filter((b) => !b.id.startsWith("temp-")).map((b) => b.id));

        for (const block of module.contentBlocks || []) {
          if (!currentIds.has(block.id)) {
            await fetch(`/api/admin/bootcamp/blocks/${block.id}`, { method: "DELETE" });
          }
        }

        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i];
          if (block.id.startsWith("temp-")) {
            await fetch("/api/admin/bootcamp/blocks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...block, moduleId, order: i, id: undefined }),
            });
          } else if (existingIds.has(block.id)) {
            await fetch(`/api/admin/bootcamp/blocks/${block.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...block, order: i }),
            });
          }
        }
      } else {
        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i];
          await fetch("/api/admin/bootcamp/blocks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...block, moduleId, order: i, id: undefined }),
          });
        }
      }

      setHasUnsavedChanges(false);
      onSave();
    } catch (error) {
      console.error("Failed to save module:", error);
    } finally {
      setSaving(false);
    }
  };

  // -- Render ----------------------------------------------------------------

  const hasStepGuide = form.stepWhat || form.stepHow || form.stepWhy;

  return (
    <div className="min-w-0 max-w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-brand-navy">
          {module ? "Edit Module" : "New Module"}
        </h3>
        {hasUnsavedChanges && (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
            Unsaved changes
          </span>
        )}
      </div>

      <div className="space-y-5">
        {/* ── Module Details ─────────────────────────────────────────── */}
        <section>
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Module Details</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => { setForm({ ...form, title: e.target.value }); markDirty(); }}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                placeholder="Module title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <TipTapEditor
                content={form.description}
                onChange={(html) => { setForm((prev) => ({ ...prev, description: html })); markDirty(); }}
                placeholder="Brief description..."
                minHeight="80px"
                disableDefaultHeading
              />
            </div>
            {form.moduleType === "VIDEO" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
                <input
                  type="url"
                  value={form.resourceUrl}
                  onChange={(e) => { setForm({ ...form, resourceUrl: e.target.value }); markDirty(); }}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                  placeholder="YouTube or Vimeo URL..."
                />
              </div>
            )}
          </div>
        </section>

        {/* ── Unified Sortable Sections ──────────────────────────────── */}
        <section>
          <h4 className="text-sm font-semibold text-gray-800 mb-3">
            Module Content
            <span className="ml-2 text-xs font-normal text-gray-400">Drag to reorder sections</span>
          </h4>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSectionDragEnd}
          >
            <SortableContext
              items={sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {sections.map((section) => {
                  // -- Step Guide --
                  if (section.type === "step-guide") {
                    return (
                      <SortableSectionCard
                        key="step-guide"
                        id="step-guide"
                        label="Step Guide"
                        badgeColor="bg-brand-cyan/10 text-brand-cyan"
                        defaultOpen
                        badge={
                          hasStepGuide ? (
                            <span className="px-2 py-0.5 bg-brand-cyan/10 text-brand-cyan text-xs rounded">
                              Configured
                            </span>
                          ) : undefined
                        }
                      >
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">What Is This Step</label>
                            <TipTapEditor
                              content={form.stepWhat}
                              onChange={(html) => { setForm((prev) => ({ ...prev, stepWhat: html })); markDirty(); }}
                              placeholder="Explain what this step involves..."
                              minHeight="80px"
                              disableDefaultHeading
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Why This Matters</label>
                            <TipTapEditor
                              content={form.stepWhy}
                              onChange={(html) => { setForm((prev) => ({ ...prev, stepWhy: html })); markDirty(); }}
                              placeholder="Why this step matters..."
                              minHeight="80px"
                              disableDefaultHeading
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">How To Complete This</label>
                            <TipTapEditor
                              content={form.stepHow}
                              onChange={(html) => { setForm((prev) => ({ ...prev, stepHow: html })); markDirty(); }}
                              placeholder="Step-by-step instructions..."
                              minHeight="80px"
                              disableDefaultHeading
                            />
                          </div>
                        </div>
                      </SortableSectionCard>
                    );
                  }

                  // -- Data Collection --
                  if (section.type === "data-collection") {
                    return (
                      <SortableSectionCard
                        key="data-collection"
                        id="data-collection"
                        label="Data Collection"
                        badgeColor="bg-amber-100 text-amber-700"
                        defaultOpen={dataFields.length > 0}
                        badge={
                          dataFields.length > 0 ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                              {dataFields.length} field{dataFields.length !== 1 ? "s" : ""}
                            </span>
                          ) : undefined
                        }
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">
                              Add questions or fields the franchisee must fill in to complete this step.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                const newField: DataFieldRow = { key: "", label: "", type: "text", required: false, saveToProfile: true };
                                setDataFields([...dataFields, newField]);
                                markDirty();
                              }}
                              className="text-xs text-brand-purple hover:text-brand-navy font-medium flex items-center gap-1"
                            >
                              <PlusIcon className="h-3.5 w-3.5" /> Add Field
                            </button>
                          </div>
                          {dataFields.length === 0 && (
                            <p className="text-xs text-gray-400 italic">No fields yet — click &quot;Add Field&quot; to ask franchisees for information.</p>
                          )}
                          <div className="space-y-3">
                            {dataFields.map((field, idx) => (
                              <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                                      Field Name <span className="text-gray-400">(what the franchisee sees)</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={field.label}
                                      onChange={(e) => {
                                        const updated = [...dataFields];
                                        const label = e.target.value;
                                        // Auto-generate key from label
                                        const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
                                        updated[idx] = { ...field, label, key: key || field.key };
                                        setDataFields(updated);
                                        markDirty();
                                      }}
                                      className="w-full px-2.5 py-1.5 border rounded-lg text-sm"
                                      placeholder='e.g. "EIN" or "Business Entity Type"'
                                    />
                                  </div>
                                  <div className="w-36">
                                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                                      Answer Type
                                    </label>
                                    <select
                                      value={field.type}
                                      onChange={(e) => {
                                        const updated = [...dataFields];
                                        updated[idx] = { ...field, type: e.target.value };
                                        setDataFields(updated);
                                        markDirty();
                                      }}
                                      className="w-full px-2.5 py-1.5 border rounded-lg text-sm bg-white"
                                    >
                                      <option value="text">Short Text</option>
                                      <option value="number">Number</option>
                                      <option value="date">Date</option>
                                      <option value="email">Email</option>
                                      <option value="tel">Phone</option>
                                      <option value="select">Dropdown List</option>
                                      <option value="file">File Upload</option>
                                    </select>
                                  </div>
                                  <div className="flex items-end gap-2 pb-0.5">
                                    <label className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={field.required}
                                        onChange={(e) => {
                                          const updated = [...dataFields];
                                          updated[idx] = { ...field, required: e.target.checked };
                                          setDataFields(updated);
                                          markDirty();
                                        }}
                                        className="rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
                                      />
                                      Required
                                    </label>
                                    <button
                                      onClick={() => {
                                        setDataFields(dataFields.filter((_, i) => i !== idx));
                                        markDirty();
                                      }}
                                      className="p-1 text-red-400 hover:text-red-600"
                                      title="Remove field"
                                    >
                                      <TrashIcon className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                                {/* File upload hint */}
                                {field.type === "file" && (
                                  <p className="text-[10px] text-gray-400 mt-1">
                                    Accepts PDF, DOC, DOCX, images — up to 25 MB
                                  </p>
                                )}
                                {/* Dropdown options editor */}
                                {field.type === "select" && (
                                  <div className="mt-1">
                                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                                      Options <span className="text-gray-400">(one per line)</span>
                                    </label>
                                    <textarea
                                      value={(field.options || []).join("\n")}
                                      onChange={(e) => {
                                        const updated = [...dataFields];
                                        const options = e.target.value.split("\n").map((o) => o.trimStart());
                                        updated[idx] = { ...field, options };
                                        setDataFields(updated);
                                        markDirty();
                                      }}
                                      rows={4}
                                      className="w-full px-2.5 py-1.5 border rounded-lg text-sm font-mono"
                                      placeholder={"LLC\nS-Corp\nC-Corp\nPartnership\nSole Proprietorship"}
                                    />
                                  </div>
                                )}
                                {/* Save to Profile */}
                                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100">
                                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={field.saveToProfile !== false}
                                      onChange={(e) => {
                                        const updated = [...dataFields];
                                        updated[idx] = { ...field, saveToProfile: e.target.checked, profileField: e.target.checked ? field.profileField : "" };
                                        setDataFields(updated);
                                        markDirty();
                                      }}
                                      className="rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
                                    />
                                    Save to franchisee profile
                                  </label>
                                  {field.saveToProfile !== false && (
                                    <div className="flex items-center gap-1.5">
                                      <label className="text-[10px] font-medium text-gray-500 whitespace-nowrap">Map to:</label>
                                      <select
                                        value={field.profileField || ""}
                                        onChange={(e) => {
                                          const updated = [...dataFields];
                                          updated[idx] = { ...field, profileField: e.target.value };
                                          setDataFields(updated);
                                          markDirty();
                                        }}
                                        className="px-2 py-1 border rounded text-xs bg-white"
                                      >
                                        {PROFILE_FIELD_OPTIONS.map((opt) => (
                                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </SortableSectionCard>
                    );
                  }

                  // -- Content Block --
                  const block = blocks.find((b) => b.id === section.id);
                  if (!block) return null;
                  return (
                    <BlockEditor
                      key={block.id}
                      block={block}
                      onChange={(updated) => updateBlock(block.id, updated)}
                      onDelete={() => deleteBlock(block.id)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add Content Block */}
          {showBlockPicker ? (
            <div className="mt-3">
              <BlockTypePicker
                onSelect={addBlock}
                onClose={() => setShowBlockPicker(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowBlockPicker(true)}
              className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 hover:border-brand-cyan rounded-lg transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Add Content Block
            </button>
          )}
        </section>

        {/* ── Resources & Links ─────────────────────────────────────── */}
        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-800">Resources & Links</h4>

          {/* Resource Guide — Operations Manual link */}
          <div className="bg-amber-50/50 rounded-lg border border-amber-200/60 p-3">
            <label className="block text-xs font-semibold text-amber-800 mb-1.5">
              Resource Guide (Operations Manual)
            </label>
            <input
              type="text"
              value={form.resourcePageId}
              onChange={(e) => { setForm({ ...form, resourcePageId: e.target.value }); markDirty(); }}
              className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-purple focus:border-transparent"
              placeholder="Paste manual page URL or ID (with optional #heading)..."
            />
            <p className="text-[11px] text-amber-600/80 mt-1">
              Shows as &ldquo;View Resource Guide&rdquo; button on the franchisee page. Add #heading-id to deep-link.
            </p>
          </div>

          {/* Additional Resources — files, URLs, wiki articles, etc. */}
          {module && <ModuleResourceLinker moduleId={module.id} />}
        </section>

        {/* ── Onboarding Settings (collapsible) ──────────────────────── */}
        {isOnboarding && (
          <section className="border rounded-lg overflow-hidden">
            <button
              onClick={() => setSettingsExpanded(!settingsExpanded)}
              className="w-full flex items-center gap-2 p-3 bg-gray-50/80 hover:bg-gray-100 transition-colors text-left"
            >
              {settingsExpanded ? (
                <ChevronDownIcon className="w-3.5 h-3.5 text-gray-500" />
              ) : (
                <ChevronRightIcon className="w-3.5 h-3.5 text-gray-500" />
              )}
              <span className="text-sm font-semibold text-gray-800">Onboarding Settings</span>
              {(form.owner || form.verificationType || form.targetDay || form.isMilestone) && (
                <span className="px-2 py-0.5 bg-brand-purple/10 text-brand-purple text-xs rounded ml-auto">
                  Configured
                </span>
              )}
            </button>
            {settingsExpanded && (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Owner</label>
                    <select
                      value={form.owner}
                      onChange={(e) => { setForm({ ...form, owner: e.target.value }); markDirty(); }}
                      className="w-full px-2 py-1.5 border rounded text-xs bg-white focus:ring-1 focus:ring-brand-purple"
                    >
                      <option value="">None</option>
                      <option value="FRANCHISEE">Franchisee</option>
                      <option value="FRANCHISOR">Franchisor</option>
                      <option value="COLLABORATIVE">Collaborative</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Verification</label>
                    <select
                      value={form.verificationType}
                      onChange={(e) => { setForm({ ...form, verificationType: e.target.value }); markDirty(); }}
                      className="w-full px-2 py-1.5 border rounded text-xs bg-white focus:ring-1 focus:ring-brand-purple"
                    >
                      <option value="">None</option>
                      <option value="CHECKBOX">Checkbox</option>
                      <option value="FILE_UPLOAD">File Upload</option>
                      <option value="TEXT_RESPONSE">Text Response</option>
                      <option value="FRANCHISOR_CONFIRMS">Franchisor Confirms</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Target Day</label>
                    <input
                      type="number"
                      value={form.targetDay ?? ""}
                      onChange={(e) => { setForm({ ...form, targetDay: e.target.value ? parseInt(e.target.value) : null }); markDirty(); }}
                      className="w-full px-2 py-1.5 border rounded text-xs focus:ring-1 focus:ring-brand-purple"
                      min={1}
                      max={90}
                      placeholder="—"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isMilestone}
                      onChange={(e) => { setForm({ ...form, isMilestone: e.target.checked }); markDirty(); }}
                      className="rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
                    />
                    <span className="text-xs text-gray-700">Milestone</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer" title="Email franchisor admins when franchisee completes this step">
                    <input
                      type="checkbox"
                      checked={form.notifyFranchisor}
                      onChange={(e) => { setForm({ ...form, notifyFranchisor: e.target.checked }); markDirty(); }}
                      className="rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
                    />
                    <span className="text-xs text-gray-700 whitespace-nowrap">Notify Franchisor</span>
                  </label>
                </div>
                {form.notifyFranchisor && (
                  <div>
                    <input
                      type="text"
                      value={form.franchisorActionText}
                      onChange={(e) => { setForm({ ...form, franchisorActionText: e.target.value }); markDirty(); }}
                      className="w-full px-2 py-1.5 border rounded text-xs focus:ring-1 focus:ring-brand-purple"
                      placeholder="e.g. Verify that the franchisee has filed their LLC"
                    />
                    <p className="mt-1 text-[10px] text-gray-400">
                      Action text for the franchisor email. Leave blank for a simple completion notification.
                    </p>
                  </div>
                )}

                {/* Completion Email */}
                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                    <EnvelopeIcon className="inline w-3 h-3 mr-0.5 -mt-0.5" />
                    Completion Email (Gmail)
                  </label>
                  <select
                    value={form.completionEmailTemplateId}
                    onChange={(e) => { setForm({ ...form, completionEmailTemplateId: e.target.value }); markDirty(); }}
                    className="w-full px-2 py-1.5 border rounded text-xs bg-white focus:ring-1 focus:ring-brand-purple"
                  >
                    <option value="">None</option>
                    {emailTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {t.subject}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-gray-400">
                    Auto-send an email via Gmail when a franchisee completes this module. Configure templates in Settings → Email Templates.
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Save / Delete ──────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <button
            onClick={handleSave}
            disabled={saving || !form.title}
            className="px-5 py-2 bg-brand-navy text-white rounded-lg text-sm font-medium hover:bg-brand-purple transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : module ? "Save Module" : "Create Module"}
          </button>
          {module && onDelete && (
            <button
              onClick={onDelete}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
            >
              Delete Module
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
