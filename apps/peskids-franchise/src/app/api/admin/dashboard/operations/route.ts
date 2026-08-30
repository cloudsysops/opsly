import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/dashboard/operations - Operations stats for admin dashboard
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Manual stats
    const [publishedPages, totalAckRequired, totalAcks] = await Promise.all([
      db.manualPage.count({ where: { status: "PUBLISHED" } }),
      db.manualPage.count({ where: { status: "PUBLISHED", requiresAcknowledgment: true } }),
      db.manualAcknowledgment.count(),
    ]);

    const selectedFranchisees = await db.prospect.count({ where: { pipelineStage: "SELECTED" } });
    const totalAcksNeeded = totalAckRequired * selectedFranchisees;
    const pendingAcks = Math.max(0, totalAcksNeeded - totalAcks);

    // Ticket stats
    const [openTickets, overdueTickets, ticketsResolvedThisMonth] = await Promise.all([
      db.supportTicket.count({
        where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_ON_ADMIN"] } },
      }),
      db.supportTicket.count({
        where: {
          status: { in: ["OPEN", "IN_PROGRESS", "WAITING_ON_ADMIN"] },
          slaDeadline: { lt: now },
        },
      }),
      db.supportTicket.count({
        where: { status: "RESOLVED", resolvedAt: { gte: startOfMonth } },
      }),
    ]);

    // Audit stats
    const [scheduledAudits, openCorrectiveActions, overdueCorrectiveActions] = await Promise.all([
      db.fieldAudit.count({ where: { status: "SCHEDULED" } }),
      db.correctiveAction.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      db.correctiveAction.count({
        where: { status: { in: ["OPEN", "IN_PROGRESS"] }, dueDate: { lt: now } },
      }),
    ]);

    return NextResponse.json({
      manual: {
        publishedPages,
        pendingAcks,
      },
      tickets: {
        open: openTickets,
        overdue: overdueTickets,
        resolvedThisMonth: ticketsResolvedThisMonth,
      },
      audits: {
        scheduled: scheduledAudits,
        openCorrectiveActions,
        overdueCorrectiveActions,
      },
    });
  } catch (error) {
    console.error("Error fetching operations dashboard:", error);
    return NextResponse.json({ error: "Failed to fetch operations stats" }, { status: 500 });
  }
}
