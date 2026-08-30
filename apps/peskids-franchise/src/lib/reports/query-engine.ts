import { db } from "@/lib/db";

interface DateRange {
  start: Date;
  end: Date;
}

interface ReportFilters {
  dateRange?: DateRange;
  [key: string]: any;
}

export async function executeReportQuery(
  dataSource: string,
  filters: ReportFilters
): Promise<{ rows: Record<string, any>[]; columns: string[] }> {
  const queryFn = DATA_SOURCE_QUERIES[dataSource];
  if (!queryFn) {
    throw new Error(`Unknown data source: ${dataSource}`);
  }
  return queryFn(filters);
}

const DATA_SOURCE_QUERIES: Record<
  string,
  (filters: ReportFilters) => Promise<{ rows: Record<string, any>[]; columns: string[] }>
> = {
  franchisee_revenue: async (filters) => {
    const currentYear = new Date().getFullYear();
    const snapshots = await db.tutorCruncherSnapshot.findMany({
      where: {
        year: filters.dateRange
          ? { gte: filters.dateRange.start.getFullYear(), lte: filters.dateRange.end.getFullYear() }
          : currentYear,
      },
      include: {
        franchiseeAccount: {
          include: {
            prospect: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    const rows = snapshots.map((s) => ({
      franchisee: `${s.franchiseeAccount.prospect.firstName} ${s.franchiseeAccount.prospect.lastName}`,
      email: s.franchiseeAccount.prospect.email,
      year: s.year,
      month: s.month,
      grossRevenue: Number(s.grossRevenue),
      homeRevenue: s.homeRevenue ? Number(s.homeRevenue) : 0,
      onlineRevenue: s.onlineRevenue ? Number(s.onlineRevenue) : 0,
      retailRevenue: s.retailRevenue ? Number(s.retailRevenue) : 0,
      schoolRevenue: s.schoolRevenue ? Number(s.schoolRevenue) : 0,
      totalLessons: s.totalLessons || 0,
      activeStudents: s.activeStudents || 0,
    }));

    return {
      rows,
      columns: [
        "franchisee", "email", "year", "month", "grossRevenue",
        "homeRevenue", "onlineRevenue", "retailRevenue", "schoolRevenue",
        "totalLessons", "activeStudents",
      ],
    };
  },

  royalty_invoices: async (filters) => {
    const where: any = {};
    if (filters.dateRange) {
      where.invoiceDate = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    const invoices = await db.royaltyInvoice.findMany({
      where,
      include: {
        franchiseeAccount: {
          include: {
            prospect: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { invoiceDate: "desc" },
    });

    const rows = invoices.map((inv) => ({
      franchisee: `${inv.franchiseeAccount.prospect.firstName} ${inv.franchiseeAccount.prospect.lastName}`,
      email: inv.franchiseeAccount.prospect.email,
      invoiceDate: inv.invoiceDate.toISOString().split("T")[0],
      year: inv.year,
      month: inv.month,
      grossRevenue: Number(inv.grossRevenue),
      royaltyAmount: Number(inv.royaltyAmount),
      brandFundAmount: Number(inv.brandFundAmount),
      systemsFeeAmount: Number(inv.systemsFeeAmount),
      totalAmount: Number(inv.totalAmount),
      status: inv.status,
    }));

    return {
      rows,
      columns: [
        "franchisee", "email", "invoiceDate", "year", "month",
        "grossRevenue", "royaltyAmount", "brandFundAmount",
        "systemsFeeAmount", "totalAmount", "status",
      ],
    };
  },

  health_scores: async (filters) => {
    const where: any = {};
    if (filters.dateRange) {
      where.createdAt = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    const scores = await db.healthScore.findMany({
      where,
      include: {
        franchiseeAccount: {
          include: {
            prospect: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = scores.map((s) => ({
      franchisee: `${s.franchiseeAccount.prospect.firstName} ${s.franchiseeAccount.prospect.lastName}`,
      email: s.franchiseeAccount.prospect.email,
      year: s.year,
      month: s.month,
      compositeScore: s.compositeScore,
      financialScore: s.financialScore,
      operationalScore: s.operationalScore,
      complianceScore: s.complianceScore,
      engagementScore: s.engagementScore,
      growthScore: s.growthScore,
      riskLevel: s.riskLevel,
      createdAt: s.createdAt.toISOString().split("T")[0],
    }));

    return {
      rows,
      columns: [
        "franchisee", "email", "year", "month", "compositeScore",
        "financialScore", "operationalScore", "complianceScore",
        "engagementScore", "growthScore", "riskLevel", "createdAt",
      ],
    };
  },

  compliance: async () => {
    const certs = await db.franchiseeCertification.findMany({
      include: {
        franchiseeAccount: {
          include: {
            prospect: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        certification: { select: { name: true, category: true } },
      },
      orderBy: { expiresAt: "asc" },
    });

    const rows = certs.map((c) => ({
      franchisee: `${c.franchiseeAccount.prospect.firstName} ${c.franchiseeAccount.prospect.lastName}`,
      email: c.franchiseeAccount.prospect.email,
      certification: c.certification.name,
      category: c.certification.category,
      status: c.status,
      earnedAt: c.earnedAt.toISOString().split("T")[0],
      expiresAt: c.expiresAt ? c.expiresAt.toISOString().split("T")[0] : "",
    }));

    return {
      rows,
      columns: [
        "franchisee", "email", "certification", "category",
        "status", "earnedAt", "expiresAt",
      ],
    };
  },

  pipeline: async (filters) => {
    const where: any = {};
    if (filters.dateRange) {
      where.createdAt = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    const prospects = await db.prospect.findMany({
      where,
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        pipelineStage: true,
        referralSource: true,
        preferredTerritory: true,
        createdAt: true,
        selectedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = prospects.map((p) => ({
      name: `${p.firstName} ${p.lastName}`,
      email: p.email,
      phone: p.phone || "",
      pipelineStage: p.pipelineStage,
      referralSource: p.referralSource || "",
      preferredTerritory: p.preferredTerritory || "",
      createdAt: p.createdAt.toISOString().split("T")[0],
      selectedAt: p.selectedAt ? p.selectedAt.toISOString().split("T")[0] : "",
    }));

    return {
      rows,
      columns: [
        "name", "email", "phone", "pipelineStage",
        "referralSource", "preferredTerritory", "createdAt", "selectedAt",
      ],
    };
  },

  agreements: async () => {
    const agreements = await db.franchiseAgreement.findMany({
      include: {
        franchiseeAccount: {
          include: {
            prospect: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = agreements.map((a) => ({
      franchisee: `${a.franchiseeAccount.prospect.firstName} ${a.franchiseeAccount.prospect.lastName}`,
      email: a.franchiseeAccount.prospect.email,
      agreementType: a.agreementNumber,
      status: a.status,
      startDate: a.startDate.toISOString().split("T")[0],
      endDate: a.endDate.toISOString().split("T")[0],
      signedAt: a.signedAt ? a.signedAt.toISOString().split("T")[0] : "",
    }));

    return {
      rows,
      columns: [
        "franchisee", "email", "agreementType", "status",
        "startDate", "endDate", "signedAt",
      ],
    };
  },
};
