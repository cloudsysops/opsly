import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PointsReason } from "@prisma/client";
import { notifyFranchisorTaskReady } from "@/lib/email/academy-notifications";
import { sendCompletionEmail } from "@/lib/email/completion-email";

export const dynamic = "force-dynamic";

// GET /api/franchisee/bootcamp/modules/[slug] - Get module details with content blocks and progress
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;

    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    if (prospect.pipelineStage !== "SELECTED") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get module with phase, program, and content blocks
    const module = await db.academyModule.findUnique({
      where: { slug },
      include: {
        phase: {
          include: {
            program: {
              select: {
                id: true,
                slug: true,
                name: true,
                programType: true,
              },
            },
          },
        },
        contentBlocks: {
          orderBy: { order: "asc" },
        },
        linkedResources: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // Resolve linked resources into display info
    const resolvedResources = await Promise.all(
      (module.linkedResources || []).map(async (r) => {
        let title = r.label || "";
        let url: string | null = null;
        let action = "View";

        switch (r.resourceType) {
          case "ACADEMY_RESOURCE": {
            const res = await db.academyResource.findUnique({ where: { id: r.resourceId } });
            if (res) { title = r.label || res.title; url = res.fileUrl || res.externalUrl; action = res.fileUrl ? "Download" : "Open"; }
            break;
          }
          case "KNOWLEDGE_DOCUMENT": {
            const doc = await db.knowledgeDocument.findUnique({ where: { id: r.resourceId } });
            if (doc) { title = r.label || doc.title; url = `/wiki/${doc.id}`; action = "Read"; }
            break;
          }
          case "CREATIVE_ASSET": {
            const asset = await db.creativeAsset.findUnique({ where: { id: r.resourceId } });
            if (asset) { title = r.label || asset.title; url = asset.fileUrl || asset.externalUrl || asset.canvaEmbedUrl; action = "View"; }
            break;
          }
          case "MANUAL_PAGE": {
            const page = await db.manualPage.findUnique({ where: { id: r.resourceId } });
            if (page) { title = r.label || page.title; url = `/portal/learning/manual/${page.id}`; action = "Read"; }
            break;
          }
          case "EXTERNAL_URL": {
            title = r.label || "External Link";
            url = r.resourceId;
            action = "Open";
            break;
          }
        }

        return { id: r.id, resourceType: r.resourceType, title, url, action };
      })
    );

    // Resolve resource page for overlay
    // Supports raw IDs, full URLs like /admin/learning/manual/{id}/edit,
    // and optional #hash fragments for deep-linking to a specific heading
    let resourcePage: { id: string; title: string; hash: string | null } | null = null;
    if (module.resourcePageId) {
      let pageId = module.resourcePageId;
      // Extract hash fragment if present (e.g., "cmlt0tqdv...#2-1-2-overview")
      let hash: string | null = null;
      const hashIdx = pageId.indexOf("#");
      if (hashIdx !== -1) {
        hash = pageId.slice(hashIdx + 1);
        pageId = pageId.slice(0, hashIdx);
      }
      const urlMatch = pageId.match(/\/manual\/([a-z0-9]+)/i);
      if (urlMatch) {
        pageId = urlMatch[1];
      }
      const page = await db.manualPage.findUnique({
        where: { id: pageId },
        select: { id: true, title: true },
      });
      if (page) {
        resourcePage = { ...page, hash };
      }
    }

    // Get progress for this module (including block progress)
    const progress = await db.academyProgress.findUnique({
      where: {
        prospectId_moduleId: {
          prospectId: prospect.id,
          moduleId: module.id,
        },
      },
      include: {
        blockProgress: true,
      },
    });

    // Get next and previous modules (within the same program)
    const programPhaseIds = module.phase.program
      ? await db.academyPhase
          .findMany({
            where: { programId: module.phase.program.id },
            select: { id: true },
          })
          .then((phases) => phases.map((p) => p.id))
      : [module.phaseId];

    const nextModule = await db.academyModule.findFirst({
      where: {
        phase: { id: { in: programPhaseIds } },
        OR: [
          { phaseId: module.phaseId, order: { gt: module.order } },
          { phase: { order: { gt: module.phase.order } } },
        ],
      },
      include: {
        phase: { select: { slug: true, title: true } },
      },
      orderBy: [{ phase: { order: "asc" } }, { order: "asc" }],
    });

    const prevModule = await db.academyModule.findFirst({
      where: {
        phase: { id: { in: programPhaseIds } },
        OR: [
          { phaseId: module.phaseId, order: { lt: module.order } },
          { phase: { order: { lt: module.phase.order } } },
        ],
      },
      include: {
        phase: { select: { slug: true, title: true } },
      },
      orderBy: [{ phase: { order: "desc" } }, { order: "desc" }],
    });

    const programSlug = module.phase.program?.slug || "";

    // Get all modules in the same phase with their progress for the sidebar checklist
    const phaseModules = await db.academyModule.findMany({
      where: { phaseId: module.phaseId },
      orderBy: { order: "asc" },
      select: {
        id: true,
        slug: true,
        title: true,
        order: true,
        isMilestone: true,
        owner: true,
        targetDay: true,
        points: true,
      },
    });

    const phaseProgressRecords = await db.academyProgress.findMany({
      where: {
        prospectId: prospect.id,
        moduleId: { in: phaseModules.map((m) => m.id) },
      },
      select: {
        moduleId: true,
        status: true,
      },
    });

    const progressByModule = new Map(
      phaseProgressRecords.map((p) => [p.moduleId, p.status])
    );

    const phaseModulesWithStatus = phaseModules.map((m) => ({
      slug: m.slug,
      title: m.title,
      status: progressByModule.get(m.id) || "NOT_STARTED",
      isMilestone: m.isMilestone,
      isCurrent: m.slug === slug,
      owner: m.owner,
      points: m.points,
    }));

    // Get ALL phases in this program with modules + progress for sidebar navigation
    const allProgramPhases = await db.academyPhase.findMany({
      where: { programId: module.phase.programId! },
      orderBy: { order: "asc" },
      select: {
        id: true,
        slug: true,
        title: true,
        modules: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            slug: true,
            title: true,
            isMilestone: true,
            owner: true,
            points: true,
          },
        },
      },
    });

    const allModuleIds = allProgramPhases.flatMap((p) => p.modules.map((m) => m.id));
    const allProgressRecords = await db.academyProgress.findMany({
      where: {
        prospectId: prospect.id,
        moduleId: { in: allModuleIds },
      },
      select: { moduleId: true, status: true },
    });
    const allProgressMap = new Map(allProgressRecords.map((p) => [p.moduleId, p.status]));

    const allPhases = allProgramPhases.map((p) => ({
      slug: p.slug,
      title: p.title,
      isCurrent: p.id === module.phaseId,
      modules: p.modules.map((m) => ({
        slug: m.slug,
        title: m.title,
        status: allProgressMap.get(m.id) || "NOT_STARTED",
        isMilestone: m.isMilestone,
        isCurrent: m.slug === slug,
        owner: m.owner,
        points: m.points,
      })),
    }));

    // Calculate current day for onboarding progress
    let currentDay = 0;
    if (prospect.selectedAt) {
      const diffMs = Date.now() - new Date(prospect.selectedAt).getTime();
      currentDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      module: {
        id: module.id,
        slug: module.slug,
        title: module.title,
        description: module.description,
        content: module.content,
        richDescription: module.richDescription,
        duration: module.duration,
        points: module.points,
        moduleType: module.moduleType,
        resourceUrl: module.resourceUrl,
        quizData: module.quizData,
        // Onboarding fields
        owner: module.owner,
        verificationType: module.verificationType,
        targetDay: module.targetDay,
        isMilestone: module.isMilestone,
        notifyFranchisor: module.notifyFranchisor,
        franchisorActionText: module.franchisorActionText,
        // Step guide fields
        stepWhat: module.stepWhat,
        stepHow: module.stepHow,
        stepWhy: module.stepWhy,
        dataFields: module.dataFields,
        resourcePageId: module.resourcePageId,
        sectionOrder: module.sectionOrder,
        // Content blocks
        contentBlocks: module.contentBlocks.map((block) => ({
          id: block.id,
          type: block.type,
          order: block.order,
          content: block.content,
          checkpointText: block.checkpointText,
          quizQuestion: block.quizQuestion,
          quizOptions: block.quizOptions,
          correctAnswer: block.correctAnswer,
          quizExplanation: block.quizExplanation,
          imageUrl: block.imageUrl,
          imageAlt: block.imageAlt,
          imageCaption: block.imageCaption,
          videoUrl: block.videoUrl,
          videoProvider: block.videoProvider,
          fileUrl: block.fileUrl,
          fileTitle: block.fileTitle,
          fileDescription: block.fileDescription,
          calloutType: block.calloutType,
          calloutTitle: block.calloutTitle,
          calloutContent: block.calloutContent,
          checklistTitle: block.checklistTitle,
          checklistItems: block.checklistItems,
        })),
      },
      program: module.phase.program
        ? {
            slug: module.phase.program.slug,
            name: module.phase.program.name,
            programType: module.phase.program.programType,
          }
        : { slug: programSlug, name: "Academy", programType: "CONTINUING_EDUCATION" },
      phase: {
        slug: module.phase.slug,
        title: module.phase.title,
      },
      resourcePage,
      progress: progress
        ? {
            status: progress.status,
            completedAt: progress.completedAt,
            fileUrl: progress.fileUrl,
            textResponse: progress.textResponse,
            collectedData: progress.collectedData,
          }
        : null,
      blockProgress: progress
        ? progress.blockProgress.map((bp) => ({
            blockId: bp.blockId,
            isCompleted: bp.completed,
            quizAnswer: null,
            quizCorrect: bp.correct,
            checklistChecked: null,
          }))
        : [],
      linkedResources: resolvedResources,
      phaseModules: phaseModulesWithStatus,
      allPhases,
      navigation: {
        prevModule: prevModule
          ? {
              slug: prevModule.slug,
              title: prevModule.title,
            }
          : null,
        nextModule: nextModule
          ? {
              slug: nextModule.slug,
              title: nextModule.title,
            }
          : null,
      },
      currentDay,
    });
  } catch (error) {
    console.error("Get module error:", error);
    return NextResponse.json(
      { error: "Failed to fetch module" },
      { status: 500 }
    );
  }
}

