import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subDays } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const fourteenDaysAgo = subDays(now, 14);
  const thirtyDaysFromNow = subDays(now, -30);

  // Run all alert queries in parallel
  const [
    overdueInvoices,
    disputedInvoices,
    franchisorTodos,
    expiringCerts,
    stalledProspects,
    failedWorkflows,
    expiringInsurance,
    expiredInsurance,
    missingInsurance,
  ] = await Promise.all([
    // Overdue invoices
    db.royaltyInvoice.findMany({
      where: {
        status: "PAYMENT_PENDING",
        dueDate: { lt: now },
      },
      include: {
        franchiseeAccount: {
          include: {
            prospect: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    }),

    // Disputed invoices
    db.royaltyInvoice.findMany({
      where: { status: "DISPUTED" },
      include: {
        franchiseeAccount: {
          include: {
            prospect: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),

    // Franchisor to-dos
    db.franchisorTodo.findMany({
      where: { completedAt: null },
      include: {
        prospect: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        module: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),

    // Expiring certifications (within 30 days)
    db.franchiseeCertification.findMany({
      where: {
        expiresAt: {
          lte: thirtyDaysFromNow,
          gt: now,
        },
        status: { not: "EXPIRED" },
      },
      include: {
        franchiseeAccount: {
          include: {
            prospect: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        certification: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { expiresAt: "asc" },
    }),

    // Stalled prospects (no activity in 14+ days)
    db.prospect.findMany({
      where: {
        pipelineStage: {
          notIn: ["SELECTED", "REJECTED", "WITHDRAWN"],
        },
        updatedAt: { lt: fourteenDaysAgo },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        pipelineStage: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "asc" },
      take: 10,
    }),

    // Failed workflows
    db.workflowExecution.findMany({
      where: { status: "FAILED" },
      include: {
        prospect: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        action: {
          select: {
            actionType: true,
            trigger: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    // Insurance expiring within 30 days
    db.franchiseeAccount.findMany({
      where: {
        insuranceExpiry: {
          gt: now,
          lte: thirtyDaysFromNow,
        },
      },
      include: {
        prospect: {
          select: {
            firstName: true,
            lastName: true,
            preferredTerritory: true,
          },
        },
      },
      orderBy: { insuranceExpiry: "asc" },
    }),

    // Expired insurance (in the past)
    db.franchiseeAccount.findMany({
      where: {
        insuranceExpiry: {
          lt: now,
        },
      },
      include: {
        prospect: {
          select: {
            firstName: true,
            lastName: true,
            preferredTerritory: true,
          },
        },
      },
      orderBy: { insuranceExpiry: "asc" },
    }),

    // Missing insurance (no expiry date on file)
    db.franchiseeAccount.findMany({
      where: {
        insuranceExpiry: null,
      },
      include: {
        prospect: {
          select: {
            firstName: true,
            lastName: true,
            preferredTerritory: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({
    overdueInvoices: overdueInvoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      amount: Number(i.totalAmount),
      dueDate: i.dueDate.toISOString(),
      franchisee: `${i.franchiseeAccount.prospect.firstName} ${i.franchiseeAccount.prospect.lastName}`,
      href: `/admin/franchisees/invoices/${i.id}`,
    })),
    disputedInvoices: disputedInvoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      amount: Number(i.totalAmount),
      franchisee: `${i.franchiseeAccount.prospect.firstName} ${i.franchiseeAccount.prospect.lastName}`,
      notes: i.franchiseeNotes,
      href: `/admin/franchisees/invoices/${i.id}`,
    })),
    franchisorTodos: franchisorTodos.map((t) => ({
      id: t.id,
      actionText: t.actionText,
      franchisee: `${t.prospect.firstName} ${t.prospect.lastName}`,
      task: t.module?.title ?? "Unknown",
      createdAt: t.createdAt.toISOString(),
      href: `/admin/franchisees/todos`,
    })),
    expiringCerts: expiringCerts.map((c) => ({
      id: c.id,
      certificationName: c.certification.name,
      franchisee: `${c.franchiseeAccount.prospect.firstName} ${c.franchiseeAccount.prospect.lastName}`,
      expiresAt: c.expiresAt?.toISOString(),
      href: `/admin/franchisees/compliance`,
    })),
    stalledProspects: stalledProspects.map((p) => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      stage: p.pipelineStage,
      lastActivity: p.updatedAt.toISOString(),
      href: `/admin/crm/prospects/${p.id}`,
    })),
    failedWorkflows: failedWorkflows.map((w) => ({
      id: w.id,
      workflowName: w.action.trigger.name,
      actionType: w.action.actionType,
      prospect: `${w.prospect.firstName} ${w.prospect.lastName}`,
      createdAt: w.createdAt.toISOString(),
      href: `/admin/settings/workflows`,
    })),
    expiringInsurance: expiringInsurance.map((a) => ({
      id: a.id,
      franchisee: `${a.prospect.firstName} ${a.prospect.lastName}`,
      territory: a.prospect.preferredTerritory,
      insuranceExpiry: a.insuranceExpiry?.toISOString(),
      carrier: a.insuranceCarrier,
      href: `/admin/franchisees/compliance`,
    })),
    expiredInsurance: expiredInsurance.map((a) => ({
      id: a.id,
      franchisee: `${a.prospect.firstName} ${a.prospect.lastName}`,
      territory: a.prospect.preferredTerritory,
      insuranceExpiry: a.insuranceExpiry?.toISOString(),
      carrier: a.insuranceCarrier,
      href: `/admin/franchisees/compliance`,
    })),
    missingInsurance: missingInsurance.map((a) => ({
      id: a.id,
      franchisee: `${a.prospect.firstName} ${a.prospect.lastName}`,
      territory: a.prospect.preferredTerritory,
      href: `/admin/franchisees/compliance`,
    })),
    summary: {
      overdueInvoices: overdueInvoices.length,
      disputedInvoices: disputedInvoices.length,
      franchisorTodos: franchisorTodos.length,
      expiringCerts: expiringCerts.length,
      stalledProspects: stalledProspects.length,
      failedWorkflows: failedWorkflows.length,
      expiringInsurance: expiringInsurance.length,
      expiredInsurance: expiredInsurance.length,
      missingInsurance: missingInsurance.length,
    },
  });
}
