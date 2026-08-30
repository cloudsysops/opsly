export type BlockType =
  | "TEXT"
  | "VIDEO"
  | "IMAGE"
  | "FILE"
  | "CALLOUT"
  | "CHECKPOINT"
  | "QUIZ"
  | "CHECKLIST";

export interface ContentBlockData {
  id: string;
  moduleId: string;
  type: BlockType;
  order: number;
  content?: string | null;
  videoUrl?: string | null;
  videoProvider?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageCaption?: string | null;
  fileUrl?: string | null;
  fileTitle?: string | null;
  fileDescription?: string | null;
  calloutType?: string | null;
  calloutTitle?: string | null;
  calloutContent?: string | null;
  checkpointText?: string | null;
  quizQuestion?: string | null;
  quizOptions?: string[] | null;
  correctAnswer?: number | null;
  quizExplanation?: string | null;
  checklistTitle?: string | null;
  checklistItems?: ChecklistItem[] | null;
}

export interface ChecklistItem {
  title: string;
  description?: string;
  helpLink?: string;
  dueDay?: number;
  points?: number;
}

export interface ModuleData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  moduleType: string;
  order: number;
  points: number | null;
  duration: number | null;
  resourceUrl: string | null;
  owner: string | null;
  verificationType: string | null;
  targetDay: number | null;
  isMilestone: boolean;
  notifyFranchisor: boolean;
  franchisorActionText: string | null;
  richDescription: string | null;
  stepWhat: string | null;
  stepHow: string | null;
  stepWhy: string | null;
  dataFields: Array<{ key: string; label: string; type: string; required: boolean }> | null;
  resourcePageId: string | null;
  sectionOrder: string[] | null;
  completionEmailTemplateId: string | null;
  contentBlocks: ContentBlockData[];
  _count?: { contentBlocks: number };
}

export interface PhaseData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  order: number;
  dayStart: number | null;
  dayEnd: number | null;
  imageUrl: string | null;
  modules: ModuleData[];
}

export interface ProgramData {
  id: string;
  slug: string;
  name: string;
  description: string;
  programType: string;
  isActive: boolean;
  isDefault: boolean;
  academyPhases: PhaseData[];
}

export type SelectedItem =
  | { type: "phase"; id: string }
  | { type: "module"; id: string; phaseId: string }
  | null;
