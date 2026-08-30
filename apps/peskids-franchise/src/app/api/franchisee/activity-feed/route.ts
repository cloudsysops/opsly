import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/franchisee/activity-feed - Get recent activity timeline
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      include: { franchiseeAccount: true },
    });

    if (!prospect || prospect.pipelineStage !== 'SELECTED' || !prospect.franchiseeAccount) {
      return NextResponse.json({ error: 'Not a franchisee' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // ─── Query all activity sources in parallel ────────────────────────────────

    const [
      prospectActivities,
      sentEmails,
      academyCompletions,
      invoiceUpdates,
      ticketUpdates,
      announcementReads,
    ] = await Promise.all([
      // 1. ProspectActivity records
      db.prospectActivity.findMany({
        where: {
          prospectId: prospect.id,
          createdAt: { gte: thirtyDaysAgo },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          activityType: true,
          description: true,
          metadata: true,
          createdAt: true,
        },
      }),

      // 2. Emails received
      db.sentEmail.findMany({
        where: {
          prospectId: prospect.id,
          sentAt: { gte: thirtyDaysAgo },
        },
        orderBy: { sentAt: 'desc' },
        take: 20,
        select: {
          id: true,
          subject: true,
          sentBy: true,
          sentAt: true,
        },
      }),

      // 3. Academy module completions
      db.academyProgress.findMany({
        where: {
          prospectId: prospect.id,
          status: 'COMPLETED',
          completedAt: { gte: thirtyDaysAgo },
        },
        include: {
          module: { select: { title: true, isMilestone: true } },
        },
        orderBy: { completedAt: 'desc' },
        take: 20,
      }),

      // 5. Royalty invoice status changes (all recent invoices)
      db.royaltyInvoice.findMany({
        where: {
          franchiseeAccountId: prospect.franchiseeAccount.id,
          updatedAt: { gte: thirtyDaysAgo },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAmount: true,
          updatedAt: true,
        },
      }),

      // 6. Support ticket updates
      db.supportTicket.findMany({
        where: {
          prospectId: prospect.id,
          updatedAt: { gte: thirtyDaysAgo },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          status: true,
          updatedAt: true,
        },
      }),

      // 7. Announcement reads
      db.announcementRead.findMany({
        where: {
          prospectId: prospect.id,
          readAt: { gte: thirtyDaysAgo },
        },
        include: {
          announcement: { select: { title: true } },
        },
        orderBy: { readAt: 'desc' },
        take: 10,
      }),
    ]);

    // ─── Transform into unified activity items ─────────────────────────────────

    type ActivityItem = {
      id: string;
      type: string;
      title: string;
      description: string;
      createdAt: string;
      metadata?: Record<string, unknown>;
    };

    const activities: ActivityItem[] = [];

    // 1. Prospect activities
    for (const activity of prospectActivities) {
      activities.push({
        id: `activity-${activity.id}`,
        type: 'activity',
        title: formatActivityType(activity.activityType),
        description: activity.description,
        createdAt: activity.createdAt.toISOString(),
        metadata: activity.metadata as Record<string, unknown> | undefined,
      });
    }

    // 2. Emails
    for (const email of sentEmails) {
      activities.push({
        id: `email-${email.id}`,
        type: 'email_received',
        title: 'Email received',
        description: email.subject,
        createdAt: email.sentAt.toISOString(),
        metadata: { sentBy: email.sentBy },
      });
    }

    // 3. Academy completions
    for (const progress of academyCompletions) {
      activities.push({
        id: `academy-${progress.id}`,
        type: 'task_completed',
        title: progress.module.isMilestone ? 'Milestone completed!' : 'Module completed',
        description: progress.module.title,
        createdAt: (progress.completedAt || progress.createdAt).toISOString(),
        metadata: { isMilestone: progress.module.isMilestone },
      });
    }

    // 5. Invoice updates
    for (const invoice of invoiceUpdates) {
      activities.push({
        id: `invoice-${invoice.id}`,
        type: 'invoice_update',
        title: `Invoice ${invoice.invoiceNumber}`,
        description: `Status: ${formatInvoiceStatus(invoice.status)} - $${Number(invoice.totalAmount).toLocaleString()}`,
        createdAt: invoice.updatedAt.toISOString(),
        metadata: { status: invoice.status, invoiceNumber: invoice.invoiceNumber },
      });
    }

    // 6. Ticket updates
    for (const ticket of ticketUpdates) {
      activities.push({
        id: `ticket-${ticket.id}`,
        type: 'ticket_update',
        title: `Ticket ${ticket.ticketNumber}`,
        description: `${ticket.subject} - ${formatTicketStatus(ticket.status)}`,
        createdAt: ticket.updatedAt.toISOString(),
        metadata: { status: ticket.status, ticketNumber: ticket.ticketNumber },
      });
    }

    // 7. Announcement reads
    for (const read of announcementReads) {
      activities.push({
        id: `ann-read-${read.id}`,
        type: 'announcement_read',
        title: 'Announcement read',
        description: read.announcement.title,
        createdAt: read.readAt.toISOString(),
      });
    }

    // ─── Sort, deduplicate by type+sourceId, apply pagination ──────────────────

    activities.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = activities.length;
    const paginated = activities.slice(offset, offset + limit);

    return NextResponse.json({
      activities: paginated,
      total,
    });
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity feed' },
      { status: 500 }
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatActivityType(type: string): string {
  const labels: Record<string, string> = {
    FORM_SUBMITTED: 'Form submitted',
    EMAIL_SENT: 'Email sent',
    CALL_LOGGED: 'Call logged',
    STAGE_CHANGED: 'Stage changed',
    PRE_WORK_STARTED: 'Pre-work started',
    PRE_WORK_SUBMITTED: 'Pre-work submitted',
    DOCUMENT_SIGNED: 'Document signed',
    DOCUMENT_DOWNLOADED: 'Document downloaded',
    NOTE_ADDED: 'Note added',
    SCORE_UPDATED: 'Score updated',
    LOGIN: 'Portal login',
    PAGE_VIEW: 'Page viewed',
    WORKFLOW_TRIGGERED: 'Workflow triggered',
  };
  return labels[type] || type.replace(/_/g, ' ').toLowerCase();
}

function formatInvoiceStatus(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Draft',
    PENDING_REVIEW: 'Pending Review',
    APPROVED: 'Approved',
    DISPUTED: 'Disputed',
    PAYMENT_PENDING: 'Payment Pending',
    PROCESSING: 'Processing',
    PAID: 'Paid',
    OVERDUE: 'Overdue',
    CANCELLED: 'Cancelled',
  };
  return labels[status] || status;
}

function formatTicketStatus(status: string): string {
  const labels: Record<string, string> = {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    WAITING_ON_FRANCHISEE: 'Waiting on you',
    WAITING_ON_ADMIN: 'Waiting on support',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
  };
  return labels[status] || status;
}
