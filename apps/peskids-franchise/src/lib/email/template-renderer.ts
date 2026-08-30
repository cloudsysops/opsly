// Template renderer for replacing {{variable}} placeholders

import type { Prospect } from "@prisma/client";
import { TEMPLATE_VARIABLES, getSampleData } from "./template-variables";

interface VariableContext {
  prospect?: Partial<Prospect> & { inviteToken?: string | null; resetToken?: string | null };
  customData?: Record<string, string>;
}

const BASE_URL = "https://franchise-stc-993771038de6.herokuapp.com";

const INTEREST_LEVEL_LABELS: Record<string, string> = {
  READY_TO_START: "Ready to Start",
  ACTIVELY_SEEKING_FUNDING: "Seeking Funding",
  SERIOUSLY_CONSIDERING: "Seriously Considering",
  JUST_EXPLORING: "Just Exploring",
  GATHERING_INFORMATION: "Gathering Information",
};

// Render template with actual values
export function renderTemplate(template: string, context: VariableContext): string {
  const { prospect, customData } = context;

  const values: Record<string, string> = {
    ...customData,
  };

  // Build values from prospect if available
  if (prospect) {
    values.firstName = prospect.firstName || "";
    values.lastName = prospect.lastName || "";
    values.fullName = `${prospect.firstName || ""} ${prospect.lastName || ""}`.trim();
    values.email = prospect.email || "";
    values.territory = prospect.preferredTerritory || "Not specified";
    values.phone = prospect.phone || "";
    values.interestLevel = prospect.interestLevel
      ? INTEREST_LEVEL_LABELS[prospect.interestLevel] || prospect.interestLevel
      : "";
    values.portalUrl = `${BASE_URL}/portal`;

    if (prospect.inviteToken) {
      values.setPasswordUrl = `${BASE_URL}/set-password?token=${prospect.inviteToken}`;
    }

    if (prospect.resetToken) {
      values.resetPasswordUrl = `${BASE_URL}/reset-password?token=${prospect.resetToken}`;
    }
  }

  // Always include date values
  values.currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  values.currentYear = new Date().getFullYear().toString();

  // Replace all {{variable}} placeholders
  return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return values[varName] ?? match; // Keep original if not found
  });
}

// Render template with sample data for preview
export function renderTemplatePreview(template: string): string {
  const sampleData = getSampleData();
  return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return sampleData[varName] ?? match;
  });
}

// Extract plain text from HTML and truncate for preview
export function extractBodyPreview(html: string, maxLength: number = 200): string {
  // Remove HTML tags
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength).trim() + "...";
}

// Validate that all required variables are provided
export function validateTemplateVariables(
  template: string,
  providedValues: Record<string, string>
): { valid: boolean; missing: string[] } {
  const usedVariables = template.match(/\{\{(\w+)\}\}/g) || [];
  const variableNames = usedVariables.map(v => v.replace(/\{\{|\}\}/g, ""));
  const uniqueVars = [...new Set(variableNames)];

  const missing: string[] = [];
  for (const varName of uniqueVars) {
    if (!providedValues[varName] && !TEMPLATE_VARIABLES[varName]) {
      // Unknown variable
      continue;
    }
    if (!providedValues[varName]) {
      missing.push(varName);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