// POST /api/franchisee/bootcamp/modules/[slug] - Module actions (start, complete, submit_quiz, complete_block)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const body = await request.json();
    const { action, quizAnswers, timeSpent, fileUrl, fileName, textResponse, notes, blockId, blockData, collectedData } = body;

    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        pipelineStage: true,
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    if (prospect.pipelineStage !== "SELECTED") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const module = await db.academyModule.findUnique({
      where: { slug },
      include: {
        phase: true,
        completionEmailTemplate: true,
      },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // Handle start
    if (action === "start") {
      await db.academyProgress.upsert({
        where: {
          prospectId_moduleId: {
            prospectId: prospect.id,
            moduleId: module.id,
          },
        },
        update: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
        create: {
          prospectId: prospect.id,
          moduleId: module.id,
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true });
    }

    // Handle quiz submission
    if (action === "submit_quiz" && module.moduleType === "QUIZ") {
      const quizData = module.quizData as {
        questions: Array<{
          question: string;
          options: string[];
          correctIndex: number;
        }>;
        passingScore: number;
      } | null;

      if (!quizData) {
        return NextResponse.json({ error: "Quiz data not found" }, { status: 400 });
      }

      let correctCount = 0;
      const results = quizData.questions.map((q, i) => {
        const isCorrect = quizAnswers[i] === q.correctIndex;
        if (isCorrect) correctCount++;
        return {
          question: q.question,
          userAnswer: q.options[quizAnswers[i]],
          correctAnswer: q.options[q.correctIndex],
          isCorrect,
        };
      });

      const score = Math.round((correctCount / quizData.questions.length) * 100);
      const passed = score >= quizData.passingScore;

      await db.academyProgress.upsert({
        where: {
          prospectId_moduleId: {
            prospectId: prospect.id,
            moduleId: module.id,
          },
        },
        update: {
          status: passed ? "COMPLETED" : "IN_PROGRESS",
          quizScore: score,
          quizAttempts: { increment: 1 },
          completedAt: passed ? new Date() : null,
          timeSpent: timeSpent || 0,
        },
        create: {
          prospectId: prospect.id,
          moduleId: module.id,
          status: passed ? "COMPLETED" : "IN_PROGRESS",
          quizScore: score,
          quizAttempts: 1,
          completedAt: passed ? new Date() : null,
          timeSpent: timeSpent || 0,
        },
      });

      if (passed) {
        await db.academyPointsLog.create({
          data: {
            prospectId: prospect.id,
            points: module.points,
            reason: PointsReason.QUIZ_PASSED,
            metadata: { moduleId: module.id, moduleSlug: module.slug, score },
          },
        });
        await recordDailyActivity(prospect.id);
      }

      return NextResponse.json({
        success: true,
        score,
        passed,
        passingScore: quizData.passingScore,
        results,
        pointsEarned: passed ? module.points : 0,
      });
    }

    // Handle block completion (checkpoint acknowledgment, inline quiz answer)
    if (action === "complete_block" && blockId) {
      // Get or create progress record
      const progressRecord = await db.academyProgress.upsert({
        where: {
          prospectId_moduleId: {
            prospectId: prospect.id,
            moduleId: module.id,
          },
        },
        update: {
          status: "IN_PROGRESS",
        },
        create: {
          prospectId: prospect.id,
          moduleId: module.id,
          status: "IN_PROGRESS",
        },
      });

      // Upsert block progress
      await db.contentBlockProgress.upsert({
        where: {
          progressId_blockId: {
            progressId: progressRecord.id,
            blockId,
          },
        },
        update: {
          completed: true,
          response: blockData?.response || null,
          correct: blockData?.correct ?? null,
          completedAt: new Date(),
        },
        create: {
          progressId: progressRecord.id,
          blockId,
          completed: true,
          response: blockData?.response || null,
          correct: blockData?.correct ?? null,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true });
    }

    // Handle complete (for non-quiz modules, including onboarding tasks)
    if (action === "complete") {
      const existingProgress = await db.academyProgress.findUnique({
        where: {
          prospectId_moduleId: {
            prospectId: prospect.id,
            moduleId: module.id,
          },
        },
      });

      if (existingProgress?.status === "COMPLETED") {
        return NextResponse.json({
          success: true,
          alreadyCompleted: true,
          pointsEarned: 0,
        });
      }

      // Validate based on verification type (for onboarding modules)
      if (module.verificationType === "FILE_UPLOAD" && !fileUrl) {
        return NextResponse.json(
          { error: "File upload required for this task" },
          { status: 400 }
        );
      }
      if (module.verificationType === "TEXT_RESPONSE" && !textResponse?.trim()) {
        return NextResponse.json(
          { error: "Text response required for this task" },
          { status: 400 }
        );
      }

      // Determine final status
      let status: "COMPLETED" | "PENDING_REVIEW" = "COMPLETED";
      if (module.verificationType === "FRANCHISOR_CONFIRMS") {
        status = "PENDING_REVIEW";
      }

      // Update progress
      await db.academyProgress.upsert({
        where: {
          prospectId_moduleId: {
            prospectId: prospect.id,
            moduleId: module.id,
          },
        },
        update: {
          status,
          completedAt: status === "COMPLETED" ? new Date() : null,
          timeSpent: timeSpent || 0,
          fileUrl: fileUrl || undefined,
          fileName: fileName || undefined,
          textResponse: textResponse || undefined,
          notes: notes || undefined,
          collectedData: collectedData || undefined,
          completedBy: "franchisee",
        },
        create: {
          prospectId: prospect.id,
          moduleId: module.id,
          status,
          completedAt: status === "COMPLETED" ? new Date() : null,
          timeSpent: timeSpent || 0,
          fileUrl,
          fileName,
          textResponse,
          notes,
          collectedData,
          completedBy: "franchisee",
        },
      });

      // Save collected data to franchisee profile if configured
      if (collectedData && Object.keys(collectedData).length > 0) {
        const dataFieldsDef = (module.dataFields as Array<{
          key: string;
          saveToProfile?: boolean;
          profileField?: string;
        }>) || [];

        const directUpdates: Record<string, unknown> = {};
        const customData: Record<string, string> = {};

        // DateTime columns that need Date conversion
        const dateTimeFields = new Set(["insuranceExpiry", "insuranceEffectiveDate"]);

        for (const fieldDef of dataFieldsDef) {
          if (fieldDef.saveToProfile === false) continue;
          const value = collectedData[fieldDef.key];
          if (!value) continue;

          if (fieldDef.profileField) {
            // Map to a dedicated FranchiseeAccount column
            if (dateTimeFields.has(fieldDef.profileField)) {
              directUpdates[fieldDef.profileField] = new Date(value);
            } else {
              directUpdates[fieldDef.profileField] = value;
            }
          } else {
            // Save to profileData JSON
            customData[fieldDef.key] = value;
          }
        }

        const account = await db.franchiseeAccount.findUnique({
          where: { prospectId: prospect.id },
          select: { id: true, profileData: true },
        });

        if (account) {
          const updatePayload: Record<string, unknown> = { ...directUpdates };

          if (Object.keys(customData).length > 0) {
            const existing = (account.profileData as Record<string, unknown>) || {};
            updatePayload.profileData = { ...existing, ...customData };
          }

          if (Object.keys(updatePayload).length > 0) {
            await db.franchiseeAccount.update({
              where: { id: account.id },
              data: updatePayload,
            });
          }
        }
      }

      // Award points if completed
      let pointsEarned = 0;
      if (status === "COMPLETED") {
        pointsEarned = module.points;
        await db.academyPointsLog.create({
          data: {
            prospectId: prospect.id,
            points: module.points,
            reason: PointsReason.MODULE_COMPLETED,
            metadata: { moduleId: module.id, moduleSlug: module.slug },
          },
        });
        await recordDailyActivity(prospect.id);
      }

      // Create franchisor todo if needed
      if (module.notifyFranchisor || module.owner === "FRANCHISOR") {
        const actionText =
          module.franchisorActionText ||
          `Complete "${module.title}" for ${prospect.firstName} ${prospect.lastName}`;

        await db.franchisorTodo.create({
          data: {
            prospectId: prospect.id,
            moduleId: module.id,
            actionText,
            status: "PENDING",
          },
        });

        // Fire-and-forget email notification
        notifyFranchisorTaskReady(prospect, {
          title: module.title,
          slug: module.slug,
          franchisorActionText: module.franchisorActionText,
        }).catch(console.error);
      }

      // Send completion email via Gmail if template is configured
      if (module.completionEmailTemplate) {
        sendCompletionEmail({
          template: module.completionEmailTemplate,
          prospect,
          module: { id: module.id, title: module.title, slug: module.slug },
        }).catch(console.error);
      }

      // Check if phase is complete for bonus
      let phaseComplete = false;
      if (status === "COMPLETED") {
        const phaseModules = await db.academyModule.findMany({
          where: { phaseId: module.phaseId },
        });

        const completedInPhase = await db.academyProgress.count({
          where: {
            prospectId: prospect.id,
            moduleId: { in: phaseModules.map((m) => m.id) },
            status: "COMPLETED",
          },
        });

        if (completedInPhase === phaseModules.length) {
          phaseComplete = true;
          pointsEarned += 50;
          await db.academyPointsLog.create({
            data: {
              prospectId: prospect.id,
              points: 50,
              reason: PointsReason.PHASE_COMPLETED,
              metadata: { phaseId: module.phaseId, phaseTitle: module.phase.title },
            },
          });
        }
      }

      // Log activity
      await db.prospectActivity.create({
        data: {
          prospectId: prospect.id,
          activityType: "PAGE_VIEW",
          description: `Completed module: ${module.title}`,
          metadata: {
            moduleId: module.id,
            moduleSlug: module.slug,
            status,
            isMilestone: module.isMilestone,
          },
        },
      });

      return NextResponse.json({
        success: true,
        progress: { status },
        pointsEarned,
        phaseComplete,
        isMilestone: module.isMilestone,
        celebrationType: module.isMilestone ? "fireworks" : "confetti",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Update module progress error:", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}

// Allow franchisee to mark module as in-progress
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const body = await request.json().catch(() => ({}));
    const { status } = body;

    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      select: { id: true, pipelineStage: true },
    });

    if (!prospect || prospect.pipelineStage !== "SELECTED") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const module = await db.academyModule.findUnique({
      where: { slug },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    if (status && !["IN_PROGRESS", "NOT_STARTED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status - use POST to complete" },
        { status: 400 }
      );
    }

    const progress = await db.academyProgress.upsert({
      where: {
        prospectId_moduleId: {
          prospectId: prospect.id,
          moduleId: module.id,
        },
      },
      update: { status: status || "IN_PROGRESS" },
      create: {
        prospectId: prospect.id,
        moduleId: module.id,
        status: status || "IN_PROGRESS",
      },
    });

    return NextResponse.json({
      success: true,
      progress: { id: progress.id, status: progress.status },
    });
  } catch (error) {
    console.error("Module update error:", error);
    return NextResponse.json(
      { error: "Failed to update module" },
      { status: 500 }
    );
  }
}

async function recordDailyActivity(prospectId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await db.academyDailyActivity.upsert({
    where: {
      prospectId_date: {
        prospectId,
        date: today,
      },
    },
    update: {},
    create: { prospectId, date: today },
  });
}
