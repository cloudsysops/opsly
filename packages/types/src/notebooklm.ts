import type { HermesEffort, HermesTask } from "./hermes.js";

export interface NotebookDocument {
  id: string;
  name: string;
  uploadedAt: string;
  size?: number;
  indexed: boolean;
}

export interface NotebookQueryResponse {
  answer: string;
  sources: string[];
  confidence: number;
  /** Embedding no expuesto por notebooklm-py en modo `ask`; reservado para futuro. */
  embedding?: number[];
  cached?: boolean;
  latency_ms?: number;
}

export interface EnrichedTask {
  task: HermesTask;
  notebooklm?: NotebookQueryResponse;
  localContext: string;
  relatedTasks: string[];
  suggestedApproach: string;
  patterns: string[];
}

export interface ArchitecturalDecisionStub {
  title: string;
  summary: string;
}

export interface DecisionContext {
  decision: ArchitecturalDecisionStub;
  precedents: string[];
  tradeoffs: string[];
  recommendations: string[];
}

export interface SuggestedApproach {
  approach: string;
  steps: string[];
  estimatedEffort: HermesEffort;
  relatedTasks: string[];
}

export interface CodeSnapshotEntry {
  file: string;
  language: string;
  content: string;
  summary?: string;
}
