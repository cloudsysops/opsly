export interface PipelineProspect {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  preferredTerritory: string | null;
  pipelineStage: string;
  prospectScore: number;
  preWorkStatus: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BoardColumn {
  id: string;
  label: string;
  primaryStage: string;
  includedStages: string[];
  color: string;
  textColor: string;
}

export const BOARD_COLUMNS: BoardColumn[] = [
  {
    id: "new-inquiry",
    label: "New Inquiry",
    primaryStage: "NEW_INQUIRY",
    includedStages: ["NEW_INQUIRY", "INITIAL_CONTACT"],
    color: "bg-brand-orange",
    textColor: "text-brand-orange",
  },
  {
    id: "discovery-call",
    label: "Discovery Call",
    primaryStage: "DISCOVERY_CALL",
    includedStages: ["DISCOVERY_CALL"],
    color: "bg-brand-purple",
    textColor: "text-brand-purple",
  },
  {
    id: "pre-work",
    label: "Pre-Work",
    primaryStage: "PRE_WORK_IN_PROGRESS",
    includedStages: ["PRE_WORK_IN_PROGRESS", "PRE_WORK_COMPLETE"],
    color: "bg-brand-cyan",
    textColor: "text-brand-cyan",
  },
  {
    id: "interview",
    label: "Interview",
    primaryStage: "INTERVIEW",
    includedStages: ["INTERVIEW"],
    color: "bg-brand-yellow",
    textColor: "text-yellow-600",
  },
  {
    id: "review",
    label: "Review",
    primaryStage: "SELECTION_REVIEW",
    includedStages: ["SELECTION_REVIEW"],
    color: "bg-brand-navy",
    textColor: "text-brand-navy",
  },
];

export const STALE_THRESHOLD_DAYS = 30;

export function getDaysInStage(updatedAt: string): number {
  return Math.floor(
    (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function getScoreBadgeClasses(score: number): string {
  if (score >= 80) return "bg-green-100 text-green-700";
  if (score >= 50) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

export function getColumnForStage(stage: string): BoardColumn | undefined {
  return BOARD_COLUMNS.find((col) => col.includedStages.includes(stage));
}

export function getMergedStageLabel(stage: string): string | null {
  if (stage === "INITIAL_CONTACT") return "Initial Contact";
  if (stage === "PRE_WORK_COMPLETE") return "Pre-Work Complete";
  return null;
}

export function getPreWorkBadgeClasses(status: string): string {
  if (status === "APPROVED") return "bg-green-100 text-green-700";
  if (status === "SUBMITTED") return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-600";
}
