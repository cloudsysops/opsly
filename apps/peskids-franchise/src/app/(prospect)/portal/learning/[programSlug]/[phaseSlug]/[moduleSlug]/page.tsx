"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { UnifiedBlockRenderer, type UnifiedContentBlock } from "@/components/academy/UnifiedBlockRenderer";
import {
  CheckCircleIcon,
  ClockIcon,
  BookOpenIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  PaperClipIcon,
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { useConfetti } from "@/components/journey/Confetti";
import { useFireworks } from "@/components/journey/Fireworks";
import ResourceOverlay from "@/components/prospect/ResourceOverlay";
import MilestoneFeedbackPrompt from "@/components/shared/MilestoneFeedbackPrompt";

export const dynamic = "force-dynamic";

interface PhaseModule {
  slug: string;
  title: string;
  status: string;
  isMilestone: boolean;
  isCurrent: boolean;
  owner: "FRANCHISEE" | "FRANCHISOR" | "COLLABORATIVE" | null;
  points: number;
}

interface DataField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

interface ModuleData {
  module: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    moduleType: string;
    points: number;
    duration: number | null;
    owner: "FRANCHISEE" | "FRANCHISOR" | "COLLABORATIVE" | null;
    verificationType: string | null;
    targetDay: number | null;
    isMilestone: boolean;
    notifyFranchisor: boolean;
    franchisorActionText: string | null;
    resourceUrl: string | null;
    contentBlocks: UnifiedContentBlock[];
    stepWhat: string | null;
    stepHow: string | null;
    stepWhy: string | null;
    dataFields: DataField[] | null;
    resourcePageId: string | null;
    sectionOrder: string[] | null;
  };
  program: {
    slug: string;
    name: string;
    programType: "ONBOARDING" | "CONTINUING_EDUCATION" | "CERTIFICATION";
  };
  phase: {
    slug: string;
    title: string;
  };
  progress: {
    status: string;
    completedAt: string | null;
    fileUrl: string | null;
    textResponse: string | null;
    collectedData: Record<string, string> | null;
  } | null;
  blockProgress: Array<{
    blockId: string;
    isCompleted: boolean;
    quizAnswer: number | null;
    quizCorrect: boolean | null;
    checklistChecked: number[] | null;
  }>;
  resourcePage: { id: string; title: string; hash: string | null } | null;
  linkedResources: Array<{
    id: string;
    resourceType: string;
    title: string;
    url: string | null;
    action: string;
  }>;
  phaseModules: PhaseModule[];
  allPhases?: Array<{
    slug: string;
    title: string;
    isCurrent: boolean;
    modules: PhaseModule[];
  }>;
  navigation: {
    prevModule: { slug: string; title: string } | null;
    nextModule: { slug: string; title: string } | null;
  };
  currentDay: number;
}

// ---------------------------------------------------------------------------
// PhaseAccordion — collapsible phase in the right sidebar
// ---------------------------------------------------------------------------

