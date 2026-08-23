import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ScheduleFrequency, ExportFormat } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST create new schedule for a report
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: reportId } = await params;
    const body = await req.json();
    const { frequency, dayOfWeek, dayOfMonth, time, recipients, format } = body;

    // Calculate next run time
    const nextRunAt = calculateNextRun(frequency, dayOfWeek, dayOfMonth, time);

    const schedule = await prisma.reportSchedule.create({
      data: {
        reportId,
        frequency: frequency as ScheduleFrequency,
        dayOfWeek: frequency === "WEEKLY" ? dayOfWeek : null,
        dayOfMonth: frequency === "MONTHLY" || frequency === "QUARTERLY" ? dayOfMonth : null,
        time,
        recipients,
        format: (format as ExportFormat) || "PDF",
        isActive: true,
        nextRunAt,
      },
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("Failed to create schedule:", error);
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
  }
}

function calculateNextRun(
  frequency: string,
  dayOfWeek?: number,
  dayOfMonth?: number,
  time: string = "09:00"
): Date {
  const now = new Date();
  const [hours, minutes] = time.split(":").map(Number);
  const next = new Date(now);
  next.setUTCHours(hours, minutes, 0, 0);

  switch (frequency) {
    case "DAILY":
      // If time already passed today, schedule for tomorrow
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      break;

    case "WEEKLY":
      // Set to next occurrence of dayOfWeek
      const targetDay = dayOfWeek ?? 1;
      const currentDay = next.getUTCDay();
      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget <= 0 || (daysUntilTarget === 0 && next <= now)) {
        daysUntilTarget += 7;
      }
      next.setDate(next.getDate() + daysUntilTarget);
      break;

    case "MONTHLY":
      // Set to next occurrence of dayOfMonth
      const targetDate = dayOfMonth ?? 1;
      next.setDate(targetDate);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      break;

    case "QUARTERLY":
      // Set to next quarter
      const targetQDate = dayOfMonth ?? 1;
      const currentMonth = next.getMonth();
      const nextQuarterMonth = Math.floor(currentMonth / 3) * 3 + 3;
      next.setMonth(nextQuarterMonth % 12);
      if (nextQuarterMonth >= 12) {
        next.setFullYear(next.getFullYear() + 1);
      }
      next.setDate(targetQDate);
      break;
  }

  return next;
}
