import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { TaskPriority, TaskStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assignedTo: z.string().email().optional(),
});

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
    const body = await request.json();
    const data = createTaskSchema.parse(body);

    // Verify prospect exists
    const prospect = await db.prospect.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    // Create task
    const task = await db.crmTask.create({
      data: {
        prospectId: id,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        priority: data.priority || "MEDIUM",
        assignedTo: data.assignedTo || session.user.email,
        createdBy: session.user.email || "unknown",
      },
    });

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error("Error creating task:", error);

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

    const tasks = await db.crmTask.findMany({
      where: { prospectId: id },
      orderBy: [
        { status: "asc" }, // PENDING first
        { priority: "desc" }, // URGENT first
        { dueDate: "asc" },
      ],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
