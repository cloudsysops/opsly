import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Phase 3 data...");

  // Seed Health Score Weights (default configuration)
  console.log("Creating default health score weights...");
  await prisma.healthScoreWeight.upsert({
    where: { id: "default-health-score-weights" },
    update: {},
    create: {
      id: "default-health-score-weights",
      financialWeight: 30,
      operationalWeight: 25,
      complianceWeight: 20,
      engagementWeight: 15,
      growthWeight: 10,
      financialComponents: {
        revenueGrowth: 40,
        collectionRate: 30,
        profitMargin: 30,
      },
      operationalComponents: {
        lessonsDelivered: 40,
        studentRetention: 30,
        tutorUtilization: 30,
      },
      complianceComponents: {
        certifications: 50,
        audits: 30,
        documents: 20,
      },
      engagementComponents: {
        academyProgress: 40,
        supportTickets: 30,
        communication: 30,
      },
      growthComponents: {
        newStudents: 50,
        marketExpansion: 30,
        revenueGrowth: 20,
      },
      criticalThreshold: 40,
      highRiskThreshold: 55,
      elevatedThreshold: 70,
      moderateThreshold: 85,
      isActive: true,
    },
  });

  // Seed System Reports
  console.log("Creating system reports...");
  const systemReports = [
    {
      slug: "monthly-revenue-summary",
      name: "Monthly Revenue Summary",
      description: "Overview of network-wide revenue performance by month",
      reportType: "FINANCIAL",
      dataSource: "franchisee_revenue",
      chartType: "BAR",
      metrics: [
        { field: "grossRevenue", aggregation: "sum", label: "Total Revenue" },
        { field: "grossRevenue", aggregation: "avg", label: "Average Revenue" },
      ],
      dimensions: [{ field: "month", label: "Month" }],
      filters: [],
    },
    {
      slug: "franchisee-performance-ranking",
      name: "Franchisee Performance Ranking",
      description: "Ranked list of franchisees by revenue and operational metrics",
      reportType: "PERFORMANCE",
      dataSource: "franchisee_revenue",
      chartType: "TABLE",
      metrics: [
        { field: "grossRevenue", aggregation: "sum", label: "Revenue" },
        { field: "totalLessons", aggregation: "sum", label: "Lessons" },
        { field: "activeStudents", aggregation: "max", label: "Students" },
      ],
      dimensions: [{ field: "franchisee", label: "Franchisee" }],
      filters: [],
    },
    {
      slug: "royalty-collection-report",
      name: "Royalty Collection Report",
      description: "Status of royalty invoices and collection rates",
      reportType: "FINANCIAL",
      dataSource: "royalty_invoices",
      chartType: "PIE",
      metrics: [
        { field: "totalAmount", aggregation: "sum", label: "Total Due" },
        { field: "paidAmount", aggregation: "sum", label: "Collected" },
      ],
      dimensions: [{ field: "status", label: "Status" }],
      filters: [],
    },
    {
      slug: "health-score-overview",
      name: "Health Score Overview",
      description: "Distribution of franchisee health scores and risk levels",
      reportType: "PERFORMANCE",
      dataSource: "health_scores",
      chartType: "DONUT",
      metrics: [{ field: "count", aggregation: "count", label: "Franchisees" }],
      dimensions: [{ field: "riskLevel", label: "Risk Level" }],
      filters: [],
    },
    {
      slug: "compliance-status-report",
      name: "Compliance Status Report",
      description: "Certification and compliance status across the network",
      reportType: "COMPLIANCE",
      dataSource: "compliance",
      chartType: "TABLE",
      metrics: [
        { field: "validCount", aggregation: "sum", label: "Valid" },
        { field: "expiredCount", aggregation: "sum", label: "Expired" },
        { field: "pendingCount", aggregation: "sum", label: "Pending" },
      ],
      dimensions: [{ field: "certification", label: "Certification" }],
      filters: [],
    },
    {
      slug: "agreement-renewal-pipeline",
      name: "Agreement Renewal Pipeline",
      description: "Upcoming agreement renewals and their status",
      reportType: "OPERATIONAL",
      dataSource: "agreements",
      chartType: "TABLE",
      metrics: [],
      dimensions: [
        { field: "franchisee", label: "Franchisee" },
        { field: "endDate", label: "End Date" },
        { field: "status", label: "Status" },
      ],
      filters: [{ field: "daysUntilExpiry", operator: "lte", value: 365 }],
    },
  ];

  for (const report of systemReports) {
    await prisma.customReport.upsert({
      where: { slug: report.slug },
      update: {
        name: report.name,
        description: report.description,
        reportType: report.reportType as any,
        dataSource: report.dataSource,
        chartType: report.chartType as any,
        metrics: report.metrics,
        dimensions: report.dimensions,
        filters: report.filters,
      },
      create: {
        ...report,
        reportType: report.reportType as any,
        chartType: report.chartType as any,
        isSystem: true,
        isPublic: false,
        createdBy: "system",
      },
    });
    console.log(`  Created/updated report: ${report.name}`);
  }

  console.log("\nPhase 3 seeding complete!");
  console.log("\nCreated:");
  console.log("  - Default health score weights configuration");
  console.log(`  - ${systemReports.length} system reports`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
