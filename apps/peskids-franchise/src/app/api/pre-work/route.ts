import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { notifyPreWorkComplete } from "@/lib/email/notifications";
import { generatePreWorkEvaluation } from "@/lib/ai/prework-evaluation";

export const dynamic = "force-dynamic";

const preWorkSchema = z.object({
  moduleId: z.string(),
  content: z.record(z.unknown()),
  submit: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "PROSPECT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prospectId = session.user.id;
    const body = await request.json();
    const { moduleId, content, submit } = preWorkSchema.parse(body);

    // Check if module exists
    const module = await db.preWorkModule.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // Upsert the submission
    const submission = await db.preWorkSubmission.upsert({
      where: {
        prospectId_moduleId: {
          prospectId,
          moduleId,
        },
      },
      create: {
        prospectId,
        moduleId,
        content: content as Prisma.InputJsonValue,
        status: submit ? "SUBMITTED" : "DRAFT",
        submittedAt: submit ? new Date() : null,
      },
      update: {
        content: content as Prisma.InputJsonValue,
        status: submit ? "SUBMITTED" : "DRAFT",
        submittedAt: submit ? new Date() : undefined,
      },
    });

    // Log activity
    if (submit) {
      await db.prospectActivity.create({
        data: {
          prospectId,
          activityType: "PRE_WORK_SUBMITTED",
          description: `Submitted ${module.title}`,
          metadata: { moduleId, moduleSlug: module.slug },
        },
      });

      // Check if all modules are submitted
      const allSubmissions = await db.preWorkSubmission.findMany({
        where: { prospectId },
      });

      const totalModules = await db.preWorkModule.count();
      const submittedCount = allSubmissions.filter(
        (s) => s.status === "SUBMITTED" || s.status === "APPROVED"
      ).length;

      // Update prospect status if all modules submitted
      if (submittedCount >= totalModules) {
        const updatedProspect = await db.prospect.update({
          where: { id: prospectId },
          data: {
            preWorkStatus: "SUBMITTED",
            preWorkCompletedAt: new Date(),
            pipelineStage: "PRE_WORK_COMPLETE",
          },
        });

        await db.prospectActivity.create({
          data: {
            prospectId,
            activityType: "STAGE_CHANGED",
            description: "All pre-work modules completed",
          },
        });

        // Send notifications (async, don't block response)
        notifyPreWorkComplete({
          id: updatedProspect.id,
          firstName: updatedProspect.firstName,
          lastName: updatedProspect.lastName,
          email: updatedProspect.email,
          phone: updatedProspect.phone,
          preferredTerritory: updatedProspect.preferredTerritory,
          interestLevel: updatedProspect.interestLevel,
          aboutYourself: updatedProspect.aboutYourself,
          prospectScore: updatedProspect.prospectScore,
        }).catch((err) => console.error("Error sending pre-work notifications:", err));

        // Generate AI evaluation (async, don't block response)
        generatePreWorkEvaluation(prospectId).catch((err) =>
          console.error("Error generating pre-work evaluation:", err)
        );
      } else if (allSubmissions.length === 1) {
        // First submission - update prospect status
        await db.prospect.update({
          where: { id: prospectId },
          data: {
            preWorkStatus: "IN_PROGRESS",
            preWorkStartedAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      submission,
    });
  } catch (error) {
    console.error("Pre-work error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
