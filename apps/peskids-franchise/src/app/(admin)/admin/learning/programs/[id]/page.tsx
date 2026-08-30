"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ProgramHeader from "@/components/admin/programs/ProgramHeader";
import CurriculumTab from "@/components/admin/programs/CurriculumTab";
import EnrollmentsTab from "@/components/admin/programs/EnrollmentsTab";
import PreviewOverlay from "@/components/admin/programs/PreviewOverlay";
import type { PhaseData } from "@/components/admin/curriculum-editor/types";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface ProgramDetail {
  id: string;
  name: string;
  description: string;
  programType: string;
  isActive: boolean;
  isDefault: boolean;
  moduleCount: number;
  enrollments: Array<{ id: string; status?: string }>;
  academyPhases: Array<{ id: string; title: string; _count: { modules: number } }>;
}

export default function ProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.id as string;

  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"curriculum" | "enrollments">("curriculum");
  const [showPreview, setShowPreview] = useState(false);
  const [previewPhases, setPreviewPhases] = useState<PhaseData[]>([]);

  const fetchProgram = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/bootcamp/programs/${programId}`);
      if (!res.ok) {
        router.push("/admin/learning/programs");
        return;
      }
      const data = await res.json();
      setProgram(data.program);
    } catch (error) {
      console.error("Failed to fetch program:", error);
    } finally {
      setLoading(false);
    }
  }, [programId, router]);

  useEffect(() => {
    fetchProgram();
  }, [fetchProgram]);

  const handleNameUpdate = async (name: string) => {
    const res = await fetch(`/api/admin/bootcamp/programs/${programId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setProgram((prev) => (prev ? { ...prev, name } : null));
    }
  };

  const handlePreview = async () => {
    try {
      const res = await fetch(`/api/admin/bootcamp/programs/${programId}/tree`);
      const data = await res.json();
      setPreviewPhases(data.program?.academyPhases || []);
      setShowPreview(true);
    } catch (error) {
      console.error("Failed to load preview data:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Program not found</p>
        <Link href="/admin/learning/programs" className="text-brand-purple hover:underline text-sm mt-2 inline-block">
          Back to Programs
        </Link>
      </div>
    );
  }

  const totalPhases = program.academyPhases?.length || 0;
  const totalModules = program.moduleCount || 0;
  const enrolledCount = program.enrollments?.length || 0;
  const completedCount = program.enrollments?.filter((e) => e.status === "COMPLETED").length || 0;

  return (
    <div className="space-y-4 min-w-0">
      {/* Back link */}
      <Link
        href="/admin/learning/programs"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-navy transition-colors"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        All Programs
      </Link>

      <ProgramHeader
        program={program}
        stats={{
          phases: totalPhases,
          modules: totalModules,
          enrolled: enrolledCount,
          completed: completedCount,
        }}
        onNameUpdate={handleNameUpdate}
        onPreview={handlePreview}
      />

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("curriculum")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "curriculum"
                ? "text-brand-navy border-b-2 border-brand-navy"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Curriculum
          </button>
          <button
            onClick={() => setActiveTab("enrollments")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "enrollments"
                ? "text-brand-navy border-b-2 border-brand-navy"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Enrollments
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "curriculum" && (
        <CurriculumTab
          programId={programId}
          programType={program.programType}
          onTreeUpdate={fetchProgram}
        />
      )}
      {activeTab === "enrollments" && (
        <EnrollmentsTab programId={programId} />
      )}

      {/* Preview overlay */}
      {showPreview && (
        <PreviewOverlay
          programName={program.name}
          programType={program.programType}
          phases={previewPhases}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
