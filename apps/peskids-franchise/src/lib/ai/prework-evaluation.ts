import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// Lazy-load Anthropic client to avoid loading SDK at startup
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let anthropic: any = null;

function getAnthropic() {
  if (!anthropic) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Anthropic = require("@anthropic-ai/sdk").default;
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

interface EvaluationResult {
  // Dimension Scores (0-10)
  hustleScore: number;
  instructionScore: number;
  communicationScore: number;
  marketScore: number;
  coachabilityScore: number;
  valuesScore: number;
  readinessScore: number;

  // Composite
  compositeScore: number;
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW";

  // Qualitative
  greenFlags: string[];
  redFlags: string[];
  adminSummary: string;
  recommendation: "STRONG_YES" | "YES_WITH_COACHING" | "BORDERLINE" | "NO";

  // Specific Analysis
  outreachCredibility: "HIGH" | "MEDIUM" | "LOW";
  planRealismAnalysis: string;

  // Meta
  systemSuggestions: {
    interviewQuestions: string[];
    coachingAreas: string[];
  };
}

const EVALUATION_SYSTEM_PROMPT = `You are an expert franchise evaluator for Acme Franchise. Your job is to analyze pre-work submissions from prospective franchisees and provide a comprehensive evaluation.

Acme Franchise is a chess enrichment franchise that teaches chess to children ages 3-9 through storytelling and games. Franchisees must be excellent at cold outreach, relationship building, and persistence. They need to be comfortable with rejection and willing to hustle.

SCORING DIMENSIONS (each 0-10):

1. HUSTLE SCORE (25% weight)
- Volume of outreach attempts
- Persistence in follow-ups
- Willingness to make cold calls
- Creative approaches beyond basic calls
- Evidence of actually doing the work
- 10 = Exceeded requirements, showed exceptional initiative
- 5 = Met minimum requirements
- 0 = Minimal effort, likely fabricated

2. INSTRUCTION FOLLOWING (20% weight)
- Did they follow the exact format requested?
- Are all required fields complete?
- Did they list schools in the required format?
- Did they provide specific data vs vague answers?
- 10 = Perfect compliance, attention to detail
- 5 = Mostly compliant with some gaps
- 0 = Ignored instructions, vague throughout

3. COMMUNICATION (15% weight)
- Clarity of written responses
- Professional tone
- Video presence and articulation (if provided)
- Ability to tell a compelling story
- 10 = Excellent communicator, engaging
- 5 = Adequate, gets point across
- 0 = Poor communication, unclear

4. MARKET UNDERSTANDING (15% weight)
- Depth of research
- Quality of school identification
- Understanding of competitive landscape
- Realistic assessment of challenges
- 10 = Deep market knowledge, sophisticated analysis
- 5 = Basic research, surface level
- 0 = No real research, made up data

5. COACHABILITY (10% weight)
- Self-awareness about strengths/weaknesses
- Honest about challenges faced
- Openness to feedback and learning
- Realistic self-assessment score
- 10 = Highly self-aware, eager to learn
- 5 = Some self-awareness
- 0 = Defensive, overconfident, no self-reflection

6. VALUES ALIGNMENT (10% weight)
- Why they want Acme Franchise specifically
- Alignment with education mission
- Integrity in their responses
- Evidence of authenticity
- 10 = Perfect fit, genuine passion
- 5 = Seems interested but generic
- 0 = Red flags, misaligned motivations

7. READINESS (5% weight)
- Financial preparedness indicators
- Time commitment clarity
- Realistic timeline
- Family/life situation compatibility
- 10 = Ready to start immediately
- 5 = Some preparation needed
- 0 = Not ready, significant barriers

COMPOSITE SCORE CALCULATION:
Weighted average: (hustle*0.25 + instruction*0.20 + communication*0.15 + market*0.15 + coachability*0.10 + values*0.10 + readiness*0.05) * 10

RECOMMENDATION THRESHOLDS:
- STRONG_YES: Composite >= 80, no major red flags
- YES_WITH_COACHING: Composite 65-79, fixable weaknesses
- BORDERLINE: Composite 50-64, significant concerns
- NO: Composite < 50, or major red flags

CONFIDENCE LEVELS:
- HIGH: All modules submitted with substantial content
- MEDIUM: Some thin responses but enough to evaluate
- LOW: Missing critical information, evaluation is speculative

OUTREACH CREDIBILITY:
Evaluate whether the outreach log seems genuine:
- HIGH: Specific names, realistic outcomes, believable notes, script evolution
- MEDIUM: Some specificity but potential gaps
- LOW: Generic entries, too perfect, likely fabricated

RED FLAGS TO WATCH FOR:
- Too-perfect outreach results (100% positive conversations)
- Generic school names without addresses
- No negative experiences or challenges mentioned
- Script that never evolved
- Vague answers where specifics were required
- Unrealistic 90-day targets
- No video submitted (now required)
- Copy-paste answers
- Time stamps that don't make sense

GREEN FLAGS:
- Named specific people they talked to
- Honest about rejections and challenges
- Script evolved based on feedback
- Realistic targets with clear rationale
- Strong local connections
- Evidence of genuine research
- Self-awareness about gaps
- Compelling video presence

OUTPUT FORMAT:
Respond with a JSON object matching this exact structure:
{
  "hustleScore": <number 0-10>,
  "instructionScore": <number 0-10>,
  "communicationScore": <number 0-10>,
  "marketScore": <number 0-10>,
  "coachabilityScore": <number 0-10>,
  "valuesScore": <number 0-10>,
  "readinessScore": <number 0-10>,
  "compositeScore": <number 0-100>,
  "confidenceLevel": "HIGH" | "MEDIUM" | "LOW",
  "greenFlags": ["flag1", "flag2", ...],
  "redFlags": ["flag1", "flag2", ...],
  "adminSummary": "2-3 paragraph summary for admin review",
  "recommendation": "STRONG_YES" | "YES_WITH_COACHING" | "BORDERLINE" | "NO",
  "outreachCredibility": "HIGH" | "MEDIUM" | "LOW",
  "planRealismAnalysis": "Analysis of 90-day plan realism",
  "systemSuggestions": {
    "interviewQuestions": ["question1", "question2", ...],
    "coachingAreas": ["area1", "area2", ...]
  }
}`;

/**
 * Generate AI evaluation for a prospect's pre-work submissions
 */
export async function generatePreWorkEvaluation(
  prospectId: string
): Promise<EvaluationResult | null> {
  // Fetch all submissions for this prospect
  const submissions = await db.preWorkSubmission.findMany({
    where: { prospectId },
    include: { module: true },
  });

  if (submissions.length === 0) {
    console.log(`No submissions found for prospect ${prospectId}`);
    return null;
  }

  // Fetch prospect info
  const prospect = await db.prospect.findUnique({
    where: { id: prospectId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      preferredTerritory: true,
      interestLevel: true,
      aboutYourself: true,
    },
  });

  if (!prospect) {
    console.log(`Prospect not found: ${prospectId}`);
    return null;
  }

  // Build the submission content for analysis
  const submissionContent = submissions
    .sort((a, b) => a.module.sequence - b.module.sequence)
    .map((sub) => {
      const content = sub.content as Record<string, unknown>;
      return `
=== MODULE ${sub.module.sequence}: ${sub.module.title.toUpperCase()} ===
Submitted: ${sub.submittedAt ? sub.submittedAt.toISOString() : "Draft"}
Status: ${sub.status}

${Object.entries(content)
  .map(([key, value]) => {
    const formattedValue =
      typeof value === "object" ? JSON.stringify(value, null, 2) : value;
    return `[${key}]:\n${formattedValue}`;
  })
  .join("\n\n")}
`;
    })
    .join("\n\n---\n\n");

  const userPrompt = `PROSPECT INFORMATION:
Name: ${prospect.firstName} ${prospect.lastName}
Email: ${prospect.email}
Preferred Territory: ${prospect.preferredTerritory || "Not specified"}
Interest Level: ${prospect.interestLevel}
About Themselves: ${prospect.aboutYourself || "Not provided"}

SUBMISSIONS:
${submissionContent}

Please evaluate this prospect's pre-work submissions and return a JSON evaluation.`;

  // Demo mode: return mock evaluation when no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("[DEMO] Anthropic not configured — returning mock evaluation");
    const mockEval: EvaluationResult = {
      hustleScore: 7, instructionScore: 8, communicationScore: 7,
      marketScore: 6, coachabilityScore: 8, valuesScore: 7, readinessScore: 7,
      compositeScore: 72, confidenceLevel: "MEDIUM",
      greenFlags: ["Strong motivation", "Good communication skills"],
      redFlags: ["Limited market research depth"],
      adminSummary: "Demo evaluation — configure ANTHROPIC_API_KEY for real AI-powered evaluations.",
      recommendation: "YES_WITH_COACHING",
      outreachCredibility: "MEDIUM",
      planRealismAnalysis: "Demo mode — no analysis available.",
      systemSuggestions: {
        interviewQuestions: ["Tell us about your experience with cold outreach."],
        coachingAreas: ["Market research methodology"],
      },
    };
    return mockEval;
  }

  try {
    const response = await getAnthropic().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: EVALUATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON from response (handle potential markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const evaluation = JSON.parse(jsonStr.trim()) as EvaluationResult;

    // Save to database
    await db.preWorkEvaluation.upsert({
      where: { prospectId },
      create: {
        prospectId,
        hustleScore: evaluation.hustleScore,
        instructionScore: evaluation.instructionScore,
        communicationScore: evaluation.communicationScore,
        marketScore: evaluation.marketScore,
        coachabilityScore: evaluation.coachabilityScore,
        valuesScore: evaluation.valuesScore,
        readinessScore: evaluation.readinessScore,
        compositeScore: evaluation.compositeScore,
        confidenceLevel: evaluation.confidenceLevel,
        greenFlags: evaluation.greenFlags as Prisma.InputJsonValue,
        redFlags: evaluation.redFlags as Prisma.InputJsonValue,
        adminSummary: evaluation.adminSummary,
        recommendation: evaluation.recommendation,
        outreachCredibility: evaluation.outreachCredibility,
        planRealismAnalysis: evaluation.planRealismAnalysis,
        systemSuggestions: evaluation.systemSuggestions as Prisma.InputJsonValue,
        rawResponse: { responseText } as Prisma.InputJsonValue,
      },
      update: {
        hustleScore: evaluation.hustleScore,
        instructionScore: evaluation.instructionScore,
        communicationScore: evaluation.communicationScore,
        marketScore: evaluation.marketScore,
        coachabilityScore: evaluation.coachabilityScore,
        valuesScore: evaluation.valuesScore,
        readinessScore: evaluation.readinessScore,
        compositeScore: evaluation.compositeScore,
        confidenceLevel: evaluation.confidenceLevel,
        greenFlags: evaluation.greenFlags as Prisma.InputJsonValue,
        redFlags: evaluation.redFlags as Prisma.InputJsonValue,
        adminSummary: evaluation.adminSummary,
        recommendation: evaluation.recommendation,
        outreachCredibility: evaluation.outreachCredibility,
        planRealismAnalysis: evaluation.planRealismAnalysis,
        systemSuggestions: evaluation.systemSuggestions as Prisma.InputJsonValue,
        rawResponse: { responseText } as Prisma.InputJsonValue,
        generatedAt: new Date(),
      },
    });

    console.log(
      `Generated pre-work evaluation for prospect ${prospectId}: ${evaluation.recommendation} (${evaluation.compositeScore})`
    );

    return evaluation;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating pre-work evaluation:", errorMessage);
    throw error;
  }
}

/**
 * Get existing evaluation for a prospect
 */
export async function getPreWorkEvaluation(prospectId: string) {
  return db.preWorkEvaluation.findUnique({
    where: { prospectId },
  });
}
