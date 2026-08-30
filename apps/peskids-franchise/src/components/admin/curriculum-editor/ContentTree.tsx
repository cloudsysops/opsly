"use client";

import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  DocumentTextIcon,
  PlayCircleIcon,
  QuestionMarkCircleIcon,
  ClipboardDocumentListIcon,
  BookOpenIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PhaseData, ModuleData, SelectedItem } from "./types";

const moduleTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  VIDEO: PlayCircleIcon,
  READING: DocumentTextIcon,
  QUIZ: QuestionMarkCircleIcon,
  CHECKLIST: ClipboardDocumentListIcon,
  ASSIGNMENT: BookOpenIcon,
  RESOURCE: FolderIcon,
};

interface ContentTreeProps {
  phases: PhaseData[];
  selectedItem: SelectedItem;
  onSelectItem: (item: SelectedItem) => void;
  onAddPhase: () => void;
  onAddModule: (phaseId: string) => void;
  onReorderPhases: (items: { id: string; order: number }[]) => void;
  onReorderModules: (items: { id: string; order: number }[]) => void;
}

function SortablePhaseRow({
  phase,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  onAddModule,
  selectedItem,
  onSelectModule,
  onReorderModules,
}: {
  phase: PhaseData;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onAddModule: () => void;
  selectedItem: SelectedItem;
  onSelectModule: (moduleId: string) => void;
  onReorderModules: (items: { id: string; order: number }[]) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phase.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleModuleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const modules = [...phase.modules];
    const oldIndex = modules.findIndex((m) => m.id === active.id);
    const newIndex = modules.findIndex((m) => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const [moved] = modules.splice(oldIndex, 1);
    modules.splice(newIndex, 0, moved);

    onReorderModules(modules.map((m, i) => ({ id: m.id, order: i })));
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Phase header */}
      <div
        className={`flex items-center gap-1.5 px-3 py-2.5 border-b cursor-pointer transition-colors ${
          isSelected
            ? "bg-brand-navy/10 border-l-2 border-l-brand-navy"
            : "hover:bg-gray-50 border-l-2 border-l-transparent"
        }`}
      >
        <button
          className="p-0.5 hover:bg-gray-200 rounded cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
          </svg>
        </button>
        <button onClick={onToggle} className="p-0.5">
          {isExpanded ? (
            <ChevronDownIcon className="h-3.5 w-3.5 text-gray-500" />
          ) : (
            <ChevronRightIcon className="h-3.5 w-3.5 text-gray-500" />
          )}
        </button>
        <span
          className="flex-1 font-medium text-gray-900 text-sm truncate"
          onClick={onSelect}
        >
          {phase.title}
        </span>
        <span className="text-xs text-gray-400 tabular-nums">
          {phase.modules.length}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddModule();
          }}
          className="p-0.5 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100"
          title="Add module"
        >
          <PlusIcon className="h-3.5 w-3.5 text-gray-500" />
        </button>
      </div>

      {/* Module list */}
      {isExpanded && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleModuleDragEnd}
        >
          <SortableContext
            items={phase.modules.map((m) => m.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="bg-gray-50/50">
              {phase.modules.length === 0 ? (
                <button
                  onClick={onAddModule}
                  className="w-full text-left pl-10 pr-3 py-2 text-xs text-gray-400 hover:text-brand-purple hover:bg-gray-100 transition-colors"
                >
                  + Add first module
                </button>
              ) : (
                phase.modules.map((module) => (
                  <SortableModuleRow
                    key={module.id}
                    module={module}
                    isSelected={
                      selectedItem?.type === "module" &&
                      selectedItem.id === module.id
                    }
                    onSelect={() => onSelectModule(module.id)}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableModuleRow({
  module,
  isSelected,
  onSelect,
}: {
  module: ModuleData;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = moduleTypeIcons[module.moduleType] || DocumentTextIcon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`flex items-center gap-1.5 pl-8 pr-3 py-1.5 cursor-pointer transition-colors group ${
        isSelected
          ? "bg-brand-navy/10 border-l-2 border-l-brand-cyan ml-0"
          : "hover:bg-gray-100 border-l-2 border-l-transparent ml-0"
      }`}
    >
      <button
        className="p-0.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100"
        {...attributes}
        {...listeners}
      >
        <svg className="w-3 h-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
        </svg>
      </button>
      <Icon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
      <span className="flex-1 text-sm text-gray-700 truncate">
        {module.title}
      </span>
      {module.isMilestone && (
        <StarIcon className="h-3 w-3 text-amber-500 flex-shrink-0" />
      )}
    </div>
  );
}

export function ContentTree({
  phases,
  selectedItem,
  onSelectItem,
  onAddPhase,
  onAddModule,
  onReorderPhases,
  onReorderModules,
}: ContentTreeProps) {
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>(
    () => {
      const expanded: Record<string, boolean> = {};
      phases.forEach((p) => {
        expanded[p.id] = true;
      });
      return expanded;
    }
  );
  const [searchQuery, setSearchQuery] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => ({
      ...prev,
      [phaseId]: !prev[phaseId],
    }));
  };

  const handlePhaseDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const filtered = filteredPhases;
    const oldIndex = filtered.findIndex((p) => p.id === active.id);
    const newIndex = filtered.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...filtered];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    onReorderPhases(reordered.map((p, i) => ({ id: p.id, order: i })));
  };

  // Filter phases/modules by search query
  const filteredPhases = searchQuery
    ? phases
        .map((phase) => ({
          ...phase,
          modules: phase.modules.filter((m) =>
            m.title.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter(
          (phase) =>
            phase.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            phase.modules.length > 0
        )
    : phases;

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter modules..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-brand-cyan focus:border-brand-cyan"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handlePhaseDragEnd}
        >
          <SortableContext
            items={filteredPhases.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            {filteredPhases.map((phase) => (
              <div key={phase.id} className="group">
                <SortablePhaseRow
                  phase={phase}
                  isExpanded={expandedPhases[phase.id] ?? true}
                  isSelected={
                    selectedItem?.type === "phase" &&
                    selectedItem.id === phase.id
                  }
                  onToggle={() => togglePhase(phase.id)}
                  onSelect={() =>
                    onSelectItem({ type: "phase", id: phase.id })
                  }
                  onAddModule={() => onAddModule(phase.id)}
                  selectedItem={selectedItem}
                  onSelectModule={(moduleId) =>
                    onSelectItem({
                      type: "module",
                      id: moduleId,
                      phaseId: phase.id,
                    })
                  }
                  onReorderModules={onReorderModules}
                />
              </div>
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Add Phase button */}
      <div className="p-3 border-t">
        <button
          onClick={onAddPhase}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-brand-navy bg-brand-navy/5 hover:bg-brand-navy/10 rounded-md transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Phase
        </button>
      </div>
    </div>
  );
}
