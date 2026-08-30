import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

// ─── Pipeline Stage Config ────────────────────────────────────────────────────

interface StageConfig {
  label: string;
  shortLabel: string;
  title: string;
  message: string;
  nextAction?: { label: string; href: string; description: string };
  tip?: string;
}

const pipelineStages: string[] = [
  "NEW_INQUIRY",
  "INITIAL_CONTACT",
  "DISCOVERY_CALL",
  "PRE_WORK_IN_PROGRESS",
  "PRE_WORK_COMPLETE",
  "INTERVIEW",
  "SELECTION_REVIEW",
  "SELECTED",
];

const stageConfigs: Record<string, StageConfig> = {
  NEW_INQUIRY: {
    label: "New Inquiry",
    shortLabel: "Inquiry",
    title: "Welcome to Acme Franchise!",
    message:
      "Thank you for your interest in owning an Acme Franchise. Our team is reviewing your inquiry and will reach out within 24-48 hours to schedule a discovery call.",
    tip: "While you wait, explore our website to learn more about the Acme Franchise model and success stories.",
  },
  INITIAL_CONTACT: {
    label: "Initial Contact",
    shortLabel: "Contact",
    title: "We're Getting in Touch",
    message:
      "Our franchising team has reviewed your inquiry and will be reaching out shortly. Keep an eye on your email and phone for our call.",
    tip: "Prepare questions about territories, investment, and the franchise model — we love thorough candidates!",
  },
  DISCOVERY_CALL: {
    label: "Discovery Call",
    shortLabel: "Discovery",
    title: "Discovery Call Scheduled",
    message:
      "You have a discovery call scheduled with our team. This is your chance to learn about the franchise opportunity and see if Acme Franchise is the right fit for you.",
    tip: "Come prepared with questions about your target market, investment expectations, and what day-to-day operations look like.",
  },
  PRE_WORK_IN_PROGRESS: {
    label: "Pre-Work",
    shortLabel: "Pre-Work",
    title: "Pre-Work in Progress",
    message:
      "You've been invited to complete our franchise pre-work modules. These help us evaluate your commitment and prepare you for a successful launch.",
    nextAction: {
      label: "Continue Pre-Work",
      href: "/portal/pre-work",
      description: "Complete all 5 modules to move to the interview stage",
    },
    tip: "The School Outreach Tracker (Module 3) is the most important — it proves you can connect with schools in your area.",
  },
  PRE_WORK_COMPLETE: {
    label: "Pre-Work Complete",
    shortLabel: "Complete",
    title: "Pre-Work Complete!",
    message:
      "Congratulations on finishing all 5 pre-work modules! Our team is reviewing your submissions. We'll be in touch to schedule your interview.",
    tip: "Review your submissions while you wait — strong candidates often refine their answers before the interview.",
  },
  INTERVIEW: {
    label: "Interview",
    shortLabel: "Interview",
    title: "Interview Stage",
    message:
      "You've advanced to the interview stage — this is a significant milestone. Our selection committee wants to meet you and discuss your franchise plans.",
    tip: "Be ready to discuss your territory research, school outreach results, and your 90-day launch plan in detail.",
  },
  SELECTION_REVIEW: {
    label: "Selection Review",
    shortLabel: "Review",
    title: "Under Review",
    message:
      "Your interview went great! Our selection committee is reviewing your candidacy. This process typically takes 5-7 business days.",
    tip: "No news is not bad news — our committee is thorough because we want to set every franchisee up for success.",
  },
  SELECTED: {
    label: "Selected",
    shortLabel: "Selected",
    title: "Congratulations — You're In!",
    message:
      "You've been selected to join the Acme Franchise family! Head to your franchisee dashboard to begin your 90-day journey.",
    nextAction: {
      label: "Go to Dashboard",
      href: "/portal/my-franchise",
      description: "Start your franchise onboarding journey",
    },
  },
};

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function getProspectData(prospectId: string) {
  const prospect = await db.prospect.findUnique({
    where: { id: prospectId },
    include: {
      preWorkSubmissions: {
        include: { module: true },
      },
      documents: true,
    },
  });

  const modules = await db.preWorkModule.findMany({
    orderBy: { sequence: "asc" },
  });

  return { prospect, modules };
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function PortalDashboard() {
  const session = await auth();
  const { prospect, modules } = await getProspectData(session!.user.id);

  // SELECTED franchisees should go to the full KPI dashboard
  if (prospect?.pipelineStage === "SELECTED") {
    redirect("/portal/my-franchise");
  }

  if (!prospect) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-xl font-display font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Unable to find your prospect profile.</p>
        </div>
      </div>
    );
  }

  const stage = prospect.pipelineStage;
  const config = stageConfigs[stage] || stageConfigs.NEW_INQUIRY;
  const stageIndex = pipelineStages.indexOf(stage);

  const completedModules = prospect.preWorkSubmissions.filter(
    (s) => s.status === "SUBMITTED" || s.status === "APPROVED"
  ).length;

  const showPreWork = [
    "PRE_WORK_IN_PROGRESS",
    "PRE_WORK_COMPLETE",
    "INTERVIEW",
    "SELECTION_REVIEW",
    "SELECTED",
  ].includes(stage);

  const preWorkPercent = modules.length > 0 ? Math.round((completedModules / modules.length) * 100) : 0;

  // Simplified pipeline stages for the visual tracker (group similar stages)
  const trackerSteps = [
    { key: "inquiry", label: "Inquiry", stages: ["NEW_INQUIRY", "INITIAL_CONTACT"] },
    { key: "discovery", label: "Discovery", stages: ["DISCOVERY_CALL"] },
    { key: "prework", label: "Pre-Work", stages: ["PRE_WORK_IN_PROGRESS", "PRE_WORK_COMPLETE"] },
    { key: "interview", label: "Interview", stages: ["INTERVIEW", "SELECTION_REVIEW"] },
    { key: "selected", label: "Selected", stages: ["SELECTED"] },
  ];

  const activeStepIndex = trackerSteps.findIndex((step) => step.stages.includes(stage));

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 space-y-8 pb-12">

      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl px-6 py-4 sm:px-8 sm:py-5"
        style={{ background: "linear-gradient(135deg, #2D2F8E 0%, #6A469D 50%, #50C8DF 100%)" }}
      >
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="dots" width="8" height="8" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="1" fill="white" />
            </pattern>
            <rect width="100" height="100" fill="url(#dots)" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-white/70 font-body text-xs">
              Welcome back,
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-white leading-tight">
              {prospect.firstName}!
            </h1>
            <h2 className="text-sm sm:text-base font-display font-semibold text-brand-cyan mt-0.5">
              {config.title}
            </h2>
            <p className="text-white/80 font-body text-sm max-w-xl mt-1 leading-snug">
              {config.message}
            </p>
          </div>

          {/* Primary CTA */}
          {config.nextAction && (
            <Link
              href={config.nextAction.href}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-brand-navy rounded-lg font-display font-semibold text-sm hover:bg-white/90 transition-all shadow-md hover:shadow-lg shrink-0"
            >
              {config.nextAction.label}
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          )}
        </div>
      </div>

      {/* ── Pipeline Progress Tracker ────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
        <h3 className="font-display text-lg font-semibold text-gray-900 mb-6">Your Journey</h3>

        {/* Desktop tracker */}
        <div className="hidden sm:block">
          <div className="flex items-center justify-between relative">
            {/* Connecting line */}
            <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-gray-200" />
            <div
              className="absolute top-5 left-[10%] h-0.5 bg-gradient-to-r from-brand-green to-brand-cyan transition-all duration-700"
              style={{ width: `${Math.max(0, (activeStepIndex / (trackerSteps.length - 1)) * 80)}%` }}
            />

            {trackerSteps.map((step, i) => {
              const isComplete = i < activeStepIndex;
              const isCurrent = i === activeStepIndex;
              const isFuture = i > activeStepIndex;

              return (
                <div key={step.key} className="relative flex flex-col items-center z-10" style={{ width: "20%" }}>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      isComplete
                        ? "bg-brand-green border-brand-green text-white"
                        : isCurrent
                        ? "bg-white border-brand-cyan text-brand-navy shadow-lg ring-4 ring-brand-cyan/20"
                        : "bg-white border-gray-200 text-gray-400"
                    }`}
                  >
                    {isComplete ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <span className="text-sm font-bold">{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium text-center ${
                      isCurrent ? "text-brand-navy font-semibold" : isComplete ? "text-brand-green" : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                  {isCurrent && (
                    <span className="mt-1 text-[10px] font-semibold text-brand-cyan uppercase tracking-wide">
                      You are here
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile tracker (vertical) */}
        <div className="sm:hidden space-y-0">
          {trackerSteps.map((step, i) => {
            const isComplete = i < activeStepIndex;
            const isCurrent = i === activeStepIndex;
            const isLast = i === trackerSteps.length - 1;

            return (
              <div key={step.key} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${
                      isComplete
                        ? "bg-brand-green border-brand-green text-white"
                        : isCurrent
                        ? "bg-white border-brand-cyan text-brand-navy shadow-md ring-4 ring-brand-cyan/20"
                        : "bg-white border-gray-200 text-gray-400"
                    }`}
                  >
                    {isComplete ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <span className="text-xs font-bold">{i + 1}</span>
                    )}
                  </div>
                  {!isLast && (
                    <div className={`w-0.5 h-6 ${isComplete ? "bg-brand-green" : "bg-gray-200"}`} />
                  )}
                </div>
                <div className="pb-6">
                  <span
                    className={`text-sm font-medium ${
                      isCurrent ? "text-brand-navy font-semibold" : isComplete ? "text-brand-green" : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                  {isCurrent && (
                    <span className="ml-2 text-[10px] font-semibold text-brand-cyan uppercase tracking-wide">
                      Current
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pro tip */}
        {config.tip && (
          <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="p-1.5 rounded-lg bg-amber-100 flex-shrink-0">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-800 mb-0.5">Pro Tip</p>
              <p className="text-sm text-amber-700">{config.tip}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Pre-Work Modules ─────────────────────────────────────────── */}
      {showPreWork && modules.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 sm:px-8 py-6 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-brand-navy/10">
                  <svg className="w-5 h-5 text-brand-navy" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                </div>
                <h3 className="font-display text-lg font-semibold text-gray-900">Pre-Work Modules</h3>
              </div>
              <span className="text-sm font-body text-gray-500">
                {completedModules} of {modules.length} completed
              </span>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${preWorkPercent}%`,
                    background: preWorkPercent === 100
                      ? "#34B256"
                      : "linear-gradient(90deg, #50C8DF 0%, #34B256 100%)",
                  }}
                />
              </div>
              <span className="text-sm font-display font-bold text-gray-700 min-w-[3ch]">{preWorkPercent}%</span>
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {modules.map((module, index) => {
              const submission = prospect.preWorkSubmissions.find(
                (s) => s.moduleId === module.id
              );
              const isComplete = submission?.status === "SUBMITTED" || submission?.status === "APPROVED";
              const isInProgress = submission?.status === "DRAFT";

              return (
                <Link
                  key={module.id}
                  href={`/portal/pre-work/${module.slug}`}
                  className="flex items-center gap-4 px-6 sm:px-8 py-5 hover:bg-gray-50 transition-colors group"
                >
                  {/* Status indicator */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      isComplete
                        ? "bg-brand-green text-white"
                        : isInProgress
                        ? "bg-brand-cyan/20 text-brand-cyan border-2 border-brand-cyan"
                        : "bg-gray-100 text-gray-400 group-hover:bg-gray-200"
                    }`}
                  >
                    {isComplete ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <span className="font-display font-bold text-sm">{index + 1}</span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-display font-semibold text-gray-900 text-sm sm:text-base group-hover:text-brand-navy transition-colors">
                      {module.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-500 truncate mt-0.5">
                      {module.description}
                    </p>
                  </div>

                  {/* Status badge */}
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {isComplete ? (
                      <span className="px-3 py-1 text-xs font-semibold text-brand-green bg-green-50 rounded-full">
                        Complete
                      </span>
                    ) : isInProgress ? (
                      <span className="px-3 py-1 text-xs font-semibold text-brand-cyan bg-cyan-50 rounded-full">
                        In Progress
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-xs font-medium text-gray-400 bg-gray-50 rounded-full">
                        Not Started
                      </span>
                    )}
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-brand-navy transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="px-6 sm:px-8 py-4 bg-gray-50 border-t border-gray-100">
            <Link
              href="/portal/pre-work"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-navy hover:text-brand-purple transition-colors"
            >
              View All Pre-Work
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      )}

      {/* ── Quick Links ──────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/portal/documents"
          className="group bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl hover:border-brand-cyan/30 transition-all"
        >
          <div className="p-2.5 rounded-xl bg-blue-100 w-fit mb-4 group-hover:bg-blue-200 transition-colors">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="font-display font-semibold text-gray-900 mb-1">Documents</h3>
          <p className="text-sm text-gray-500">Review and acknowledge important franchise documents.</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-purple group-hover:text-brand-navy transition-colors">
            View Documents
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </span>
        </Link>

        <Link
          href="/portal/status"
          className="group bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl hover:border-brand-cyan/30 transition-all"
        >
          <div className="p-2.5 rounded-xl bg-purple-100 w-fit mb-4 group-hover:bg-purple-200 transition-colors">
            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <h3 className="font-display font-semibold text-gray-900 mb-1">Your Status</h3>
          <p className="text-sm text-gray-500">Track your progress through the selection process.</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-purple group-hover:text-brand-navy transition-colors">
            View Status
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </span>
        </Link>

        <Link
          href="mailto:franchising@acmefranchise.com"
          className="group bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl hover:border-brand-cyan/30 transition-all"
        >
          <div className="p-2.5 rounded-xl bg-green-100 w-fit mb-4 group-hover:bg-green-200 transition-colors">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="font-display font-semibold text-gray-900 mb-1">Need Help?</h3>
          <p className="text-sm text-gray-500">Questions about the process? Our team is here to help.</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-purple group-hover:text-brand-navy transition-colors">
            Contact Us
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </span>
        </Link>
      </div>

      {/* ── What to Expect ───────────────────────────────────────────── */}
      {stageIndex < 4 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
          <h3 className="font-display text-lg font-semibold text-gray-900 mb-5">What to Expect</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50">
              <div className="p-2 rounded-lg bg-blue-100 flex-shrink-0">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Discovery Call</p>
                <p className="text-xs text-gray-500 mt-0.5">30-minute call to learn about the opportunity and your goals.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50">
              <div className="p-2 rounded-lg bg-purple-100 flex-shrink-0">
                <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">5 Pre-Work Modules</p>
                <p className="text-xs text-gray-500 mt-0.5">Territory research, school outreach, and a 90-day launch plan.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50">
              <div className="p-2 rounded-lg bg-amber-100 flex-shrink-0">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Interview</p>
                <p className="text-xs text-gray-500 mt-0.5">Meet the selection committee and discuss your franchise plans.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50">
              <div className="p-2 rounded-lg bg-green-100 flex-shrink-0">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Selection & Launch</p>
                <p className="text-xs text-gray-500 mt-0.5">Join the franchise family and start your 90-day onboarding journey.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
