// Condition Evaluator for Visual Workflow Builder
// Evaluates WorkflowCondition nodes against Prospect data during graph traversal

import type { WorkflowCondition, Prospect } from "@prisma/client";

// ============================================
// FIELD VALUE RESOLVER
// ============================================

/**
 * Maps a condition field name to the corresponding value from the prospect record.
 * Returns null for unknown fields.
 */
export function getFieldValue(
  field: string,
  prospect: Prospect
): string | number | null {
  switch (field) {
    case "prospectScore":
      return prospect.prospectScore;
    case "pipelineStage":
      return prospect.pipelineStage;
    case "preferredTerritory":
      return prospect.preferredTerritory ?? null;
    case "interestLevel":
      return prospect.interestLevel;
    case "liquidity":
      return prospect.liquidity ?? null;
    case "preWorkStatus":
      return prospect.preWorkStatus;
    case "daysSinceLastContact": {
      if (!prospect.lastContactAt) return 999;
      const now = new Date();
      const last = new Date(prospect.lastContactAt);
      const diffMs = now.getTime() - last.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }
    default:
      console.warn(
        `[conditions] Unknown field "${field}" — returning null`
      );
      return null;
  }
}

// ============================================
// CONDITION EVALUATOR
// ============================================

/**
 * Evaluates a single WorkflowCondition against a Prospect.
 * Returns true if the condition is satisfied, false otherwise.
 */
export function evaluateCondition(
  condition: WorkflowCondition,
  prospect: Prospect
): boolean {
  const fieldValue = getFieldValue(condition.field, prospect);

  if (fieldValue === null || fieldValue === undefined) {
    return false;
  }

  const { operator, value } = condition;

  switch (operator) {
    case "gt":
      return Number(fieldValue) > Number(value);
    case "lt":
      return Number(fieldValue) < Number(value);
    case "gte":
      return Number(fieldValue) >= Number(value);
    case "lte":
      return Number(fieldValue) <= Number(value);
    case "eq":
      return String(fieldValue) === String(value);
    case "neq":
      return String(fieldValue) !== String(value);
    case "in": {
      try {
        const options = JSON.parse(value) as string[];
        return options.includes(String(fieldValue));
      } catch {
        console.warn(
          `[conditions] Failed to parse "in" value as JSON array: ${value}`
        );
        return false;
      }
    }
    case "contains":
      return String(fieldValue)
        .toLowerCase()
        .includes(String(value).toLowerCase());
    default:
      console.warn(
        `[conditions] Unknown operator "${operator}" — returning false`
      );
      return false;
  }
}

// ============================================
// CONDITION FIELD DEFINITIONS
// ============================================

export interface ConditionFieldDef {
  value: string;
  label: string;
  type: "number" | "enum" | "text";
  operators: string[];
  options?: string[];
}

export const CONDITION_FIELDS: ConditionFieldDef[] = [
  {
    value: "prospectScore",
    label: "Prospect Score",
    type: "number",
    operators: ["gt", "lt", "gte", "lte", "eq"],
  },
  {
    value: "pipelineStage",
    label: "Pipeline Stage",
    type: "enum",
    operators: ["eq", "neq", "in"],
    options: [
      "NEW_INQUIRY",
      "INITIAL_CONTACT",
      "DISCOVERY_CALL",
      "PRE_WORK_IN_PROGRESS",
      "PRE_WORK_COMPLETE",
      "INTERVIEW",
      "SELECTION_REVIEW",
      "SELECTED",
      "REJECTED",
      "WITHDRAWN",
    ],
  },
  {
    value: "interestLevel",
    label: "Interest Level",
    type: "enum",
    operators: ["eq", "neq", "in"],
    options: [
      "READY_TO_START",
      "ACTIVELY_SEEKING_FUNDING",
      "SERIOUSLY_CONSIDERING",
      "JUST_EXPLORING",
      "GATHERING_INFORMATION",
    ],
  },
  {
    value: "liquidity",
    label: "Liquidity Range",
    type: "enum",
    operators: ["eq", "neq", "in"],
    options: [
      "UNDER_50K",
      "RANGE_50K_100K",
      "RANGE_100K_250K",
      "RANGE_250K_500K",
      "OVER_500K",
    ],
  },
  {
    value: "preWorkStatus",
    label: "Pre-Work Status",
    type: "enum",
    operators: ["eq", "neq"],
    options: [
      "NOT_STARTED",
      "IN_PROGRESS",
      "SUBMITTED",
      "UNDER_REVIEW",
      "APPROVED",
      "NEEDS_REVISION",
    ],
  },
  {
    value: "daysSinceLastContact",
    label: "Days Since Last Contact",
    type: "number",
    operators: ["gt", "lt", "gte", "lte", "eq"],
  },
  {
    value: "preferredTerritory",
    label: "Preferred Territory",
    type: "text",
    operators: ["eq", "neq", "contains"],
  },
];

// ============================================
// OPERATOR LABELS
// ============================================

export const OPERATOR_LABELS: Record<string, string> = {
  gt: "is greater than",
  lt: "is less than",
  gte: "is at least",
  lte: "is at most",
  eq: "equals",
  neq: "does not equal",
  in: "is one of",
  contains: "contains",
};
