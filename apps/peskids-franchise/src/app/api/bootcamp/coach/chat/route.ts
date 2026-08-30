import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateJourneyAwareResponse, JourneyContext } from "@/lib/rag/generation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "PROSPECT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prospect = await db.prospect.findUnique({
      where: { id: session.user.id },
      include: {
        academyProgress: {
          include: {
            module: {
              include: {
                phase: {
                  include: {
                    program: { select: { slug: true, name: true, programType: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!prospect || prospect.pipelineStage !== "SELECTED") {
      return NextResponse.json(
        { error: "Academy access requires SELECTED status" },
        { status: 403 }
      );
    }

    const { message, conversationId, moduleContext } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await db.chatConversation.findFirst({
        where: {
          id: conversationId,
          prospectId: session.user.id,
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 20,
          },
        },
      });
    }

    if (!conversation) {
      const title = message.slice(0, 50) + (message.length > 50 ? "..." : "");
      conversation = await db.chatConversation.create({
        data: {
          prospectId: session.user.id,
          sessionId: `academy-${session.user.id}-${Date.now()}`,
          title,
        },
        include: {
          messages: true,
        },
      });
    }

    const conversationHistory = conversation.messages.map((msg) => ({
      role: msg.role.toLowerCase() as "user" | "assistant",
      content: msg.content,
    }));

    // Calculate current day
    const selectedAt = prospect.selectedAt || prospect.updatedAt;
    const now = new Date();
    const daysSinceSelection = Math.floor(
      (now.getTime() - selectedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const currentDay = Math.min(Math.max(daysSinceSelection + 1, 1), 90);

    // Get all academy modules
    const allModules = await db.academyModule.findMany({
      include: {
        phase: {
          include: {
            program: { select: { slug: true, name: true, programType: true } },
          },
        },
      },
      orderBy: [{ phase: { program: { sequence: "asc" } } }, { phase: { order: "asc" } }, { order: "asc" }],
    });

    const progressMap = new Map(
      prospect.academyProgress.map((p) => [p.moduleId, p])
    );

    // Split onboarding vs other
    const onboardingModules = allModules.filter(
      (m) => m.phase.program?.programType === "ONBOARDING"
    );
    const completedOnboarding = onboardingModules.filter(
      (m) => progressMap.get(m.id)?.status === "COMPLETED"
    );
    const onboardingPercent =
      onboardingModules.length > 0
        ? Math.round((completedOnboarding.length / onboardingModules.length) * 100)
        : 0;

    // Find current onboarding phase
    const incompleteOnboarding = onboardingModules.filter(
      (m) => progressMap.get(m.id)?.status !== "COMPLETED"
    );

    // Overdue and upcoming from onboarding
    const overdueTasks = incompleteOnboarding
      .filter((m) => m.targetDay && m.targetDay < currentDay)
      .map((m) => ({
        title: m.title,
        daysOverdue: currentDay - (m.targetDay || 0),
      }));

    const upcomingTasks = incompleteOnboarding
      .filter((m) => !m.targetDay || m.targetDay >= currentDay)
      .slice(0, 5)
      .map((m) => ({
        title: m.title,
        targetDay: m.targetDay,
      }));

    // Overall academy progress
    const completedAll = allModules.filter(
      (m) => progressMap.get(m.id)?.status === "COMPLETED"
    );
    const academyPercent =
      allModules.length > 0
        ? Math.round((completedAll.length / allModules.length) * 100)
        : 0;

    // Current phase
    const incompleteAll = allModules.filter(
      (m) => progressMap.get(m.id)?.status !== "COMPLETED"
    );
    const currentPhase = incompleteOnboarding[0]?.phase || null;

    // Next action
    const nextModule = incompleteOnboarding[0] || incompleteAll[0];
    let nextAction = "";
    if (overdueTasks.length > 0) {
      nextAction = `Complete overdue module: "${overdueTasks[0].title}"`;
    } else if (nextModule) {
      nextAction = `Continue with: "${nextModule.title}"`;
    } else {
      nextAction = "Review your progress and celebrate your achievements!";
    }

    const journeyContext: JourneyContext = {
      franchiseeName: `${prospect.firstName} ${prospect.lastName}`,
      currentDay,
      totalDays: 90,
      currentPhase: currentPhase?.title || null,
      completedTasks: completedOnboarding.length,
      totalTasks: onboardingModules.length,
      journeyProgressPercent: onboardingPercent,
      overdueTasks,
      upcomingTasks,
      academyCompletedModules: completedAll.length,
      academyTotalModules: allModules.length,
      academyProgressPercent: academyPercent,
      currentAcademyPhase: incompleteAll[0]?.phase?.title || null,
      nextAction,
    };

    // If the franchisee is on a specific module page, add that context
    let moduleContextStr = "";
    if (moduleContext && typeof moduleContext === "object" && moduleContext.title) {
      moduleContextStr = `\n\nCURRENT MODULE CONTEXT:\nThe franchisee is currently viewing: "${moduleContext.title}"${moduleContext.description ? `\nModule description: "${moduleContext.description}"` : ""}\nTailor your responses to help them with this specific task.`;
    }

    // Inject Resource Library and Creative Asset context based on message keywords
    const keywords = message
      .toLowerCase()
      .split(/\s+/)
      .filter((w: string) => w.length > 3)
      .slice(0, 5);

    if (keywords.length > 0) {
      const [matchingResources, matchingAssets] = await Promise.all([
        db.academyResource.findMany({
          where: {
            isPublic: true,
            OR: keywords.flatMap((kw: string) => [
              { title: { contains: kw, mode: "insensitive" as const } },
              { description: { contains: kw, mode: "insensitive" as const } },
            ]),
          },
          select: { title: true, description: true, category: true },
          take: 3,
        }),
        db.creativeAsset.findMany({
          where: {
            isPublic: true,
            OR: keywords.flatMap((kw: string) => [
              { title: { contains: kw, mode: "insensitive" as const } },
              { description: { contains: kw, mode: "insensitive" as const } },
            ]),
          },
          select: { title: true, description: true, category: true },
          take: 3,
        }),
      ]);

      if (matchingResources.length > 0 || matchingAssets.length > 0) {
        let resourceContext = "\n\nRELATED RESOURCES AVAILABLE:";
        if (matchingResources.length > 0) {
          resourceContext += "\nResource Library items:";
          matchingResources.forEach((r) => {
            resourceContext += `\n- "${r.title}" (${r.category}) — ${r.description}`;
          });
        }
        if (matchingAssets.length > 0) {
          resourceContext += "\nCreative Assets:";
          matchingAssets.forEach((a) => {
            resourceContext += `\n- "${a.title}" (${a.category})${a.description ? ` — ${a.description}` : ""}`;
          });
        }
        resourceContext += "\nMention these to the franchisee and tell them where to find them in the Learning Center.";
        moduleContextStr += resourceContext;
      }
    }

    const { response, citations, confidence } = await generateJourneyAwareResponse(
      message,
      conversationHistory,
      journeyContext,
      moduleContextStr
    );

    // Save user message
    await db.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: message,
      },
    });

    // Save assistant response
    await db.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: response,
        metadata: {
          citations,
          confidence,
          isAcademyCoach: true,
        },
      },
    });

    await db.chatConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      response,
      citations,
      confidence,
      conversationId: conversation.id,
    });
  } catch (error) {
    console.error("Coach chat error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
