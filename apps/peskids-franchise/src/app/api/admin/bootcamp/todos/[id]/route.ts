import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyFranchiseeTaskCompleted } from "@/lib/email/academy-notifications";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    if (!status || !["COMPLETED", "SKIPPED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status - must be COMPLETED or SKIPPED" },
        { status: 400 }
      );
    }

    const todo = await db.franchisorTodo.findUnique({
      where: { id },
      include: {
        prospect: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        module: true,
      },
    });

    if (!todo) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    const updatedTodo = await db.franchisorTodo.update({
      where: { id },
      data: {
        status,
        completedAt: new Date(),
      },
    });

    // If completed, also mark the academy progress as completed
    if (status === "COMPLETED" && todo.moduleId) {
      await db.academyProgress.upsert({
        where: {
          prospectId_moduleId: {
            prospectId: todo.prospectId,
            moduleId: todo.moduleId,
          },
        },
        update: {
          status: "COMPLETED",
          completedAt: new Date(),
          completedBy: session.user.email || "franchisor",
          notes: notes || undefined,
        },
        create: {
          prospectId: todo.prospectId,
          moduleId: todo.moduleId,
          status: "COMPLETED",
          completedAt: new Date(),
          completedBy: session.user.email || "franchisor",
          notes,
        },
      });

      const moduleTitle = todo.module?.title ?? todo.actionText;
      const moduleSlug = todo.module?.slug ?? "";
      await db.prospectActivity.create({
        data: {
          prospectId: todo.prospectId,
          activityType: "PAGE_VIEW",
          description: `Franchisor completed task: ${moduleTitle}`,
          performedBy: session.user.email,
          metadata: {
            moduleId: todo.moduleId,
            moduleSlug,
            completedBy: "franchisor",
          },
        },
      });

      if (todo.module) {
        notifyFranchiseeTaskCompleted(todo.prospect, todo.module).catch(
          console.error
        );
      }
    }

    return NextResponse.json({
      success: true,
      todo: {
        id: updatedTodo.id,
        status: updatedTodo.status,
        completedAt: updatedTodo.completedAt,
      },
    });
  } catch (error) {
    console.error("Todo update error:", error);
    return NextResponse.json(
      { error: "Failed to update todo" },
      { status: 500 }
    );
  }
}
