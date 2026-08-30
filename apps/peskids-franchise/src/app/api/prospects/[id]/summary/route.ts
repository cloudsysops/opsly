import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Lazy-load Anthropic client
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

const SUMMARY_SYSTEM_PROMPT = `You are an AI assistant analyzing franchise prospect data for Acme Franchise.

Your task is to generate a comprehensive summary of a prospect's engagement and potential fit.

Analyze the provided data and return a JSON object with the following structure:
{
  "summary": "A 2-3 paragraph narrative summary of the prospect's journey, engagement, and potential fit",
  "keyInsights": ["Insight 1", "Insight 2", "Insight 3", "Insight 4", "Insight 5"],
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED",
  "engagementScore": 1-100
}

GUIDELINES:
- Summary should tell the story of the prospect's journey
- Key insights should be actionable observations (3-5 insights)
- Sentiment should reflect overall tone of interactions
- Engagement score should consider: response times, pre-work completion, Earl chat engagement, meeting attendance

SCORING FACTORS:
- High engagement: Quick responses, completed pre-work, active Earl chats, attended meetings
- Medium engagement: Some activity, partial pre-work, occasional responses
- Low engagement: Minimal activity, no pre-work progress, unresponsive

Return ONLY valid JSON, no markdown or explanation.`;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "REVIEWER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    // Check for cached summary
    const existingSummary = await db.prospectSummary.findUnique({
      where: { prospectId: id },
    });

    // Return cached if less than 24 hours old and not forcing refresh
    if (existingSummary && !forceRefresh) {
      const hoursSinceGeneration =
        (Date.now() - existingSummary.generatedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceGeneration < 24) {
        return NextResponse.json(existingSummary);
      }
    }

    // Need to generate fresh summary
    return NextResponse.json(
      { message: "Summary needs generation", needsGeneration: true },
      { status: 202 }
    );
  } catch (error) {
    console.error("Error fetching summary:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "REVIEWER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch all prospect data
    const prospect = await db.prospect.findUnique({
      where: { id },
      include: {
        notes: { orderBy: { createdAt: "desc" }, take: 20 },
        activities: { orderBy: { createdAt: "desc" }, take: 50 },
        preWorkSubmissions: { include: { module: true } },
        conversations: {
          include: { messages: { orderBy: { createdAt: "asc" } } },
          take: 5,
        },
        emails: { orderBy: { sentAt: "desc" }, take: 20 },
        calls: { orderBy: { createdAt: "desc" }, take: 10 },
        meetings: { orderBy: { scheduledFor: "desc" }, take: 10 },
        tasks: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    // Build context for AI
    const context = {
      prospect: {
        name: `${prospect.firstName} ${prospect.lastName}`,
        email: prospect.email,
        phone: prospect.phone,
        interestLevel: prospect.interestLevel,
        liquidity: prospect.liquidity,
        preferredTerritory: prospect.preferredTerritory,
        pipelineStage: prospect.pipelineStage,
        prospectScore: prospect.prospectScore,
        preWorkStatus: prospect.preWorkStatus,
        aboutYourself: prospect.aboutYourself,
        referralSource: prospect.referralSource,
        createdAt: prospect.createdAt.toISOString(),
        lastContactAt: prospect.lastContactAt?.toISOString(),
      },
      notes: prospect.notes.map((n) => ({
        content: n.content,
        author: n.authorEmail,
        date: n.createdAt.toISOString(),
        isPinned: n.isPinned,
      })),
      preWork: prospect.preWorkSubmissions.map((s) => ({
        module: s.module.title,
        status: s.status,
        score: s.score,
        submittedAt: s.submittedAt?.toISOString(),
      })),
      earlChats: prospect.conversations.map((c) => ({
        messageCount: c.messages.length,
        lastMessage: c.messages[c.messages.length - 1]?.content?.slice(0, 200),
        date: c.updatedAt.toISOString(),
      })),
      emails: prospect.emails.map((e) => ({
        direction: e.direction,
        subject: e.subject,
        preview: e.bodyPreview.slice(0, 200),
        date: e.sentAt.toISOString(),
      })),
      calls: prospect.calls.map((c) => ({
        type: c.callType,
        direction: c.direction,
        outcome: c.outcome,
        duration: c.duration,
        notes: c.notes?.slice(0, 200),
        date: (c.completedAt || c.createdAt).toISOString(),
      })),
      meetings: prospect.meetings.map((m) => ({
        type: m.meetingType,
        title: m.title,
        status: m.status,
        outcome: m.outcome?.slice(0, 200),
        date: m.scheduledFor.toISOString(),
      })),
      tasks: prospect.tasks.map((t) => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate?.toISOString(),
      })),
      recentActivities: prospect.activities.slice(0, 20).map((a) => ({
        type: a.activityType,
        description: a.description,
        date: a.createdAt.toISOString(),
      })),
    };

    // Generate summary with Claude
    const response = await getAnthropic().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: SUMMARY_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Analyze this prospect data and generate a summary:\n\n${JSON.stringify(context, null, 2)}`,
        },
      ],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse the JSON response
    let summaryData;
    try {
      summaryData = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse AI response:", responseText);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    // Upsert the summary
    const summary = await db.prospectSummary.upsert({
      where: { prospectId: id },
      update: {
        summary: summaryData.summary,
        keyInsights: summaryData.keyInsights,
        sentiment: summaryData.sentiment,
        engagementScore: summaryData.engagementScore,
        generatedAt: new Date(),
      },
      create: {
        prospectId: id,
        summary: summaryData.summary,
        keyInsights: summaryData.keyInsights,
        sentiment: summaryData.sentiment,
        engagementScore: summaryData.engagementScore,
      },
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
