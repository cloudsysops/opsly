import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import Link from "next/link";
import { PreWorkForm } from "@/components/prospect/PreWorkForm";

export const dynamic = 'force-dynamic';

async function getModuleData(slug: string, prospectId: string) {
  const module = await db.preWorkModule.findUnique({
    where: { slug },
  });

  if (!module) return null;

  const submission = await db.preWorkSubmission.findUnique({
    where: {
      prospectId_moduleId: {
        prospectId,
        moduleId: module.id,
      },
    },
  });

  return { module, submission };
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const session = await auth();
  const { module: moduleSlug } = await params;
  const data = await getModuleData(moduleSlug, session!.user.id);

  if (!data) {
    notFound();
  }

  const { module, submission } = data;

  const isReadOnly =
    submission?.status === "SUBMITTED" ||
    submission?.status === "APPROVED" ||
    submission?.status === "UNDER_REVIEW";

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <Link
          href="/portal/pre-work"
          className="text-sm text-brand-purple hover:underline mb-2 inline-block"
        >
          ← Back to Pre-Work
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">{module.title}</h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600">{module.description}</p>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">
            Instructions
          </h2>
        </CardHeader>
        <CardContent>
          <div
            className="prose prose-sm max-w-none text-gray-600"
            dangerouslySetInnerHTML={{ __html: module.instructions }}
          />
        </CardContent>
      </Card>

      {/* Status Banner */}
      {submission && (
        <div
          className={`p-4 rounded-lg ${
            submission.status === "APPROVED"
              ? "bg-brand-green/10 text-brand-green"
              : submission.status === "NEEDS_REVISION"
              ? "bg-brand-orange/10 text-brand-orange"
              : submission.status === "SUBMITTED" ||
                submission.status === "UNDER_REVIEW"
              ? "bg-brand-cyan/10 text-brand-cyan"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          <div className="flex items-center gap-2">
            {submission.status === "APPROVED" && (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-medium">
                  This module has been approved!
                </span>
              </>
            )}
            {submission.status === "SUBMITTED" && (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-medium">
                  Your submission is pending review.
                </span>
              </>
            )}
            {submission.status === "NEEDS_REVISION" && (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
                <span className="font-medium">
                  Please review the feedback and resubmit.
                </span>
              </>
            )}
          </div>
          {submission.reviewNotes && (
            <p className="mt-2 text-sm opacity-80">{submission.reviewNotes}</p>
          )}
          {submission.score && (
            <p className="mt-2 text-sm">Score: {submission.score}/10</p>
          )}
        </div>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">
            Your Submission
          </h2>
        </CardHeader>
        <CardContent>
          <PreWorkForm
            moduleId={module.id}
            moduleSlug={module.slug}
            submissionType={module.submissionType}
            formSchema={module.formSchema as Record<string, unknown> | null}
            existingContent={submission?.content as Record<string, unknown> | null}
            isReadOnly={isReadOnly}
            status={submission?.status || null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
