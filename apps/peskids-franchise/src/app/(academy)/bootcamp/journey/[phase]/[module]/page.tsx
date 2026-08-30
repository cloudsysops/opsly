"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AcademyLayout from "@/components/academy/AcademyLayout";
import QuizModule from "@/components/academy/QuizModule";
import VideoModule from "@/components/academy/VideoModule";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  SparklesIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface QuizData {
  questions: QuizQuestion[];
  passingScore: number;
}

interface ModuleData {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  duration: number;
  points: number;
  moduleType: string;
  resourceUrl?: string;
  quizData?: QuizData;
  phase: {
    id: string;
    slug: string;
    title: string;
  };
  progress: {
    status: string;
    completedAt: string | null;
    score: number | null;
  };
}

export default function ModulePage({
  params,
}: {
  params: Promise<{ phase: string; module: string }>;
}) {
  const { phase: phaseSlug, module: moduleSlug } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState<ModuleData | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    fetchModule();
  }, [moduleSlug]);

  const fetchModule = async () => {
    try {
      const response = await fetch(`/api/bootcamp/modules/${moduleSlug}`);
      if (response.ok) {
        const data = await response.json();
        setModule(data);

        // Mark as in progress if not started
        if (data.progress.status === "NOT_STARTED") {
          fetch(`/api/bootcamp/modules/${moduleSlug}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "start" }),
          });
        }
      } else {
        router.push("/bootcamp/journey");
      }
    } catch (error) {
      console.error("Error fetching module:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!module || completing) return;

    setCompleting(true);
    try {
      const response = await fetch(`/api/bootcamp/modules/${module.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });

      if (response.ok) {
        setModule({
          ...module,
          progress: {
            ...module.progress,
            status: "COMPLETED",
            completedAt: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      console.error("Error completing module:", error);
    } finally {
      setCompleting(false);
    }
  };

  const handleQuizComplete = async (score: number, passed: boolean) => {
    if (!module) return;

    try {
      const response = await fetch(`/api/bootcamp/modules/${module.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "quiz_complete", score }),
      });

      if (response.ok) {
        setModule({
          ...module,
          progress: {
            ...module.progress,
            status: "COMPLETED",
            completedAt: new Date().toISOString(),
            score,
          },
        });
      }
    } catch (error) {
      console.error("Error completing quiz:", error);
    }
  };

  if (loading) {
    return (
      <AcademyLayout progress={0}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-navy/20 border-t-brand-navy" />
            <p className="text-slate-500 font-medium">Loading Module...</p>
          </div>
        </div>
      </AcademyLayout>
    );
  }

  if (!module) {
    return (
      <AcademyLayout progress={0}>
        <div className="text-center py-12">
          <p className="text-slate-500">Module not found</p>
          <Link
            href="/bootcamp/journey"
            className="text-brand-navy hover:underline mt-2 inline-block"
          >
            Return to Journey
          </Link>
        </div>
      </AcademyLayout>
    );
  }

  const isCompleted = module.progress.status === "COMPLETED";

  return (
    <AcademyLayout progress={0}>
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/bootcamp/journey"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-brand-navy transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Journey
          </Link>
        </div>

        {/* Module Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div>
              <p className="text-xs sm:text-sm text-[#6A469D] font-medium mb-1">
                {module.phase.title}
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {module.title}
              </h1>
            </div>
            {isCompleted && (
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs sm:text-sm font-medium self-start">
                <CheckCircleSolid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Completed
              </div>
            )}
          </div>

          <p className="text-sm sm:text-base text-slate-600 mb-3 sm:mb-4">{module.description}</p>

          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <ClockIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {module.duration} min read
            </span>
            <span className="flex items-center gap-1">
              <SparklesIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {module.points} points
            </span>
          </div>

          {/* Resource Link (for non-video modules) */}
          {module.moduleType !== "VIDEO" && module.resourceUrl && (
            <a
              href={module.resourceUrl}
              target={module.resourceUrl.startsWith("/") ? undefined : "_blank"}
              rel={module.resourceUrl.startsWith("/") ? undefined : "noopener noreferrer"}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-brand-navy/5 border border-brand-navy/20 text-brand-navy rounded-lg hover:bg-brand-navy/10 transition-colors text-sm font-medium"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              View Resource
            </a>
          )}
        </div>

        {/* Module Content - for reading modules (not video or quiz) */}
        {module.moduleType !== "QUIZ" && module.moduleType !== "VIDEO" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6">
            <div
              className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-h2:text-xl prose-h3:text-lg prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-900"
              dangerouslySetInnerHTML={{ __html: module.content }}
            />
          </div>
        )}

        {/* Video Module */}
        {module.moduleType === "VIDEO" && module.resourceUrl && (
          <>
            {/* Show content/instructions before video if available */}
            {module.content && module.content.trim() !== "" && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6">
                <div
                  className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-h2:text-xl prose-h3:text-lg prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-900"
                  dangerouslySetInnerHTML={{ __html: module.content }}
                />
              </div>
            )}
            <VideoModule
              resourceUrl={module.resourceUrl}
              moduleTitle={module.title}
              points={module.points}
              onComplete={handleComplete}
              isCompleted={isCompleted}
            />
          </>
        )}

        {/* Quiz Module */}
        {module.moduleType === "QUIZ" && module.quizData && (
          <>
            {/* Show content/instructions before quiz if available */}
            {module.content && module.content.trim() !== "" && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6">
                <div
                  className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-h2:text-xl prose-h3:text-lg prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-900"
                  dangerouslySetInnerHTML={{ __html: module.content }}
                />
              </div>
            )}
            <QuizModule
              quizData={module.quizData}
              moduleTitle={module.title}
              points={module.points}
              onComplete={handleQuizComplete}
              isCompleted={isCompleted}
              previousScore={module.progress.score}
            />
          </>
        )}

        {/* Completion Section (for reading modules only - quiz and video have their own UI) */}
        {module.moduleType !== "QUIZ" && module.moduleType !== "VIDEO" && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
            {isCompleted ? (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-emerald-100 mb-3 sm:mb-4">
                  <CheckCircleSolid className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-500" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1 sm:mb-2">
                  Module Completed!
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mb-3 sm:mb-4">
                  You earned {module.points} points for completing this module.
                </p>
                <Link
                  href="/bootcamp/journey"
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-brand-navy text-white rounded-lg hover:bg-[#3a3c9e] transition-colors text-xs sm:text-sm font-medium"
                >
                  Continue Journey
                  <ArrowRightIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Link>
              </div>
            ) : (
              <div className="text-center">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1 sm:mb-2">
                  Ready to complete this module?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mb-3 sm:mb-4">
                  Mark this module as complete to earn {module.points} points and
                  continue your journey.
                </p>
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-brand-navy text-white rounded-lg hover:bg-[#3a3c9e] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {completing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      Mark as Complete
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AcademyLayout>
  );
}
