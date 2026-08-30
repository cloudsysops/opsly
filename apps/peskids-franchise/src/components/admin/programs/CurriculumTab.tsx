"use client";

import { useState, useEffect, useCallback } from "react";
import { ContentTree, PhaseEditor, ModuleEditor } from "@/components/admin/curriculum-editor";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import type { ProgramData, SelectedItem } from "@/components/admin/curriculum-editor/types";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

interface CurriculumTabProps {
  programId: string;
  programType: string;
  onTreeUpdate: () => void;
}

export default function CurriculumTab({
  programId,
  programType,
  onTreeUpdate,
}: CurriculumTabProps) {
  const [program, setProgram] = useState<ProgramData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: "", message: "", onConfirm: () => {} });

  const fetchTree = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/bootcamp/programs/${programId}/tree`
      );
      if (!res.ok) throw new Error("Failed to fetch program tree");
      const data = await res.json();
      setProgram(data.program);
    } catch (err) {
      console.error("Error fetching program tree:", err);
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const handleAddPhase = () => {
    setSelectedItem({ type: "phase", id: "__new__" });
  };

  const handleAddModule = (phaseId: string) => {
    setSelectedItem({ type: "module", id: "__new__", phaseId });
  };

  const handleSave = () => {
    setSelectedItem(null);
    fetchTree();
    onTreeUpdate();
  };

  const handleDeletePhase = (id: string) => {
    setConfirmModal({
      open: true,
      title: "Delete Phase",
      message:
        "Are you sure you want to delete this phase? All modules within it will also be deleted. This cannot be undone.",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, open: false }));
        try {
          const res = await fetch(`/api/admin/bootcamp/phases/${id}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Failed to delete phase");
          setSelectedItem(null);
          await fetchTree();
          onTreeUpdate();
        } catch (err) {
          console.error("Error deleting phase:", err);
        }
      },
    });
  };

  const handleDeleteModule = (id: string) => {
    setConfirmModal({
      open: true,
      title: "Delete Module",
      message:
        "Are you sure you want to delete this module? All content blocks within it will also be deleted. This cannot be undone.",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, open: false }));
        try {
          const res = await fetch(`/api/admin/bootcamp/modules/${id}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Failed to delete module");
          setSelectedItem(null);
          await fetchTree();
          onTreeUpdate();
        } catch (err) {
          console.error("Error deleting module:", err);
        }
      },
    });
  };

  const handleReorderPhases = async (
    items: { id: string; order: number }[]
  ) => {
    try {
      const res = await fetch("/api/admin/bootcamp/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "phases", items }),
      });
      if (!res.ok) throw new Error("Failed to reorder phases");
      await fetchTree();
      onTreeUpdate();
    } catch (err) {
      console.error("Error reordering phases:", err);
    }
  };

  const handleReorderModules = async (
    items: { id: string; order: number }[]
  ) => {
    try {
      const res = await fetch("/api/admin/bootcamp/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "modules", items }),
      });
      if (!res.ok) throw new Error("Failed to reorder modules");
      await fetchTree();
      onTreeUpdate();
    } catch (err) {
      console.error("Error reordering modules:", err);
    }
  };

  // Resolve the selected phase/module data from the tree
  const getSelectedPhase = () => {
    if (!program || !selectedItem || selectedItem.type !== "phase") return null;
    if (selectedItem.id === "__new__") return null;
    return (
      program.academyPhases.find((p) => p.id === selectedItem.id) ?? null
    );
  };

  const getSelectedModule = () => {
    if (!program || !selectedItem || selectedItem.type !== "module") return null;
    if (selectedItem.id === "__new__") return null;
    for (const phase of program.academyPhases) {
      const mod = phase.modules.find((m) => m.id === selectedItem.id);
      if (mod) return mod;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-500">
          <svg
            className="animate-spin h-5 w-5 text-brand-navy"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>Loading curriculum...</span>
        </div>
      </div>
    );
  }

  const phases = program?.academyPhases ?? [];

  return (
    <>
      <div className="flex gap-6 h-[calc(100vh-14rem)] overflow-hidden">
        {/* Left panel — Editor area */}
        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden border rounded-lg bg-white p-6">
          {!selectedItem && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <DocumentTextIcon className="h-16 w-16 mb-4" />
              <p className="text-lg font-medium">
                Select a phase or module to edit
              </p>
              <p className="text-sm mt-1">
                Use the content tree on the right to get started
              </p>
            </div>
          )}

          {selectedItem?.type === "phase" && (
            <PhaseEditor
              phase={getSelectedPhase()}
              programId={programId}
              onSave={handleSave}
              onDelete={
                selectedItem.id !== "__new__"
                  ? () => handleDeletePhase(selectedItem.id)
                  : undefined
              }
              saving={saving}
              setSaving={setSaving}
            />
          )}

          {selectedItem?.type === "module" && (
            <ModuleEditor
              module={getSelectedModule()}
              phaseId={selectedItem.phaseId}
              programType={programType}
              onSave={handleSave}
              onDelete={
                selectedItem.id !== "__new__"
                  ? () => handleDeleteModule(selectedItem.id)
                  : undefined
              }
              saving={saving}
              setSaving={setSaving}
            />
          )}
        </div>

        {/* Right panel — Content tree */}
        <div className="w-72 flex-shrink-0 border rounded-lg bg-white overflow-hidden">
          <ContentTree
            phases={phases}
            selectedItem={selectedItem}
            onSelectItem={setSelectedItem}
            onAddPhase={handleAddPhase}
            onAddModule={handleAddModule}
            onReorderPhases={handleReorderPhases}
            onReorderModules={handleReorderModules}
          />
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel="Delete"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
      />
    </>
  );
}
