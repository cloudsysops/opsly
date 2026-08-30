"use client";

import { useState, useMemo } from "react";
import {
  XMarkIcon,
  EyeIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import { UnifiedBlockRenderer } from "@/components/academy/UnifiedBlockRenderer";
import type {
  PhaseData,
  ModuleData,
  ContentBlockData,
} from "@/components/admin/curriculum-editor/types";
import type { UnifiedContentBlock } from "@/components/academy/UnifiedBlockRenderer";

interface PreviewOverlayProps {
  programName: string;
  programType: string;
  phases: PhaseData[];
  onClose: () => void;
}

/** Map ContentBlockData (editor shape) to UnifiedContentBlock (renderer shape) */
function toUnifiedBlock(block: ContentBlockData): UnifiedContentBlock {
  return {
    id: block.id,
    type: block.type,
    order: block.order,
    content: block.type === "CALLOUT" ? (block.calloutContent ?? block.content ?? null) : (block.content ?? null),
    checkpointText: block.checkpointText ?? null,
    quizQuestion: block.quizQuestion ?? null,
    quizOptions: block.quizOptions ?? null,
    correctAnswer: block.correctAnswer ?? null,
    imageUrl: block.imageUrl ?? null,
    imageAlt: block.imageAlt ?? null,
    imageCaption: block.imageCaption ?? null,
    videoUrl: block.videoUrl ?? null,
    videoProvider: block.videoProvider ?? null,
    fileUrl: block.fileUrl ?? null,
    fileName: block.fileTitle ?? null,
    fileSize: null,
    calloutType: block.calloutType ?? null,
    calloutTitle: block.calloutTitle ?? null,
    checklistItems: block.checklistItems?.map((item) =>
      typeof item === "string" ? item : item.title
    ) ?? null,
  };
}

interface FlatModule {
  module: ModuleData;
  phaseIndex: number;
  phaseTitle: string;
}

export default function PreviewOverlay({
  programName,
  programType,
  phases,
  onClose,
}: PreviewOverlayProps) {
  const allModules = useMemo<FlatModule[]>(() => {
    const result: FlatModule[] = [];
    phases.forEach((phase, phaseIdx) => {
      phase.modules.forEach((mod) => {
        result.push({
          module: mod,
          phaseIndex: phaseIdx,
          phaseTitle: phase.title,
        });
      });
    });
    return result;
  }, [phases]);

  const [currentIndex, setCurrentIndex] = useState(0);

  if (allModules.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <Toolbar programName={programName} onClose={onClose} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-lg">No modules to preview.</p>
        </div>
      </div>
    );
  }

  const { module: mod, phaseTitle } = allModules[currentIndex];
  const unifiedBlocks = mod.contentBlocks.map(toUnifiedBlock);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allModules.length - 1;
  const hasStepGuide = mod.stepWhat || mod.stepHow || mod.stepWhy;

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col overflow-hidden">
      {/* Admin toolbar */}
      <Toolbar programName={programName} onClose={onClose} />

      {/* Content area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left column - module detail */}
        <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-10">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Phase breadcrumb */}
            <p className="text-sm text-gray-500">{phaseTitle}</p>

            {/* Module header */}
            <div>
              <h1 className="text-2xl font-bold text-brand-navy">{mod.title}</h1>
              {mod.description && (
                <div className="mt-2 text-gray-600 [&_p]:mb-0" dangerouslySetInnerHTML={{ __html: mod.description }} />
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {mod.owner && (
                  <Badge color="purple">{mod.owner}</Badge>
                )}
                {mod.targetDay != null && (
                  <Badge color="green">Day {mod.targetDay}</Badge>
                )}
                {mod.isMilestone && (
                  <Badge color="amber">Milestone</Badge>
                )}
              </div>
            </div>

            {/* Step guide */}
            {hasStepGuide && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <h3 className="text-lg font-semibold text-brand-navy flex items-center gap-2">
                  <BookOpenIcon className="h-5 w-5 text-brand-purple" />
                  About This Step
                </h3>
                {mod.stepWhat && (
                  <StepSection label="What Is This Step" content={mod.stepWhat} />
                )}
                {mod.stepWhy && (
                  <StepSection label="Why This Matters" content={mod.stepWhy} />
                )}
                {mod.stepHow && (
                  <StepSection label="How To Complete This" content={mod.stepHow} />
                )}
              </div>
            )}

            {/* Content blocks */}
            {unifiedBlocks.length > 0 && (
              <UnifiedBlockRenderer
                blocks={unifiedBlocks}
                moduleId={mod.id}
                onBlockComplete={() => {}}
                completedBlocks={new Set()}
                blockProgress={new Map()}
              />
            )}

            {/* Resource guide button (disabled) */}
            {mod.resourcePageId && (
              <button
                disabled
                className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-400 flex items-center gap-2 opacity-50 cursor-not-allowed"
              >
                <BookOpenIcon className="h-5 w-5" />
                View Resource Guide
              </button>
            )}

            {/* Data fields preview */}
            {mod.dataFields && mod.dataFields.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <h3 className="text-lg font-semibold text-brand-navy">
                  Required Information
                </h3>
                <div className="space-y-3">
                  {mod.dataFields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {field.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      {field.type === "textarea" ? (
                        <textarea
                          disabled
                          rows={3}
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed resize-none"
                        />
                      ) : (
                        <input
                          type={field.type === "number" ? "number" : "text"}
                          disabled
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom navigation */}
            <div className="flex items-center justify-between pt-4 pb-8 border-t border-gray-200">
              <button
                onClick={() => hasPrev && setCurrentIndex(currentIndex - 1)}
                disabled={!hasPrev}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  hasPrev
                    ? "text-brand-navy hover:bg-brand-light"
                    : "text-gray-300 cursor-not-allowed"
                }`}
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Previous
              </button>

              <button
                disabled
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-green text-white font-medium opacity-50 cursor-not-allowed"
              >
                <CheckCircleIcon className="h-5 w-5" />
                Mark Complete
              </button>

              <button
                onClick={() => hasNext && setCurrentIndex(currentIndex + 1)}
                disabled={!hasNext}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  hasNext
                    ? "text-brand-navy hover:bg-brand-light"
                    : "text-gray-300 cursor-not-allowed"
                }`}
              >
                Next
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right column - phase checklist sidebar */}
        <div className="hidden lg:block w-72 xl:w-80 border-l border-gray-200 bg-white overflow-y-auto">
          <div className="p-4 space-y-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Phase Checklist
            </h3>
            {phases.map((phase, phaseIdx) => (
              <div key={phase.id}>
                <p className="text-xs font-semibold text-brand-navy uppercase tracking-wide mb-2">
                  {phase.title}
                </p>
                <div className="space-y-1">
                  {phase.modules.map((phaseMod) => {
                    const flatIdx = allModules.findIndex(
                      (fm) => fm.module.id === phaseMod.id
                    );
                    const isCurrent = flatIdx === currentIndex;
                    return (
                      <button
                        key={phaseMod.id}
                        onClick={() => setCurrentIndex(flatIdx)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          isCurrent
                            ? "bg-brand-light border-l-2 border-brand-cyan font-medium text-brand-navy"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <CheckCircleIcon
                            className={`h-4 w-4 flex-shrink-0 ${
                              isCurrent ? "text-brand-cyan" : "text-gray-300"
                            }`}
                          />
                          <span className="truncate">{phaseMod.title}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Toolbar({
  programName,
  onClose,
}: {
  programName: string;
  onClose: () => void;
}) {
  return (
    <div className="flex-shrink-0 bg-brand-purple/10 border-b border-brand-purple/20 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-brand-purple">
        <EyeIcon className="h-5 w-5" />
        <span className="text-sm font-semibold">Preview Mode</span>
      </div>
      <span className="text-sm font-medium text-brand-navy">{programName}</span>
      <button
        onClick={onClose}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-brand-purple hover:bg-brand-purple/10 transition-colors"
      >
        Close Preview
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function Badge({
  color,
  children,
}: {
  color: "purple" | "cyan" | "navy" | "green" | "amber";
  children: React.ReactNode;
}) {
  const styles: Record<string, string> = {
    purple: "bg-brand-purple/10 text-brand-purple",
    cyan: "bg-brand-cyan/10 text-brand-cyan",
    navy: "bg-brand-navy/10 text-brand-navy",
    green: "bg-brand-green/10 text-brand-green",
    amber: "bg-brand-yellow/10 text-brand-yellow",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[color]}`}
    >
      {children}
    </span>
  );
}

function StepSection({ label, content }: { label: string; content: string }) {
  const isHtml = content.includes("<");
  return (
    <div>
      <h4 className="text-sm font-semibold text-brand-purple mb-1">{label}</h4>
      {isHtml ? (
        <div className="text-sm text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
      ) : (
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{content}</p>
      )}
    </div>
  );
}
