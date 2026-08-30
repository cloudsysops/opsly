import { PrismaClient, CompanyType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding industry benchmarks...\n");

  // ============================================
  // INDUSTRY BENCHMARKS
  // ============================================

  const benchmarks = [
    // Potential Acquirers
    {
      companyName: "Stronger Youth Brands",
      companyType: CompanyType.ACQUIRER,
      parentCompany: null,
      category: "youth-sports",
      dataYear: 2024,
      systemWideRevenue: 130000000, // Combined Soccer Shots + Little Kickers
      franchiseeCount: 600,
      totalUnits: 650,
      countriesOperating: 30,
      childrenEnrolled: 666000, // 600K Soccer Shots + 66K Little Kickers
      fundingRaised: 125000000,
      dataSource: "PitchBook, Press Releases",
      sourceUrl: "https://pitchbook.com/profiles/company/131752-45",
      notes:
        "Platform launched Jan 2022 with Susquehanna Private Capital investment. Acquired Little Kickers Oct 2022.",
    },

    // Flagship Brand - Soccer Shots
    {
      companyName: "Soccer Shots",
      companyType: CompanyType.ACQUISITION_TARGET,
      parentCompany: "Stronger Youth Brands",
      category: "youth-sports",
      dataYear: 2024,
      systemWideRevenue: 105000000,
      franchiseeCount: 306,
      companyOwnedUnits: 23,
      totalUnits: 329,
      avgRevenuePerUnit: 272000,
      medianRevenuePerUnit: 243000,
      topPerformerRevenue: 650401, // Top single territory
      initialInvestmentLow: 43000,
      initialInvestmentHigh: 54000,
      royaltyRate: 7,
      adFundRate: 1,
      childrenEnrolled: 600000,
      territoryPopulation: 500000,
      dataSource: "FDD Item 19, Franchise Times Top 400",
      sourceUrl:
        "https://www.franchisechatter.com/2024/02/16/fdd-talk-soccer-shots-franchise-costs-fees-average-revenues-and-or-profits-2024-review/",
      notes:
        "Top systemwide earner: $4.7M (multi-territory). 43 states + 2 Canadian provinces.",
    },

    // Little Kickers
    {
      companyName: "Little Kickers",
      companyType: CompanyType.ACQUISITION_TARGET,
      parentCompany: "Stronger Youth Brands",
      category: "youth-sports",
      dataYear: 2024,
      systemWideRevenue: 29000000, // £23M converted
      franchiseeCount: 335,
      totalUnits: 335,
      countriesOperating: 34,
      childrenEnrolled: 66000, // Weekly enrollment
      dataSource: "What Franchise UK",
      sourceUrl:
        "https://www.what-franchise.com/franchise-opportunities/children-franchises/little-kickers",
      notes: "Global presence across 6 continents. Founded UK 2002.",
    },

    // Comparable Competitors
    {
      companyName: "Mathnasium",
      companyType: CompanyType.COMPETITOR,
      parentCompany: null,
      category: "tutoring",
      dataYear: 2024,
      franchiseeCount: 1100,
      avgRevenuePerUnit: 344000,
      initialInvestmentLow: 112000,
      initialInvestmentHigh: 149000,
      royaltyRate: 10,
      dataSource: "FranchiseChatter FDD Review",
      sourceUrl:
        "https://www.franchisechatter.com/2024/07/02/fdd-talk-mathnasium-franchise-costs-fees-average-revenues-and-or-profits-2024-review/",
      notes: "Math-only tutoring franchise. Strong brand recognition.",
    },

    {
      companyName: "Kumon",
      companyType: CompanyType.COMPETITOR,
      parentCompany: null,
      category: "tutoring",
      dataYear: 2024,
      franchiseeCount: 26000,
      totalUnits: 26000,
      avgRevenuePerUnit: 235000, // Midpoint of $173K-$300K range
      initialInvestmentLow: 70000,
      initialInvestmentHigh: 150000,
      dataSource: "Sharpsheets, Vetted Biz",
      sourceUrl: "https://sharpsheets.io/blog/kumon-franchise-costs-fees-profits-2024/",
      notes: "Largest tutoring franchise globally. Math and reading focus.",
    },

    {
      companyName: "The Little Gym",
      companyType: CompanyType.COMPETITOR,
      parentCompany: null,
      category: "enrichment",
      dataYear: 2024,
      franchiseeCount: 400,
      avgRevenuePerUnit: 626000,
      initialInvestmentLow: 465000,
      initialInvestmentHigh: 637000,
      royaltyRate: 8,
      operatingMargin: 42.4, // EBITDA margin from FDD
      yoyGrowthRate: 24, // Same-store sales growth
      dataSource: "The Little Gym FDD, Press Release",
      sourceUrl:
        "https://www.franchisechatter.com/2024/03/01/fdd-talk-the-little-gym-franchise-costs-fees-average-revenues-and-or-profits-2024-review/",
      notes: "Record store sales in 2024. 82 new franchises awarded.",
    },

    {
      companyName: "Sylvan Learning",
      companyType: CompanyType.COMPETITOR,
      parentCompany: null,
      category: "tutoring",
      dataYear: 2024,
      topQuartileRevenue: 518159, // Top 25% gross revenue
      dataSource: "Sylvan Learning FDD",
      notes: "Established tutoring brand. Higher investment than Kumon.",
    },

    // High-investment comparables (growth trajectory reference)
    {
      companyName: "Primrose Schools",
      companyType: CompanyType.INDUSTRY_BENCHMARK,
      parentCompany: null,
      category: "childcare",
      dataYear: 2024,
      franchiseeCount: 499,
      avgRevenuePerUnit: 2630000,
      avgEBITDAPerUnit: 500000,
      initialInvestmentLow: 742000,
      initialInvestmentHigh: 8590000,
      dataSource: "FranchiseChatter FDD Review",
      sourceUrl:
        "https://www.franchisechatter.com/2024/10/01/fdd-talk-primrose-schools-franchise-costs-fees-average-revenues-and-or-profits-2024-review/",
      notes: "Premium early education. High investment, high returns.",
    },

    {
      companyName: "Kiddie Academy",
      companyType: CompanyType.INDUSTRY_BENCHMARK,
      parentCompany: null,
      category: "childcare",
      dataYear: 2024,
      franchiseeCount: 280,
      avgRevenuePerUnit: 2060000,
      avgEBITDAPerUnit: 238077,
      initialInvestmentLow: 405000,
      initialInvestmentHigh: 1050000,
      dataSource: "FranchiseChatter FDD Review",
      sourceUrl:
        "https://www.franchisechatter.com/2024/09/20/fdd-talk-kiddie-academy-franchise-costs-fees-average-revenues-and-or-profits-2024-review/",
      notes: "Childcare franchise with educational curriculum.",
    },

    {
      companyName: "The Goddard School",
      companyType: CompanyType.INDUSTRY_BENCHMARK,
      parentCompany: null,
      category: "childcare",
      dataYear: 2024,
      franchiseeCount: 600,
      avgRevenuePerUnit: 2000000,
      avgEBITDAPerUnit: 521987,
      initialInvestmentLow: 700000,
      dataSource: "Franshares Analysis",
      sourceUrl: "https://franshares.com/the-best-child-care-franchises-of-2024/",
      notes: "Based on 2024 results of schools open 18+ months.",
    },
  ];

  console.log("Creating industry benchmarks...");
  for (const benchmark of benchmarks) {
    await prisma.industryBenchmark.upsert({
      where: {
        companyName_dataYear: {
          companyName: benchmark.companyName,
          dataYear: benchmark.dataYear,
        },
      },
      update: benchmark,
      create: benchmark,
    });
    console.log(`  ✓ ${benchmark.companyName} (${benchmark.dataYear})`);
  }

  // ============================================
  // GROWTH MILESTONES
  // ============================================

  const milestones = [
    {
      name: "Year 1",
      targetYear: 2027,
      displayOrder: 1,
      systemWideRevenueTarget: 1500000,
      avgRevenuePerUnitTarget: 200000,
      franchiseeCountTarget: 8,
      statesTarget: 5,
      operatingMarginTarget: 15,
      comparableCompany: "Early-stage Soccer Shots",
      comparableNotes: "Prove unit economics and franchisee success model",
      keyObjectives: [
        "Prove unit economics with $200K+ avg/territory",
        "Achieve 75%+ franchisee satisfaction",
        "Multi-state presence (5+ states)",
        "Establish repeatable training & support model",
      ],
    },
    {
      name: "Year 3",
      targetYear: 2029,
      displayOrder: 2,
      systemWideRevenueTarget: 10000000,
      avgRevenuePerUnitTarget: 250000,
      franchiseeCountTarget: 40,
      statesTarget: 15,
      childrenEnrolledTarget: 50000,
      operatingMarginTarget: 18,
      franchiseeRetentionTarget: 90,
      comparableCompany: "Soccer Shots pre-PE investment",
      comparableNotes: "Demonstrate scalable franchise model",
      keyObjectives: [
        "40+ franchisees across 15+ states",
        "90%+ franchisee renewal rate",
        "$250K+ average revenue per territory",
        "National brand awareness in chess/education space",
        "Proven marketing playbook for franchisees",
      ],
    },
    {
      name: "Year 5",
      targetYear: 2031,
      displayOrder: 3,
      systemWideRevenueTarget: 30000000,
      avgRevenuePerUnitTarget: 270000,
      franchiseeCountTarget: 110,
      statesTarget: 30,
      childrenEnrolledTarget: 150000,
      operatingMarginTarget: 20,
      franchiseeRetentionTarget: 92,
      comparableCompany: "Soccer Shots at 50% of current scale",
      comparableNotes: "Attractive acquisition target",
      keyObjectives: [
        "100+ franchisees, 30+ states",
        "$30M+ system-wide revenue",
        "Unit economics matching/exceeding Soccer Shots",
        "Strong Item 19 disclosure for franchise sales",
        "PE-ready operations and reporting",
      ],
    },
    {
      name: "Acquisition Ready",
      targetYear: 2033,
      displayOrder: 4,
      systemWideRevenueTarget: 75000000,
      avgRevenuePerUnitTarget: 280000,
      franchiseeCountTarget: 260,
      statesTarget: 43,
      childrenEnrolledTarget: 400000,
      operatingMarginTarget: 22,
      franchiseeRetentionTarget: 95,
      comparableCompany: "Soccer Shots at SYB investment (2022)",
      comparableNotes:
        "Match Soccer Shots profile when Susquehanna invested. $105M system revenue, 300+ franchisees.",
      keyObjectives: [
        "Match Soccer Shots scale at PE investment",
        "250+ franchisees, national presence",
        "Strong competitive moat (chess education niche)",
        "Documented playbooks for all operations",
        "Clean financials, audit-ready",
        "Attractive to strategic acquirers (SYB, youth enrichment platforms)",
      ],
    },
  ];

  console.log("\nCreating growth milestones...");
  for (const milestone of milestones) {
    await prisma.growthMilestone.upsert({
      where: {
        id: `milestone-${milestone.name.toLowerCase().replace(/\s+/g, "-")}`,
      },
      update: milestone,
      create: {
        id: `milestone-${milestone.name.toLowerCase().replace(/\s+/g, "-")}`,
        ...milestone,
      },
    });
    console.log(`  ✓ ${milestone.name} (Target: ${milestone.targetYear})`);
  }

  console.log("\n✅ Industry benchmarks seeding complete!");
  console.log(`\nCreated:`);
  console.log(`  - ${benchmarks.length} industry benchmarks`);
  console.log(`  - ${milestones.length} growth milestones`);
  console.log(`\nView at: /admin/analytics/industry-benchmarks`);
  console.log(`Manage at: /admin/settings/benchmarks`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