function PhaseAccordion({
  phase,
  phaseCompleted,
  phaseTotal,
  programSlug,
  defaultOpen,
}: {
  phase: { slug: string; title: string; isCurrent: boolean; modules: PhaseModule[] };
  phaseCompleted: number;
  phaseTotal: number;
  programSlug: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors ${
          phase.isCurrent ? "bg-brand-navy/5" : "bg-gray-50 hover:bg-gray-100"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <ChevronRightIcon
            className={`h-3.5 w-3.5 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
          />
          <h3 className={`text-sm font-semibold truncate ${phase.isCurrent ? "text-brand-navy" : "text-gray-600"}`}>
            {phase.title}
          </h3>
        </div>
        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{phaseCompleted}/{phaseTotal}</span>
      </button>
      {open && (
        <>
          <div className="px-4 pb-1">
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-cyan rounded-full transition-all duration-500"
                style={{ width: `${phaseTotal > 0 ? (phaseCompleted / phaseTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="py-1">
            {phase.modules.map((pm) => {
              const pmCompleted = pm.status === "COMPLETED";
              const pmPending = pm.status === "PENDING_REVIEW";
              const pmInProgress = pm.status === "IN_PROGRESS";
              return (
                <Link
                  key={pm.slug}
                  href={`/portal/learning/${programSlug}/${phase.slug}/${pm.slug}`}
                  className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                    pm.isCurrent
                      ? "bg-brand-cyan/10 border-l-2 border-brand-cyan"
                      : "hover:bg-gray-50 border-l-2 border-transparent"
                  }`}
                >
                  {pmCompleted ? (
                    <CheckCircleIcon className="text-green-500 flex-shrink-0" style={{ width: 18, height: 18 }} />
                  ) : pmPending ? (
                    <ClockIcon className="text-yellow-500 flex-shrink-0" style={{ width: 18, height: 18 }} />
                  ) : pmInProgress ? (
                    <div className="w-[18px] h-[18px] rounded-full border-2 border-blue-500 bg-blue-50 flex-shrink-0" />
                  ) : (
                    <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-300 flex-shrink-0" />
                  )}
                  <span className={`flex-1 truncate leading-tight ${
                    pmCompleted ? "text-gray-400 line-through" :
                    pm.isCurrent ? "text-brand-navy font-medium" :
                    "text-gray-600"
                  }`}>
                    {pm.isMilestone ? "🏆 " : ""}{pm.title}
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function ModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const programSlug = params.programSlug as string;
  const phaseSlug = params.phaseSlug as string;
  const moduleSlug = params.moduleSlug as string;

  const [data, setData] = useState<ModuleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [textResponse, setTextResponse] = useState("");
  const [fileUploading, setFileUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);
  const [showResourceOverlay, setShowResourceOverlay] = useState(false);
  const [collectedData, setCollectedData] = useState<Record<string, string>>({});
  const [fieldUploading, setFieldUploading] = useState<Record<string, boolean>>({});
  const [fieldFileNames, setFieldFileNames] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { fireConfetti } = useConfetti();
  const { fireFireworks } = useFireworks();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setShowSuccess(false);
        const res = await fetch(`/api/franchisee/bootcamp/modules/${moduleSlug}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to fetch module");
        }
        const moduleData = await res.json();
        setData(moduleData);
        if (moduleData.progress?.textResponse) {
          setTextResponse(moduleData.progress.textResponse);
        }
        if (moduleData.progress?.collectedData) {
          setCollectedData(moduleData.progress.collectedData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [moduleSlug]);

  // Auto-start module on first visit (no explicit "Start" button needed)
  useEffect(() => {
    if (!data) return;
    const progress = data.progress;
    const isAlreadyStarted = progress?.status === "IN_PROGRESS" || progress?.status === "COMPLETED" || progress?.status === "PENDING_REVIEW";
    const isFranchisor = data.module.owner === "FRANCHISOR";
    if (!isAlreadyStarted && !isFranchisor) {
      fetch(`/api/franchisee/bootcamp/modules/${moduleSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      }).then(() => {
        setData((prev) =>
          prev
            ? { ...prev, progress: { status: "IN_PROGRESS", completedAt: null, fileUrl: null, textResponse: null, collectedData: null } }
            : null
        );
      }).catch(console.error);
    }
  }, [data, moduleSlug]);

  const autoAdvance = useCallback((nextSlug: string) => {
    setTimeout(() => {
      router.push(`/portal/learning/${programSlug}/${phaseSlug}/${nextSlug}`);
    }, 1500);
  }, [router, programSlug, phaseSlug]);

  const handleBlockComplete = useCallback(
    async (blockId: string, blockData?: { quizAnswer?: number }) => {
      if (!data) return;
      try {
        await fetch(`/api/franchisee/bootcamp/modules/${moduleSlug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: blockData?.quizAnswer !== undefined ? "submit_quiz" : "complete_block",
            blockId,
            ...blockData,
          }),
        });
      } catch (err) {
        console.error("Failed to save block progress:", err);
      }
    },
    [data, moduleSlug]
  );

  const handleComplete = async () => {
    if (!data) return;
    setCompleting(true);
    try {
      const body: Record<string, unknown> = { action: "complete" };
      if (data.module.verificationType === "TEXT_RESPONSE") {
        body.textResponse = textResponse;
      }
      // Include collected data if any fields are filled
      const hasCollectedData = Object.values(collectedData).some((v) => v.trim());
      if (hasCollectedData) {
        body.collectedData = collectedData;
      }

      const res = await fetch(`/api/franchisee/bootcamp/modules/${moduleSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to complete module");
      }

      const result = await res.json();

      if (data.module.isMilestone) {
        fireFireworks();
      } else {
        fireConfetti();
      }

      setShowSuccess(true);

      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          progress: {
            status: result.progress?.status || "COMPLETED",
            completedAt: new Date().toISOString(),
            fileUrl: prev.progress?.fileUrl || null,
            textResponse: textResponse || null,
            collectedData: hasCollectedData ? collectedData : null,
          },
          phaseModules: prev.phaseModules.map((m) =>
            m.isCurrent ? { ...m, status: result.progress?.status || "COMPLETED" } : m
          ),
        };
      });

      if (data.navigation.nextModule && result.progress?.status !== "PENDING_REVIEW") {
        autoAdvance(data.navigation.nextModule.slug);
      } else {
        // No auto-advance — show feedback prompt after a short delay
        setTimeout(() => setShowFeedbackPrompt(true), 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete");
    } finally {
      setCompleting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !data) return;
    setFileUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("action", "complete");

      const res = await fetch(`/api/franchisee/bootcamp/modules/${moduleSlug}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const result = await res.json();

      if (data.module.isMilestone) {
        fireFireworks();
      } else {
        fireConfetti();
      }

      setShowSuccess(true);
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          progress: {
            status: result.progress?.status || "COMPLETED",
            completedAt: new Date().toISOString(),
            fileUrl: result.fileUrl || null,
            textResponse: null,
            collectedData: null,
          },
          phaseModules: prev.phaseModules.map((m) =>
            m.isCurrent ? { ...m, status: result.progress?.status || "COMPLETED" } : m
          ),
        };
      });

      if (data.navigation.nextModule) {
        autoAdvance(data.navigation.nextModule.slug);
      } else {
        setTimeout(() => setShowFeedbackPrompt(true), 2000);
      }
    } catch (err) {
      setError("File upload failed. Please try again.");
    } finally {
      setFileUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-navy" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="p-6 bg-red-50 rounded-xl border border-red-200 text-center">
          <p className="text-red-700">{error || "Module not found"}</p>
          <Link
            href={`/portal/learning/${programSlug}/${phaseSlug}`}
            className="mt-4 inline-block px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-purple"
          >
            Back to Phase
          </Link>
        </div>
      </div>
    );
  }

  const { module: mod, program, phase, progress, blockProgress: rawBlockProgress, navigation, phaseModules } = data;
  const isCompleted = progress?.status === "COMPLETED";
  const isPendingReview = progress?.status === "PENDING_REVIEW";
  const isOnboarding = program.programType === "ONBOARDING";
  const isFranchisorTask = mod.owner === "FRANCHISOR";

  const hasStepGuide = mod.stepWhat || mod.stepHow || mod.stepWhy;
  const hasDataFields = mod.dataFields && mod.dataFields.length > 0;

  // Check if required data fields are filled
  const requiredFieldsFilled = !hasDataFields || mod.dataFields!.filter((f) => f.required).every((f) => collectedData[f.key]?.trim());

  const completedBlocks = new Set(
    rawBlockProgress.filter((bp) => bp.isCompleted).map((bp) => bp.blockId)
  );
  const blockProgressMap = new Map(
    rawBlockProgress.map((bp) => [
      bp.blockId,
      {
        quizAnswer: bp.quizAnswer ?? undefined,
        quizCorrect: bp.quizCorrect ?? undefined,
        checklistChecked: bp.checklistChecked ?? undefined,
      },
    ])
  );

  // completedInPhase / totalInPhase now calculated inside PhaseAccordion

  // Can user complete? Not already done, required fields filled, text response if needed
  const canComplete =
    !isCompleted &&
    !isPendingReview &&
    !isFranchisorTask &&
    requiredFieldsFilled &&
    (mod.verificationType !== "TEXT_RESPONSE" || textResponse.trim());

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-5 flex flex-wrap items-center gap-1">
        <Link href="/portal/learning" className="hover:text-brand-purple">Learning Center</Link>
        <span className="mx-1">/</span>
        <Link href={`/portal/learning/${programSlug}`} className="hover:text-brand-purple">{program.name}</Link>
        <span className="mx-1">/</span>
        <span className="text-brand-navy font-medium">{mod.title}</span>
      </nav>

      {/* Two-column layout: task content left, progress sidebar right */}
      <div className="flex flex-col lg:flex-row lg:gap-6">
        {/* ── Left column: Main task content ─────────────────────────── */}
        <div className="lg:flex-1 min-w-0">
          {/* Module Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              {mod.isMilestone && <span className="text-2xl" title="Milestone">&#127942;</span>}
              {isCompleted && <span className="text-2xl">&#9989;</span>}
              {isPendingReview && <span className="text-2xl">&#9203;</span>}
              <h1 className="text-2xl font-bold text-brand-navy">{mod.title}</h1>
            </div>
            {mod.description && (
              mod.description.includes("<") ? (
                <div className="text-gray-600 text-sm mt-1 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: mod.description }} />
              ) : (
                <p className="text-gray-600 text-sm mt-1">{mod.description}</p>
              )
            )}

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {mod.owner && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  mod.owner === "FRANCHISEE" ? "bg-brand-navy text-white" :
                  mod.owner === "FRANCHISOR" ? "bg-brand-purple text-white" :
                  "bg-brand-cyan text-brand-navy"
                }`}>
                  {mod.owner === "FRANCHISEE" ? "Your Task" : mod.owner === "FRANCHISOR" ? "STC Task" : "Joint Task"}
                </span>
              )}
              {isOnboarding && mod.targetDay && !isCompleted && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  mod.targetDay < data.currentDay ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                }`}>
                  Target: Day {mod.targetDay}
                </span>
              )}
            </div>
          </div>

          {/* Franchisor Task Notice */}
          {isFranchisorTask && !isCompleted && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <p className="text-purple-700 font-medium text-sm">This is an STC task</p>
              <p className="text-sm text-purple-600 mt-1">
                {mod.franchisorActionText || "This step will be completed by your STC support team."}
              </p>
            </div>
          )}

          {/* ── Ordered Sections (step-guide, blocks, data-collection) ── */}
          {(() => {
            // Build render order from sectionOrder or default
            const blockIds = mod.contentBlocks.map((b) => b.id);
            const order: string[] = mod.sectionOrder && Array.isArray(mod.sectionOrder) && mod.sectionOrder.length > 0
              ? (mod.sectionOrder as string[])
              : ["step-guide", ...blockIds, "data-collection"];

            // Collect block IDs not in order (append them)
            const inOrder = new Set(order);
            const extraBlocks = blockIds.filter((id) => !inOrder.has(id));
            const fullOrder = [...order, ...extraBlocks];

            return fullOrder.map((sectionId) => {
              // -- Step Guide --
              if (sectionId === "step-guide") {
                return (
                  <div key="step-guide">
                    {hasStepGuide && (
                      <div className="mb-6 bg-brand-light/50 border border-brand-cyan/30 rounded-xl p-5">
                        <h3 className="text-base font-semibold text-brand-navy mb-4">About This Step</h3>
                        <div className="space-y-4">
                          {mod.stepWhat && (
                            <div>
                              <h4 className="text-sm font-semibold text-brand-navy mb-1">What Is This Step</h4>
                              {mod.stepWhat.includes("<") ? (
                                <div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: mod.stepWhat }} />
                              ) : (
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{mod.stepWhat}</p>
                              )}
                            </div>
                          )}
                          {mod.stepWhy && (
                            <div>
                              <h4 className="text-sm font-semibold text-brand-navy mb-1">Why This Matters</h4>
                              {mod.stepWhy.includes("<") ? (
                                <div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: mod.stepWhy }} />
                              ) : (
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{mod.stepWhy}</p>
                              )}
                            </div>
                          )}
                          {mod.stepHow && (
                            <div>
                              <h4 className="text-sm font-semibold text-brand-navy mb-1">How To Complete This</h4>
                              {mod.stepHow.includes("<") ? (
                                <div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: mod.stepHow }} />
                              ) : (
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{mod.stepHow}</p>
                              )}
                            </div>
                          )}
                        </div>
                        {data.resourcePage && (
                          <button
                            onClick={() => setShowResourceOverlay(true)}
                            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-brand-cyan/40 text-brand-navy rounded-lg text-sm font-medium hover:bg-brand-light hover:border-brand-cyan transition-colors shadow-sm"
                          >
                            <BookOpenIcon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                            View Resource Guide: {data.resourcePage.title}
                          </button>
                        )}
                      </div>
                    )}
                    {!hasStepGuide && data.resourcePage && (
                      <div className="mb-6">
                        <button
                          onClick={() => setShowResourceOverlay(true)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-light border border-brand-cyan/40 text-brand-navy rounded-lg text-sm font-medium hover:bg-white hover:border-brand-cyan transition-colors shadow-sm"
                        >
                          <BookOpenIcon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                          View Resource Guide: {data.resourcePage.title}
                        </button>
                      </div>
                    )}
                    {/* Linked Resources / Attachments */}
                    {data.linkedResources && data.linkedResources.length > 0 && (
                      <div className="mb-6 bg-white border border-gray-200 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-brand-navy mb-3 flex items-center gap-2">
                          <PaperClipIcon className="h-4 w-4" />
                          Attachments &amp; Resources
                        </h3>
                        <div className="space-y-2">
                          {data.linkedResources.map((lr) => (
                            <a
                              key={lr.id}
                              href={lr.url || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-brand-light border border-gray-200 hover:border-brand-cyan/40 rounded-lg transition-colors group"
                            >
                              <div className="p-2 rounded-lg bg-brand-navy/10 group-hover:bg-brand-navy/20 transition-colors flex-shrink-0">
                                {lr.url?.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|csv|zip)($|\?)/) ? (
                                  <ArrowDownTrayIcon className="h-4 w-4 text-brand-navy" />
                                ) : (
                                  <ArrowTopRightOnSquareIcon className="h-4 w-4 text-brand-navy" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{lr.title}</p>
                                <p className="text-xs text-gray-500">{lr.action}</p>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // -- Data Collection --
              if (sectionId === "data-collection") {
                const showDataSection = !isCompleted && !isPendingReview && !isFranchisorTask && (hasDataFields || mod.verificationType === "TEXT_RESPONSE" || mod.verificationType === "FILE_UPLOAD");
                if (!showDataSection) return null;
                return (
                  <div key="data-collection" className="mb-6 p-5 bg-gray-50 rounded-xl border">
                    <h3 className="text-base font-semibold text-brand-navy mb-4">Confirm Your Details</h3>
                    {hasDataFields && (
                      <div className="space-y-3 mb-4">
                        {mod.dataFields!.map((field) => (
                          <div key={field.key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {field.type === "file" ? (
                              <div>
                                {collectedData[field.key] ? (
                                  <div className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-green-700 truncate">
                                        {fieldFileNames[field.key] || "File uploaded"}
                                      </p>
                                      <a
                                        href={collectedData[field.key]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-brand-purple hover:underline"
                                      >
                                        View file
                                      </a>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCollectedData({ ...collectedData, [field.key]: "" });
                                        setFieldFileNames({ ...fieldFileNames, [field.key]: "" });
                                      }}
                                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ) : (
                                  <div>
                                    <input
                                      type="file"
                                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                                      disabled={fieldUploading[field.key]}
                                      onChange={async (e) => {
                                        const f = e.target.files?.[0];
                                        if (!f) return;
                                        setFieldUploading({ ...fieldUploading, [field.key]: true });
                                        try {
                                          const fd = new FormData();
                                          fd.append("file", f);
                                          const res = await fetch("/api/franchisee/bootcamp/upload", {
                                            method: "POST",
                                            body: fd,
                                          });
                                          if (!res.ok) {
                                            const err = await res.json();
                                            throw new Error(err.error || "Upload failed");
                                          }
                                          const result = await res.json();
                                          setCollectedData({ ...collectedData, [field.key]: result.url });
                                          setFieldFileNames({ ...fieldFileNames, [field.key]: result.fileName });
                                        } catch (err) {
                                          console.error("Field file upload failed:", err);
                                        } finally {
                                          setFieldUploading({ ...fieldUploading, [field.key]: false });
                                          e.target.value = "";
                                        }
                                      }}
                                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-navy file:text-white hover:file:bg-brand-purple"
                                    />
                                    {fieldUploading[field.key] && (
                                      <p className="text-sm text-gray-500 mt-2">Uploading...</p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">
                                      PDF, DOC, DOCX, or images — up to 25 MB
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : field.type === "select" && field.options && field.options.length > 0 ? (
                              <select
                                value={collectedData[field.key] || ""}
                                onChange={(e) => setCollectedData({ ...collectedData, [field.key]: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-purple focus:border-transparent bg-white"
                              >
                                <option value="">Select {field.label.toLowerCase()}...</option>
                                {field.options.filter((o) => o.trim()).map((option) => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={field.type || "text"}
                                value={collectedData[field.key] || ""}
                                onChange={(e) => setCollectedData({ ...collectedData, [field.key]: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                                placeholder={`Enter ${field.label.toLowerCase()}...`}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {mod.verificationType === "TEXT_RESPONSE" && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Your Response</label>
                        <textarea
                          value={textResponse}
                          onChange={(e) => setTextResponse(e.target.value)}
                          rows={4}
                          className="w-full border rounded-lg p-3 text-sm focus:ring-brand-purple focus:border-brand-purple"
                          placeholder="Enter your response..."
                        />
                      </div>
                    )}
                    {mod.verificationType === "FILE_UPLOAD" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Upload Required File</label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileUpload}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-navy file:text-white hover:file:bg-brand-purple"
                          disabled={fileUploading}
                        />
                        {fileUploading && <p className="text-sm text-gray-500 mt-2">Uploading...</p>}
                      </div>
                    )}
                  </div>
                );
              }

              // -- Content Block --
              const block = mod.contentBlocks.find((b) => b.id === sectionId);
              if (!block) return null;
              return (
                <div key={block.id} className="mb-6">
                  <UnifiedBlockRenderer
                    blocks={[block]}
                    moduleId={mod.id}
                    onBlockComplete={handleBlockComplete}
                    completedBlocks={completedBlocks}
                    blockProgress={blockProgressMap}
                  />
                </div>
              );
            });
          })()}

          {/* Collected Data Display (when completed) */}
          {isCompleted && progress?.collectedData && Object.keys(progress.collectedData).length > 0 && (
            <div className="mb-6 p-4 bg-white rounded-xl border">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Submitted Details</h4>
              <dl className="space-y-1">
                {Object.entries(progress.collectedData).map(([key, value]) => {
                  const fieldDef = mod.dataFields?.find((f) => f.key === key);
                  const isFileField = fieldDef?.type === "file" || (typeof value === "string" && (value.startsWith("/uploads/") || value.startsWith("/api/files/")));
                  return (
                    <div key={key} className="flex gap-2 text-sm">
                      <dt className="text-gray-500 font-medium">{fieldDef?.label || key}:</dt>
                      <dd className="text-gray-800">
                        {isFileField ? (
                          <a
                            href={value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-purple hover:underline"
                          >
                            View uploaded file
                          </a>
                        ) : (
                          value
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          )}

          {/* Pending Review */}
          {isPendingReview && (
            <div className="mb-6 p-5 bg-yellow-50 border border-yellow-200 rounded-xl">
              <h3 className="font-semibold text-yellow-700">Awaiting Review</h3>
              <p className="text-sm text-yellow-600 mt-1">
                Your submission is being reviewed by the STC team.
              </p>
            </div>
          )}

          {/* Success + Auto-advance */}
          {(isCompleted || showSuccess) && (
            <div className="mb-6 p-5 bg-green-50 border border-green-200 rounded-xl text-center">
              <h3 className="text-lg font-bold text-green-700">
                {mod.isMilestone ? "Milestone Achieved!" : "Module Complete!"}
              </h3>
              <p className="text-green-600 text-sm mt-1">
                Great work!
              </p>
              {showSuccess && navigation.nextModule && (
                <p className="text-xs text-green-500 mt-2 animate-pulse">
                  Moving to next task...
                </p>
              )}
              {progress?.completedAt && !showSuccess && (
                <p className="text-xs text-green-500 mt-2">
                  Completed {new Date(progress.completedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Previous Response / Upload */}
          {progress?.textResponse && isCompleted && (
            <div className="mb-6 p-4 bg-white rounded-xl border">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Your Response</h4>
              <p className="text-gray-800 text-sm whitespace-pre-wrap">{progress.textResponse}</p>
            </div>
          )}
          {progress?.fileUrl && isCompleted && (
            <div className="mb-6 p-4 bg-white rounded-xl border">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Uploaded File</h4>
              <a href={progress.fileUrl} target="_blank" rel="noopener noreferrer" className="text-brand-purple hover:underline text-sm">
                View uploaded file
              </a>
            </div>
          )}

          {/* ── Bottom Navigation Bar ─────────────────────────────────── */}
          <div className="mt-8 mb-4 grid grid-cols-3 gap-3">
            {/* Back Button */}
            {navigation.prevModule ? (
              <Link
                href={`/portal/learning/${programSlug}/${phaseSlug}/${navigation.prevModule.slug}`}
                className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:border-brand-navy hover:text-brand-navy transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate hidden sm:inline">{navigation.prevModule.title}</span>
                <span className="sm:hidden">Back</span>
              </Link>
            ) : (
              <Link
                href={`/portal/learning/${programSlug}`}
                className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:border-brand-navy hover:text-brand-navy transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Program</span>
              </Link>
            )}

            {/* Complete Button (center) */}
            {isCompleted ? (
              <div className="flex items-center justify-center gap-2 px-4 py-3 bg-green-50 border-2 border-green-300 text-green-700 rounded-xl text-sm font-semibold">
                <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
                <span>Completed</span>
              </div>
            ) : isPendingReview ? (
              <div className="flex items-center justify-center gap-2 px-4 py-3 bg-yellow-50 border-2 border-yellow-300 text-yellow-700 rounded-xl text-sm font-semibold">
                <ClockIcon className="h-5 w-5 flex-shrink-0" />
                <span>In Review</span>
              </div>
            ) : isFranchisorTask ? (
              <div className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-50 border-2 border-purple-300 text-purple-700 rounded-xl text-sm font-semibold">
                <span>STC Task</span>
              </div>
            ) : mod.verificationType === "FILE_UPLOAD" ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={fileUploading}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <CheckIcon className="h-5 w-5 flex-shrink-0" />
                <span>{fileUploading ? "Uploading..." : "Upload & Complete"}</span>
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={!canComplete || completing}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <CheckIcon className="h-5 w-5 flex-shrink-0" />
                <span>
                  {completing ? "Completing..." :
                   mod.verificationType === "FRANCHISOR_CONFIRMS" ? "Submit" :
                   "Mark Complete"}
                </span>
              </button>
            )}

            {/* Forward Button */}
            {navigation.nextModule ? (
              <Link
                href={`/portal/learning/${programSlug}/${phaseSlug}/${navigation.nextModule.slug}`}
                className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:border-brand-navy hover:text-brand-navy transition-colors"
              >
                <span className="truncate hidden sm:inline">{navigation.nextModule.title}</span>
                <span className="sm:hidden">Next</span>
                <ChevronRightIcon className="h-4 w-4 flex-shrink-0" />
              </Link>
            ) : (
              <Link
                href={`/portal/learning/${programSlug}`}
                className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:border-brand-navy hover:text-brand-navy transition-colors"
              >
                <span className="truncate">Overview</span>
                <ChevronRightIcon className="h-4 w-4 flex-shrink-0" />
              </Link>
            )}
          </div>
        </div>

        {/* ── Right column: All phases checklist (sticky) ────── */}
        <div className="mt-6 lg:mt-0 lg:w-72 xl:w-80 flex-shrink-0">
          <div className="lg:sticky lg:top-20 space-y-1 max-h-[calc(100vh-6rem)] overflow-y-auto">
            {(data.allPhases || [{ slug: phaseSlug, title: phase.title, isCurrent: true, modules: phaseModules }]).map((p) => {
              const phaseCompleted = p.modules.filter((m) => m.status === "COMPLETED").length;
              const phaseTotal = p.modules.length;
              return (
                <PhaseAccordion
                  key={p.slug}
                  phase={p}
                  phaseCompleted={phaseCompleted}
                  phaseTotal={phaseTotal}
                  programSlug={programSlug}
                  defaultOpen={p.isCurrent}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Resource Overlay */}
      {showResourceOverlay && data.resourcePage && (
        <ResourceOverlay
          pageId={data.resourcePage.id}
          hash={data.resourcePage.hash}
          onClose={() => setShowResourceOverlay(false)}
        />
      )}

      {/* Milestone Feedback Prompt */}
      {showFeedbackPrompt && (
        <MilestoneFeedbackPrompt
          milestoneTitle={mod.title}
          moduleId={moduleSlug}
          onDismiss={() => setShowFeedbackPrompt(false)}
        />
      )}

    </div>
  );
}
