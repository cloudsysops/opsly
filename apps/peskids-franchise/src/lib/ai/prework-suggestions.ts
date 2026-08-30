import Anthropic from "@anthropic-ai/sdk";
import { AISuggestion, AISuggestionSet, FormSchema, FormField } from "@/lib/types/form-schema";

// Lazy load Anthropic client
let anthropicClient: Anthropic | null = null;
function getAnthropicClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

interface ModuleWithSubmissions {
  id: string;
  slug: string;
  title: string;
  description: string;
  formSchema: unknown;
  submissions: Array<{
    id: string;
    content: unknown;
    status: string;
    score: number | null;
    submittedAt: Date | null;
    prospect: {
      preWorkEvaluation: {
        compositeScore: number;
        greenFlags: unknown;
        redFlags: unknown;
        recommendation: string;
      } | null;
    };
  }>;
}

export async function generatePreWorkSuggestions(
  module: ModuleWithSubmissions
): Promise<AISuggestionSet> {
  // Calculate analysis data
  const totalSubmissions = module.submissions.length;
  const evaluatedSubmissions = module.submissions.filter(
    (s) => s.prospect?.preWorkEvaluation
  );

  const completionRate =
    totalSubmissions > 0
      ? Math.round((evaluatedSubmissions.length / totalSubmissions) * 100)
      : 0;

  const averageScore =
    evaluatedSubmissions.length > 0
      ? evaluatedSubmissions.reduce(
          (sum, s) => sum + (s.prospect.preWorkEvaluation?.compositeScore || 0),
          0
        ) / evaluatedSubmissions.length
      : 0;

  // Collect all red flags
  const allRedFlags = evaluatedSubmissions.flatMap(
    (s) => (s.prospect.preWorkEvaluation?.redFlags as string[] || [])
  );
  const redFlagCounts = allRedFlags.reduce((acc, flag) => {
    // Normalize the flag text
    if (typeof flag === 'string') {
      const normalizedFlag = flag.toLowerCase().trim();
      acc[normalizedFlag] = (acc[normalizedFlag] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Get top 5 most common red flags
  const commonRedFlags = Object.entries(redFlagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([flag]) => flag);

  // Calculate field completion rates
  const fieldCompletionRates: Record<string, number> = {};
  const schema = module.formSchema as FormSchema | null;

  if (schema?.fields) {
    for (const field of schema.fields) {
      if (["section-header", "info-box"].includes(field.type)) continue;

      const completedCount = module.submissions.filter((s) => {
        const content = s.content as Record<string, unknown>;
        const value = content[field.name];
        return (
          value !== undefined &&
          value !== null &&
          value !== "" &&
          (!Array.isArray(value) || value.length > 0)
        );
      }).length;

      fieldCompletionRates[field.name] =
        totalSubmissions > 0
          ? Math.round((completedCount / totalSubmissions) * 100)
          : 0;
    }
  }

  const analysisData = {
    totalSubmissions,
    completionRate,
    averageScore,
    commonRedFlags,
    fieldCompletionRates,
  };

  // If not enough data, return empty suggestions
  if (totalSubmissions < 5) {
    return {
      suggestions: [],
      analysisData,
    };
  }

  // Build prompt for AI
  const prompt = buildSuggestionPrompt(module, analysisData);

  // Demo mode: return empty suggestions when no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("[DEMO] Anthropic not configured — skipping AI suggestions");
    return { suggestions: [], analysisData };
  }

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Parse the response
    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text content in response");
    }

    const suggestions = parseSuggestions(textContent.text, schema?.fields || []);

    return {
      suggestions,
      analysisData,
    };
  } catch (error) {
    console.error("Error generating AI suggestions:", error);
    return {
      suggestions: [],
      analysisData,
    };
  }
}

function buildSuggestionPrompt(
  module: ModuleWithSubmissions,
  analysisData: AISuggestionSet["analysisData"]
): string {
  const schema = module.formSchema as FormSchema | null;

  return `You are an expert at designing pre-work assessment forms for franchise prospects. Analyze the following module and submission data to suggest improvements.

## Module: ${module.title}
${module.description}

## Current Form Schema:
${JSON.stringify(schema?.fields || [], null, 2)}

## Submission Statistics:
- Total Submissions: ${analysisData.totalSubmissions}
- Completion Rate: ${analysisData.completionRate}%
- Average Evaluation Score: ${analysisData.averageScore.toFixed(1)}/100

## Field Completion Rates:
${Object.entries(analysisData.fieldCompletionRates)
  .map(([field, rate]) => `- ${field}: ${rate}%`)
  .join("\n")}

## Common Red Flags from Evaluations:
${analysisData.commonRedFlags.map((flag) => `- ${flag}`).join("\n") || "None identified yet"}

## Sample Submissions (last 5):
${module.submissions
  .slice(0, 5)
  .map((s, i) => {
    const score = s.prospect?.preWorkEvaluation?.compositeScore;
    return `
Submission ${i + 1}:
- Score: ${score ? score.toFixed(0) + "/100" : "Not evaluated"}
- Content: ${JSON.stringify(s.content, null, 2).slice(0, 500)}...
- Recommendation: ${s.prospect?.preWorkEvaluation?.recommendation || "N/A"}
`;
  })
  .join("\n")}

Based on this data, provide 2-4 specific suggestions to improve the form. Focus on:
1. Questions that have low completion rates - should they be clarified or removed?
2. Fields that don't correlate with evaluation scores - are they useful?
3. Missing questions that could help identify the red flags mentioned
4. Field order optimizations for better user experience

For each suggestion, provide:
- Type: "modify", "add", "remove", or "reorder"
- Priority: "high", "medium", or "low"
- Field ID (for modify/remove) or suggested field details (for add)
- Reason: Clear explanation of why this change would help

Format your response as JSON array:
[
  {
    "type": "modify",
    "priority": "high",
    "fieldId": "field_123",
    "reason": "This field has only 40% completion. Simplifying the wording could improve engagement.",
    "suggestedChanges": { "label": "New clearer label", "description": "Added helper text" }
  },
  {
    "type": "add",
    "priority": "medium",
    "reason": "Many prospects are flagged for vague timelines. Adding a specific commitment question could help.",
    "suggestedField": { "type": "select", "name": "start_timeline", "label": "When do you plan to launch?", "options": [...] }
  }
]

Only output the JSON array, no other text.`;
}

function parseSuggestions(
  responseText: string,
  existingFields: FormField[]
): AISuggestion[] {
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("No JSON array found in response");
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) {
      console.error("Parsed result is not an array");
      return [];
    }

    return parsed.map((item, index) => ({
      id: `suggestion_${Date.now()}_${index}`,
      type: item.type || "modify",
      priority: item.priority || "medium",
      fieldId: item.fieldId,
      reason: item.reason || "No reason provided",
      suggestedChanges: item.suggestedChanges || item.suggestedField,
      newPosition: item.newPosition,
    }));
  } catch (error) {
    console.error("Error parsing suggestions:", error);
    return [];
  }
}
