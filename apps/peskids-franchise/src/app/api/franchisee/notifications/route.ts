import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/franchisee/notifications - Get notification items for the franchisee
export async function GET() {
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

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // ─── 1. Unread Announcements ──────────────────────────────────────────────
    const announcements = await db.announcement.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { lte: now },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
        reads: {
          none: {
            prospectId: prospect.id,
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        category: true,
        priority: true,
        publishedAt: true,
      },
    });

    const announcementItems = announcements.map((a: any) => ({
      id: `announcement-${a.id}`,
      type: 'announcement' as const,
      title: a.title,
      description: `${a.category} announcement${a.priority === 'URGENT' || a.priority === 'HIGH' ? ' - ' + a.priority : ''}`,
      link: '/portal/messages',
      createdAt: (a.publishedAt || now).toISOString(),
      isRead: false,
      sourceId: a.id,
    }));

    // ─── 2. Pending Invoices ──────────────────────────────────────────────────
    const pendingInvoices = await db.royaltyInvoice.findMany({
      where: {
        franchiseeAccountId: prospect.franchiseeAccount.id,
        status: 'PENDING_REVIEW',
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        year: true,
        month: true,
        totalAmount: true,
        createdAt: true,
      },
    });

    const invoiceItems = pendingInvoices.map((inv: any) => {
      const monthName = new Date(inv.year, inv.month - 1).toLocaleString('default', { month: 'long' });
      return {
        id: `invoice-${inv.id}`,
        type: 'invoice' as const,
        title: `Invoice ${inv.invoiceNumber} needs review`,
        description: `${monthName} ${inv.year} royalty invoice - $${Number(inv.totalAmount).toLocaleString()}`,
        link: '/portal/royalties',
        createdAt: inv.createdAt.toISOString(),
        isRead: false,
        sourceId: inv.id,
      };
    });

    // ─── 3. Expiring Certifications (within 30 days) ──────────────────────────
    const expiringCerts = await db.franchiseeCertification.findMany({
      where: {
        franchiseeAccountId: prospect.franchiseeAccount.id,
        expiresAt: {
          gt: now,
          lte: thirtyDaysFromNow,
        },
        status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
      },
      include: {
        certification: { select: { name: true } },
      },
      orderBy: { expiresAt: 'asc' },
      take: 5,
    });

    const certItems = expiringCerts.map((cert: any) => {
      const daysUntil = Math.ceil(
        (cert.expiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: `cert-${cert.id}`,
        type: 'certification' as const,
        title: `${cert.certification.name} expiring soon`,
        description: `Expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} - renew now to stay compliant`,
        link: '/portal/compliance',
        createdAt: cert.updatedAt.toISOString(),
        isRead: false,
        sourceId: cert.id,
      };
    });

    // ─── 4. Overdue Academy Modules ─────────────────────────────────────────────
    const selectedAt = prospect.selectedAt || now;
    const currentDay = Math.floor(
      (now.getTime() - selectedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Find modules with targetDay that have passed and are not completed
    const overdueModules = await db.academyModule.findMany({
      where: {
        targetDay: {
          lte: currentDay,
          not: null,
        },
        progress: {
          none: {
            prospectId: prospect.id,
            status: 'COMPLETED',
          },
        },
        owner: { in: ['FRANCHISEE', 'COLLABORATIVE'] },
      },
      include: {
        phase: {
          include: {
            program: { select: { slug: true } },
          },
        },
      },
      orderBy: { targetDay: 'asc' },
      take: 5,
    });

    const taskItems = overdueModules.map((mod: any) => {
      const daysOverdue = currentDay - (mod.targetDay || 0);
      return {
        id: `module-${mod.id}`,
        type: 'journey_task' as const,
        title: `Overdue: ${mod.title}`,
        description: `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} past target completion date`,
        link: `/portal/learning/${mod.phase.program.slug}/${mod.phase.slug}/${mod.slug}`,
        createdAt: now.toISOString(),
        isRead: false,
        sourceId: mod.id,
      };
    });

    // ─── 5. Support Tickets Waiting on Franchisee ──────────────────────────────
    const waitingTickets = await db.supportTicket.findMany({
      where: {
        prospectId: prospect.id,
        status: 'WAITING_ON_FRANCHISEE',
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        updatedAt: true,
      },
    });

    const ticketItems = waitingTickets.map((ticket: any) => ({
      id: `ticket-${ticket.id}`,
      type: 'support_ticket' as const,
      title: `Action needed: ${ticket.subject}`,
      description: `Ticket ${ticket.ticketNumber} is waiting for your response`,
      link: '/portal/support',
      createdAt: ticket.updatedAt.toISOString(),
      isRead: false,
      sourceId: ticket.id,
    }));

    // ─── Combine and sort ──────────────────────────────────────────────────────
    const allItems = [
      ...announcementItems,
      ...invoiceItems,
      ...certItems,
      ...taskItems,
      ...ticketItems,
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);

    const unreadCount = allItems.filter((item) => !item.isRead).length;

    return NextResponse.json({
      items: allItems,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST /api/franchisee/notifications - Mark all announcements as read
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
    });

    if (!prospect || prospect.pipelineStage !== 'SELECTED') {
      return NextResponse.json({ error: 'Not a franchisee' }, { status: 403 });
    }

    const now = new Date();

    // Find all unread published announcements
    const unreadAnnouncements = await db.announcement.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { lte: now },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
        reads: {
          none: {
            prospectId: prospect.id,
          },
        },
      },
      select: { id: true },
    });

    // Create read records for all unread announcements
    if (unreadAnnouncements.length > 0) {
      await db.announcementRead.createMany({
        data: unreadAnnouncements.map((a: any) => ({
          announcementId: a.id,
          prospectId: prospect.id,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      success: true,
      markedCount: unreadAnnouncements.length,
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}
