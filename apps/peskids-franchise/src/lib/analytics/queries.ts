import { db } from "@/lib/db";
import { PipelineStage } from "@prisma/client";

// Pipeline stage order for calculations
export const PIPELINE_ORDER: PipelineStage[] = [
  "NEW_INQUIRY",
  "INITIAL_CONTACT",
  "DISCOVERY_CALL",
  "PRE_WORK_IN_PROGRESS",
  "PRE_WORK_COMPLETE",
  "INTERVIEW",
  "SELECTION_REVIEW",
  "SELECTED",
];

export const STAGE_LABELS: Record<string, string> = {
  NEW_INQUIRY: "New Inquiry",
  INITIAL_CONTACT: "Initial Contact",
  DISCOVERY_CALL: "Discovery Call",
  PRE_WORK_IN_PROGRESS: "Pre-Work Started",
  PRE_WORK_COMPLETE: "Pre-Work Done",
  INTERVIEW: "Interview",
  SELECTION_REVIEW: "Review",
  SELECTED: "Selected",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Get time series data for new inquiries and conversions
 */
export async function getTimeSeriesData(dateRange: DateRange) {
  const prospects = await db.prospect.findMany({
    where: {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    },
    select: {
      createdAt: true,
      pipelineStage: true,
    },
  });

  // Group by week
  const weeklyData = new Map<string, { inquiries: number; conversions: number }>();

  prospects.forEach((prospect) => {
    const weekStart = getWeekStart(prospect.createdAt);
    const weekKey = formatWeek(weekStart);

    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, { inquiries: 0, conversions: 0 });
    }

    const data = weeklyData.get(weekKey)!;
    data.inquiries++;

    // Count as conversion if reached at least Discovery Call
    const stageIndex = PIPELINE_ORDER.indexOf(prospect.pipelineStage as PipelineStage);
    if (stageIndex >= 2) {
      data.conversions++;
    }
  });

  // Convert to array and sort by date
  return Array.from(weeklyData.entries())
    .map(([date, data]) => ({
      date,
      ...data,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get average time spent in each pipeline stage
 */
export async function getTimeInStageData(dateRange: DateRange) {
  const activities = await db.prospectActivity.findMany({
    where: {
      activityType: "STAGE_CHANGED",
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    },
    select: {
      prospectId: true,
      createdAt: true,
      metadata: true,
    },
    orderBy: [{ prospectId: "asc" }, { createdAt: "asc" }],
  });

  // Group activities by prospect
  const prospectActivities = new Map<string, Array<{ date: Date; stage: string }>>();

  activities.forEach((activity) => {
    if (!prospectActivities.has(activity.prospectId)) {
      prospectActivities.set(activity.prospectId, []);
    }

    const metadata = activity.metadata as { newStage?: string } | null;
    if (metadata?.newStage) {
      prospectActivities.get(activity.prospectId)!.push({
        date: activity.createdAt,
        stage: metadata.newStage,
      });
    }
  });

  // Calculate average time in each stage
  const stageTimes = new Map<string, number[]>();

  prospectActivities.forEach((activities) => {
    for (let i = 0; i < activities.length - 1; i++) {
      const current = activities[i];
      const next = activities[i + 1];
      const daysInStage =
        (next.date.getTime() - current.date.getTime()) / (1000 * 60 * 60 * 24);

      if (!stageTimes.has(current.stage)) {
        stageTimes.set(current.stage, []);
      }
      stageTimes.get(current.stage)!.push(daysInStage);
    }
  });

  // Calculate averages
  return PIPELINE_ORDER.slice(0, -1).map((stage) => {
    const times = stageTimes.get(stage) || [];
    const avgDays = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

    return {
      stage,
      label: STAGE_LABELS[stage],
      avgDays: Math.round(avgDays * 10) / 10, // Round to 1 decimal
    };
  });
}

/**
 * Get cohort analysis data
 */
export async function getCohortData(dateRange: DateRange) {
  const prospects = await db.prospect.findMany({
    where: {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    },
    select: {
      createdAt: true,
      pipelineStage: true,
    },
  });

  // Group by month
  const monthlyData = new Map<
    string,
    {
      totalInquiries: number;
      toInitialContact: number;
      toDiscoveryCall: number;
      toPreWork: number;
      toSelected: number;
    }
  >();

  prospects.forEach((prospect) => {
    const monthKey = formatMonth(prospect.createdAt);

    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, {
        totalInquiries: 0,
        toInitialContact: 0,
        toDiscoveryCall: 0,
        toPreWork: 0,
        toSelected: 0,
      });
    }

    const data = monthlyData.get(monthKey)!;
    data.totalInquiries++;

    const stageIndex = PIPELINE_ORDER.indexOf(prospect.pipelineStage as PipelineStage);

    // Check if reached each stage
    if (stageIndex >= 1) data.toInitialContact++;
    if (stageIndex >= 2) data.toDiscoveryCall++;
    if (stageIndex >= 3) data.toPreWork++;
    if (stageIndex >= 7) data.toSelected++; // SELECTED is index 7
  });

  // Convert to array and sort by date
  return Array.from(monthlyData.entries())
    .map(([period, data]) => ({
      period,
      ...data,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Export prospects to CSV format
 */
export async function exportProspectsToCSV(dateRange: DateRange) {
  const prospects = await db.prospect.findMany({
    where: {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    },
    include: {
      preWorkSubmissions: {
        include: {
          module: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "First Name",
    "Last Name",
    "Email",
    "Phone",
    "Pipeline Stage",
    "Score",
    "Interest Level",
    "Liquidity",
    "Preferred Territory",
    "Pre-Work Status",
    "Created Date",
    "Last Contact",
    "Assigned To",
    "UTM Source",
    "UTM Medium",
    "UTM Campaign",
    "Pre-Work Modules Completed",
  ];

  const rows = prospects.map((p) => {
    const completedModules = p.preWorkSubmissions
      .filter((s) => ["SUBMITTED", "APPROVED"].includes(s.status))
      .map((s) => s.module.title)
      .join("; ");

    return [
      p.firstName,
      p.lastName,
      p.email,
      p.phone || "",
      p.pipelineStage,
      p.prospectScore,
      p.interestLevel,
      p.liquidity || "",
      p.preferredTerritory || "",
      p.preWorkStatus,
      formatDateForCSV(p.createdAt),
      p.lastContactAt ? formatDateForCSV(p.lastContactAt) : "",
      p.assignedTo || "",
      p.utmSource || "",
      p.utmMedium || "",
      p.utmCampaign || "",
      completedModules,
    ];
  });

  // Build CSV string
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  return csvContent;
}

// Helper functions
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

function formatWeek(date: Date): string {
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  return `${month} ${day}`;
}

function formatMonth(date: Date): string {
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function formatDateForCSV(date: Date): string {
  return date.toISOString().split("T")[0];
}
