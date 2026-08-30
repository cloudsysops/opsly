import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "PENDING";

    const todos = await db.franchisorTodo.findMany({
      where: {
        status: status as "PENDING" | "COMPLETED" | "SKIPPED",
      },
      include: {
        prospect: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            selectedAt: true,
            updatedAt: true,
          },
        },
        module: {
          include: {
            phase: {
              include: {
                program: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const enrichedTodos = todos.map((todo) => {
      const selectionDate = todo.prospect.selectedAt || todo.prospect.updatedAt;
      const now = new Date();
      const daysSinceSelection = Math.floor(
        (now.getTime() - selectionDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const currentDay = Math.min(Math.max(daysSinceSelection + 1, 1), 90);

      const mod = todo.module;
      const targetDay = mod?.targetDay || 90;
      const daysUntilDue = targetDay - currentDay;
      const isOverdue = daysUntilDue < 0;

      return {
        id: todo.id,
        actionText: todo.actionText,
        status: todo.status,
        createdAt: todo.createdAt,
        sentEmailAt: todo.sentEmailAt,
        prospect: {
          id: todo.prospect.id,
          name: `${todo.prospect.firstName} ${todo.prospect.lastName}`,
          email: todo.prospect.email,
        },
        task: {
          id: mod?.id ?? todo.id,
          slug: mod?.slug ?? "",
          title: mod?.title ?? todo.actionText,
          targetDay: mod?.targetDay ?? null,
          verificationType: mod?.verificationType ?? "CHECKBOX",
          phaseName: mod?.phase?.title ?? "",
          weekName: mod?.phase?.program?.name ?? "",
        },
        urgency: {
          daysUntilDue,
          isOverdue,
          currentDay,
          priority: isOverdue ? "urgent" : daysUntilDue <= 3 ? "high" : "normal",
        },
      };
    });

    enrichedTodos.sort((a, b) => {
      if (a.urgency.isOverdue && !b.urgency.isOverdue) return -1;
      if (!a.urgency.isOverdue && b.urgency.isOverdue) return 1;
      return a.urgency.daysUntilDue - b.urgency.daysUntilDue;
    });

    const counts = await db.franchisorTodo.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const statusCounts = {
      pending: counts.find((c) => c.status === "PENDING")?._count.id || 0,
      completed: counts.find((c) => c.status === "COMPLETED")?._count.id || 0,
      skipped: counts.find((c) => c.status === "SKIPPED")?._count.id || 0,
    };

    return NextResponse.json({
      todos: enrichedTodos,
      counts: statusCounts,
    });
  } catch (error) {
    console.error("Academy todos error:", error);
    return NextResponse.json(
      { error: "Failed to fetch todos" },
      { status: 500 }
    );
  }
}
