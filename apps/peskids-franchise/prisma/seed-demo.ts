/**
 * Comprehensive demo seed for Franchise Manager portfolio demo.
 * Creates realistic fake data across all dashboard-visible tables:
 * - Prospects across pipeline stages
 * - Selected franchisees with accounts
 * - Academy programs, phases, modules
 * - Revenue snapshots (TutorCruncher)
 * - Royalty invoices & payments
 * - Certifications
 * - Support tickets
 * - Field audits & corrective actions
 * - Activity feed
 * - Markets/territories
 * - Pre-work modules & submissions
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400000);
}
function hoursAgo(n: number) {
  return new Date(Date.now() - n * 3600000);
}
function monthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

async function main() {
  console.log("🌱 Seeding demo data...\n");

  // ─── Pre-Work Modules ───────────────────────────────────
  console.log("Creating pre-work modules...");
  const preWorkModules = await Promise.all([
    prisma.preWorkModule.upsert({
      where: { slug: "territory" },
      update: {},
      create: {
        slug: "territory",
        title: "Territory Builder",
        description: "Map your territory, identify schools, and build your target list.",
        instructions: "<p>Define the geographic territory where you plan to operate.</p>",
        sequence: 1,
        isRequired: true,
        submissionType: "FORM",
      },
    }),
    prisma.preWorkModule.upsert({
      where: { slug: "research" },
      update: {},
      create: {
        slug: "research",
        title: "Market Research",
        description: "Analyze your local market, competition, and demographic fit.",
        instructions: "<p>Conduct thorough market research for your territory.</p>",
        sequence: 2,
        isRequired: true,
        submissionType: "FORM",
      },
    }),
    prisma.preWorkModule.upsert({
      where: { slug: "outreach" },
      update: {},
      create: {
        slug: "outreach",
        title: "School Outreach Plan",
        description: "Create a 90-day outreach plan to build school partnerships.",
        instructions: "<p>Build your outreach strategy and target list.</p>",
        sequence: 3,
        isRequired: true,
        submissionType: "FORM",
      },
    }),
    prisma.preWorkModule.upsert({
      where: { slug: "business-plan" },
      update: {},
      create: {
        slug: "business-plan",
        title: "Business Plan",
        description: "Draft a first-year business plan with revenue projections.",
        instructions: "<p>Create a comprehensive business plan.</p>",
        sequence: 4,
        isRequired: true,
        submissionType: "TEXT",
      },
    }),
    prisma.preWorkModule.upsert({
      where: { slug: "video-intro" },
      update: {},
      create: {
        slug: "video-intro",
        title: "Video Introduction",
        description: "Record a 3-5 minute video introducing yourself and your vision.",
        instructions: "<p>Share your story and passion for education.</p>",
        sequence: 5,
        isRequired: true,
        submissionType: "VIDEO_LOOM",
      },
    }),
  ]);

  // ─── Prospects (pipeline stages) ────────────────────────
  console.log("Creating prospects...");

  const prospectData = [
    // NEW_INQUIRY (5)
    { email: "sarah.chen@demo.com", firstName: "Sarah", lastName: "Chen", territory: "Austin, TX", stage: "NEW_INQUIRY" as const, interest: "READY_TO_START" as const, score: 65, created: daysAgo(2) },
    { email: "james.wright@demo.com", firstName: "James", lastName: "Wright", territory: "Denver, CO", stage: "NEW_INQUIRY" as const, interest: "SERIOUSLY_CONSIDERING" as const, score: 45, created: daysAgo(1) },
    { email: "maria.santos@demo.com", firstName: "Maria", lastName: "Santos", territory: "Phoenix, AZ", stage: "NEW_INQUIRY" as const, interest: "GATHERING_INFORMATION" as const, score: 30, created: hoursAgo(18) },
    { email: "kevin.park@demo.com", firstName: "Kevin", lastName: "Park", territory: "Portland, OR", stage: "NEW_INQUIRY" as const, interest: "ACTIVELY_SEEKING_FUNDING" as const, score: 55, created: hoursAgo(6) },
    { email: "lisa.taylor@demo.com", firstName: "Lisa", lastName: "Taylor", territory: "Charlotte, NC", stage: "NEW_INQUIRY" as const, interest: "JUST_EXPLORING" as const, score: 20, created: hoursAgo(3) },
    // INITIAL_CONTACT (3)
    { email: "mike.johnson@demo.com", firstName: "Mike", lastName: "Johnson", territory: "Nashville, TN", stage: "INITIAL_CONTACT" as const, interest: "SERIOUSLY_CONSIDERING" as const, score: 60, created: daysAgo(8) },
    { email: "priya.patel@demo.com", firstName: "Priya", lastName: "Patel", territory: "Raleigh, NC", stage: "INITIAL_CONTACT" as const, interest: "READY_TO_START" as const, score: 70, created: daysAgo(6) },
    { email: "david.kim@demo.com", firstName: "David", lastName: "Kim", territory: "San Diego, CA", stage: "INITIAL_CONTACT" as const, interest: "ACTIVELY_SEEKING_FUNDING" as const, score: 55, created: daysAgo(5) },
    // DISCOVERY_CALL (3)
    { email: "rachel.green@demo.com", firstName: "Rachel", lastName: "Green", territory: "Minneapolis, MN", stage: "DISCOVERY_CALL" as const, interest: "READY_TO_START" as const, score: 75, created: daysAgo(14) },
    { email: "tom.anderson@demo.com", firstName: "Tom", lastName: "Anderson", territory: "Tampa, FL", stage: "DISCOVERY_CALL" as const, interest: "SERIOUSLY_CONSIDERING" as const, score: 68, created: daysAgo(12) },
    { email: "nina.martinez@demo.com", firstName: "Nina", lastName: "Martinez", territory: "Dallas, TX", stage: "DISCOVERY_CALL" as const, interest: "READY_TO_START" as const, score: 72, created: daysAgo(10) },
    // PRE_WORK_IN_PROGRESS (2)
    { email: "alex.rivera@demo.com", firstName: "Alex", lastName: "Rivera", territory: "Atlanta, GA", stage: "PRE_WORK_IN_PROGRESS" as const, interest: "READY_TO_START" as const, score: 80, created: daysAgo(25), preWork: "IN_PROGRESS" as const },
    { email: "emma.davis@demo.com", firstName: "Emma", lastName: "Davis", territory: "Chicago, IL", stage: "PRE_WORK_IN_PROGRESS" as const, interest: "READY_TO_START" as const, score: 78, created: daysAgo(20), preWork: "IN_PROGRESS" as const },
    // PRE_WORK_COMPLETE (2)
    { email: "ryan.mitchell@demo.com", firstName: "Ryan", lastName: "Mitchell", territory: "Seattle, WA", stage: "PRE_WORK_COMPLETE" as const, interest: "READY_TO_START" as const, score: 88, created: daysAgo(35), preWork: "APPROVED" as const },
    { email: "grace.lee@demo.com", firstName: "Grace", lastName: "Lee", territory: "Boston, MA", stage: "PRE_WORK_COMPLETE" as const, interest: "READY_TO_START" as const, score: 85, created: daysAgo(30), preWork: "APPROVED" as const },
    // INTERVIEW (2)
    { email: "carlos.garcia@demo.com", firstName: "Carlos", lastName: "Garcia", territory: "Houston, TX", stage: "INTERVIEW" as const, interest: "READY_TO_START" as const, score: 90, created: daysAgo(45), preWork: "APPROVED" as const },
    { email: "hannah.brooks@demo.com", firstName: "Hannah", lastName: "Brooks", territory: "San Antonio, TX", stage: "INTERVIEW" as const, interest: "READY_TO_START" as const, score: 87, created: daysAgo(40), preWork: "APPROVED" as const },
    // SELECTION_REVIEW (1)
    { email: "ben.foster@demo.com", firstName: "Ben", lastName: "Foster", territory: "Orlando, FL", stage: "SELECTION_REVIEW" as const, interest: "READY_TO_START" as const, score: 92, created: daysAgo(55), preWork: "APPROVED" as const },
    // SELECTED (franchisees - 5)
    { email: "jessica.nguyen@demo.com", firstName: "Jessica", lastName: "Nguyen", territory: "Nashville, TN", stage: "SELECTED" as const, interest: "READY_TO_START" as const, score: 95, created: monthsAgo(8), preWork: "APPROVED" as const, selected: monthsAgo(6) },
    { email: "marcus.thompson@demo.com", firstName: "Marcus", lastName: "Thompson", territory: "Orlando, FL", stage: "SELECTED" as const, interest: "READY_TO_START" as const, score: 93, created: monthsAgo(10), preWork: "APPROVED" as const, selected: monthsAgo(7) },
    { email: "amanda.walsh@demo.com", firstName: "Amanda", lastName: "Walsh", territory: "Austin, TX", stage: "SELECTED" as const, interest: "READY_TO_START" as const, score: 91, created: monthsAgo(6), preWork: "APPROVED" as const, selected: monthsAgo(4) },
    { email: "derek.huang@demo.com", firstName: "Derek", lastName: "Huang", territory: "San Diego, CA", stage: "SELECTED" as const, interest: "READY_TO_START" as const, score: 96, created: monthsAgo(12), preWork: "APPROVED" as const, selected: monthsAgo(9) },
    { email: "olivia.moore@demo.com", firstName: "Olivia", lastName: "Moore", territory: "Charlotte, NC", stage: "SELECTED" as const, interest: "READY_TO_START" as const, score: 89, created: monthsAgo(5), preWork: "APPROVED" as const, selected: monthsAgo(3) },
    // REJECTED (2)
    { email: "tyler.smith@demo.com", firstName: "Tyler", lastName: "Smith", territory: "Detroit, MI", stage: "REJECTED" as const, interest: "JUST_EXPLORING" as const, score: 25, created: daysAgo(60) },
    { email: "ashley.brown@demo.com", firstName: "Ashley", lastName: "Brown", territory: "Cleveland, OH", stage: "REJECTED" as const, interest: "GATHERING_INFORMATION" as const, score: 30, created: daysAgo(45) },
    // WITHDRAWN (1)
    { email: "jason.white@demo.com", firstName: "Jason", lastName: "White", territory: "Milwaukee, WI", stage: "WITHDRAWN" as const, interest: "SERIOUSLY_CONSIDERING" as const, score: 50, created: daysAgo(30) },
  ];

  const prospects: Array<{ id: string; email: string; firstName: string; lastName: string; stage: string }> = [];

  for (const p of prospectData) {
    const prospect = await prisma.prospect.upsert({
      where: { email: p.email },
      update: { pipelineStage: p.stage, prospectScore: p.score },
      create: {
        email: p.email,
        firstName: p.firstName,
        lastName: p.lastName,
        preferredTerritory: p.territory,
        interestLevel: p.interest,
        pipelineStage: p.stage,
        prospectScore: p.score,
        preWorkStatus: p.preWork || "NOT_STARTED",
        createdAt: p.created,
        updatedAt: p.stage === "NEW_INQUIRY" ? p.created : daysAgo(1),
        selectedAt: (p as any).selected || null,
        liquidity: p.score > 80 ? "RANGE_100K_250K" : p.score > 60 ? "RANGE_50K_100K" : "UNDER_50K",
        phone: `555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      },
    });
    prospects.push({ id: prospect.id, email: p.email, firstName: p.firstName, lastName: p.lastName, stage: p.stage });
  }

  console.log(`  Created ${prospects.length} prospects`);

  // ─── Franchisee Accounts ────────────────────────────────
  console.log("Creating franchisee accounts...");

  const selectedProspects = prospects.filter(p => p.stage === "SELECTED");
  const franchiseeAccounts: Array<{ id: string; prospectId: string; name: string }> = [];

  const franchiseeDetails = [
    { ein: "47-1234567", llcName: "Nguyen Education LLC", launchDate: monthsAgo(4) },
    { ein: "59-2345678", llcName: "Thompson Learning Inc", launchDate: monthsAgo(5) },
    { ein: "73-3456789", llcName: "Walsh Enrichment LLC", launchDate: monthsAgo(2) },
    { ein: "91-4567890", llcName: "Huang Academy Corp", launchDate: monthsAgo(7) },
    { ein: "35-5678901", llcName: "Moore Education Group", launchDate: monthsAgo(1) },
  ];

  for (let i = 0; i < selectedProspects.length; i++) {
    const sp = selectedProspects[i];
    const details = franchiseeDetails[i];
    const existing = await prisma.franchiseeAccount.findUnique({ where: { prospectId: sp.id } });
    const account = existing || await prisma.franchiseeAccount.create({
      data: {
        prospectId: sp.id,
        ein: details.ein,
        llcName: details.llcName,
        launchDate: details.launchDate,
      },
    });
    franchiseeAccounts.push({ id: account.id, prospectId: sp.id, name: `${sp.firstName} ${sp.lastName}` });
  }

  console.log(`  Created ${franchiseeAccounts.length} franchisee accounts`);

  // ─── Markets / Territories ──────────────────────────────
  console.log("Creating markets...");

  const marketsData = [
    { name: "Nashville Metro", state: "TN", status: "ACTIVE" as const, lat: 36.1627, lng: -86.7816, pop: 715884, income: 62000, score: 87, accountIdx: 0 },
    { name: "Orlando Metro", state: "FL", status: "ACTIVE" as const, lat: 28.5383, lng: -81.3792, pop: 309154, income: 55000, score: 82, accountIdx: 1 },
    { name: "Austin Metro", state: "TX", status: "ACTIVE" as const, lat: 30.2672, lng: -97.7431, pop: 978908, income: 75000, score: 91, accountIdx: 2 },
    { name: "San Diego County", state: "CA", status: "ACTIVE" as const, lat: 32.7157, lng: -117.1611, pop: 1425976, income: 82000, score: 89, accountIdx: 3 },
    { name: "Charlotte Metro", state: "NC", status: "ACTIVE" as const, lat: 35.2271, lng: -80.8431, pop: 874579, income: 63000, score: 85, accountIdx: 4 },
    { name: "Denver Metro", state: "CO", status: "AVAILABLE" as const, lat: 39.7392, lng: -104.9903, pop: 727211, income: 72000, score: 88 },
    { name: "Seattle Metro", state: "WA", status: "RESERVED" as const, lat: 47.6062, lng: -122.3321, pop: 749256, income: 90000, score: 90 },
    { name: "Houston Metro", state: "TX", status: "AVAILABLE" as const, lat: 29.7604, lng: -95.3698, pop: 2304580, income: 58000, score: 84 },
    { name: "Atlanta Metro", state: "GA", status: "AVAILABLE" as const, lat: 33.7490, lng: -84.3880, pop: 498715, income: 65000, score: 86 },
    { name: "Boston Metro", state: "MA", status: "COMING_SOON" as const, lat: 42.3601, lng: -71.0589, pop: 692600, income: 85000, score: 92 },
  ];

  for (const m of marketsData) {
    await prisma.market.upsert({
      where: { name_state: { name: m.name, state: m.state } },
      update: {},
      create: {
        name: m.name,
        state: m.state,
        status: m.status,
        centerLat: m.lat,
        centerLng: m.lng,
        population: m.pop,
        medianIncome: m.income,
        territoryScore: m.score,
        franchiseeAccountId: m.accountIdx !== undefined ? franchiseeAccounts[m.accountIdx]?.id : undefined,
        assignedAt: m.accountIdx !== undefined ? monthsAgo(3) : undefined,
      },
    });
  }

  // ─── Academy Program + Phases + Modules ─────────────────
  console.log("Creating academy program...");

  const program = await prisma.academyProgram.upsert({
    where: { slug: "90-day-launch" },
    update: {},
    create: {
      slug: "90-day-launch",
      name: "90-Day Launch Program",
      description: "Comprehensive onboarding program to get new franchisees from selection to first revenue.",
      programType: "ONBOARDING",
      isActive: true,
      isDefault: true,
      sequence: 1,
    },
  });

  const phasesData = [
    { slug: "foundations", title: "Foundations", desc: "Business setup, legal, insurance, banking", dayStart: 1, dayEnd: 14, order: 1 },
    { slug: "training", title: "Core Training", desc: "Curriculum mastery, teaching methodology, chess instruction", dayStart: 15, dayEnd: 35, order: 2 },
    { slug: "marketing-launch", title: "Marketing & Outreach", desc: "Build your brand, school outreach, community partnerships", dayStart: 36, dayEnd: 55, order: 3 },
    { slug: "operations", title: "Operations Setup", desc: "Systems, scheduling, hiring tutors, pricing", dayStart: 56, dayEnd: 75, order: 4 },
    { slug: "launch", title: "Launch & First Revenue", desc: "First lessons, client onboarding, quality assurance", dayStart: 76, dayEnd: 90, order: 5 },
  ];

  const phases: Array<{ id: string; slug: string }> = [];
  for (const ph of phasesData) {
    const phase = await prisma.academyPhase.upsert({
      where: { slug: ph.slug },
      update: {},
      create: {
        slug: ph.slug,
        title: ph.title,
        description: ph.desc,
        dayStart: ph.dayStart,
        dayEnd: ph.dayEnd,
        order: ph.order,
        programId: program.id,
      },
    });
    phases.push({ id: phase.id, slug: ph.slug });
  }

  // Create modules per phase
  const modulesByPhase: Record<string, Array<{ slug: string; title: string; type: any; points: number; duration: number; owner?: any; targetDay?: number }>> = {
    foundations: [
      { slug: "form-llc", title: "Form Your LLC", type: "ASSIGNMENT", points: 15, duration: 60, owner: "FRANCHISEE", targetDay: 3 },
      { slug: "open-bank-account", title: "Open Business Bank Account", type: "ASSIGNMENT", points: 10, duration: 30, owner: "FRANCHISEE", targetDay: 5 },
      { slug: "get-insurance", title: "Obtain Business Insurance", type: "ASSIGNMENT", points: 15, duration: 45, owner: "FRANCHISEE", targetDay: 7 },
      { slug: "setup-tutorcruncher", title: "TutorCruncher Account Setup", type: "ASSIGNMENT", points: 20, duration: 90, owner: "FRANCHISOR", targetDay: 10 },
      { slug: "brand-guidelines", title: "Review Brand Guidelines", type: "READING", points: 10, duration: 20, owner: "FRANCHISEE", targetDay: 12 },
    ],
    training: [
      { slug: "curriculum-overview", title: "Curriculum Overview", type: "VIDEO", points: 10, duration: 45 },
      { slug: "teaching-methodology", title: "Teaching Methodology", type: "VIDEO", points: 15, duration: 60 },
      { slug: "lesson-planning", title: "Lesson Planning Workshop", type: "ASSIGNMENT", points: 20, duration: 90 },
      { slug: "chess-instruction", title: "Chess Instruction Fundamentals", type: "QUIZ", points: 25, duration: 120 },
      { slug: "classroom-management", title: "Classroom Management", type: "VIDEO", points: 10, duration: 30 },
      { slug: "age-appropriate-teaching", title: "Age-Appropriate Teaching", type: "READING", points: 10, duration: 25 },
    ],
    "marketing-launch": [
      { slug: "school-outreach-strategy", title: "School Outreach Strategy", type: "ASSIGNMENT", points: 20, duration: 60 },
      { slug: "marketing-materials", title: "Order Marketing Materials", type: "CHECKLIST", points: 10, duration: 15 },
      { slug: "social-media-setup", title: "Social Media Setup", type: "ASSIGNMENT", points: 15, duration: 45 },
      { slug: "first-10-schools", title: "Contact First 10 Schools", type: "ASSIGNMENT", points: 25, duration: 120 },
      { slug: "community-partnerships", title: "Community Partnership Plan", type: "ASSIGNMENT", points: 15, duration: 45 },
    ],
    operations: [
      { slug: "pricing-strategy", title: "Set Your Pricing", type: "ASSIGNMENT", points: 15, duration: 30 },
      { slug: "scheduling-system", title: "Configure Scheduling", type: "ASSIGNMENT", points: 10, duration: 45 },
      { slug: "hire-first-tutor", title: "Hire First Tutor", type: "ASSIGNMENT", points: 25, duration: 180, owner: "FRANCHISEE", targetDay: 65 },
      { slug: "tutor-training", title: "Train Your First Tutor", type: "ASSIGNMENT", points: 20, duration: 120 },
      { slug: "quality-checklist", title: "Quality Assurance Checklist", type: "CHECKLIST", points: 10, duration: 20 },
    ],
    launch: [
      { slug: "first-trial-lesson", title: "Conduct First Trial Lesson", type: "ASSIGNMENT", points: 30, duration: 60, owner: "FRANCHISEE", targetDay: 80 },
      { slug: "first-paid-client", title: "Onboard First Paid Client", type: "ASSIGNMENT", points: 30, duration: 120, owner: "FRANCHISEE", targetDay: 85 },
      { slug: "launch-celebration", title: "Launch Celebration & Review", type: "ASSIGNMENT", points: 20, duration: 30 },
    ],
  };

  const allModules: Array<{ id: string; slug: string }> = [];
  for (const phase of phases) {
    const mods = modulesByPhase[phase.slug] || [];
    for (let i = 0; i < mods.length; i++) {
      const m = mods[i];
      const mod = await prisma.academyModule.upsert({
        where: { slug: m.slug },
        update: {},
        create: {
          phaseId: phase.id,
          slug: m.slug,
          title: m.title,
          moduleType: m.type,
          points: m.points,
          duration: m.duration,
          order: i + 1,
          owner: m.owner as any || null,
          targetDay: m.targetDay || null,
        },
      });
      allModules.push({ id: mod.id, slug: m.slug });
    }
  }

  console.log(`  Created ${phases.length} phases, ${allModules.length} modules`);

  // ─── Academy Progress for Franchisees ───────────────────
  console.log("Creating academy progress...");

  // Each franchisee has different completion levels
  const completionLevels = [0.85, 0.70, 0.55, 0.95, 0.40]; // Jessica, Marcus, Amanda, Derek, Olivia

  for (let fi = 0; fi < selectedProspects.length; fi++) {
    const sp = selectedProspects[fi];
    const completionPct = completionLevels[fi];
    const completedCount = Math.floor(allModules.length * completionPct);

    for (let mi = 0; mi < allModules.length; mi++) {
      const mod = allModules[mi];
      const isCompleted = mi < completedCount;
      const isInProgress = mi === completedCount;

      try {
        await prisma.academyProgress.upsert({
          where: { prospectId_moduleId: { prospectId: sp.id, moduleId: mod.id } },
          update: {},
          create: {
            prospectId: sp.id,
            moduleId: mod.id,
            status: isCompleted ? "COMPLETED" : isInProgress ? "IN_PROGRESS" : "NOT_STARTED",
            startedAt: isCompleted || isInProgress ? daysAgo(90 - mi * 3) : null,
            completedAt: isCompleted ? daysAgo(85 - mi * 3) : null,
            pointsEarned: isCompleted ? 15 : 0,
          },
        });
      } catch { /* skip duplicates */ }
    }

    // Enroll in program
    try {
      await prisma.programEnrollment.upsert({
        where: { prospectId_programId: { prospectId: sp.id, programId: program.id } },
        update: {},
        create: {
          prospectId: sp.id,
          programId: program.id,
          status: completionPct >= 0.95 ? "COMPLETED" : "IN_PROGRESS",
          autoEnrolled: true,
          startedAt: monthsAgo(3),
          completedAt: completionPct >= 0.95 ? daysAgo(5) : null,
        },
      });
    } catch { /* skip */ }
  }

  // ─── TutorCruncher Revenue Snapshots ────────────────────
  console.log("Creating revenue snapshots...");

  const now = new Date();
  for (const fa of franchiseeAccounts) {
    for (let m = 0; m < 6; m++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - m);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;

      // Revenue grows over time; each franchisee has different base
      const baseRevenue = [12000, 9500, 7200, 15000, 5500][franchiseeAccounts.indexOf(fa)];
      const growthFactor = 1 + (6 - m) * 0.08; // ~8% growth per month
      const gross = Math.round(baseRevenue * growthFactor * (0.9 + Math.random() * 0.2));

      try {
        await prisma.tutorCruncherSnapshot.create({
          data: {
            franchiseeAccountId: fa.id,
            year,
            month,
            grossRevenue: gross,
            homeRevenue: Math.round(gross * 0.55),
            onlineRevenue: Math.round(gross * 0.25),
            retailRevenue: Math.round(gross * 0.10),
            schoolRevenue: Math.round(gross * 0.10),
            totalLessons: Math.round(gross / 85),
            totalHours: Math.round(gross / 85),
            activeStudents: Math.floor(10 + Math.random() * 20),
            activeTutors: Math.floor(2 + Math.random() * 4),
            rawData: { source: "demo-seed" },
          },
        });
      } catch { /* skip duplicates */ }
    }
  }

  // ─── Royalty Invoices & Payments ─────────────────────────
  console.log("Creating royalty invoices...");

  let invoiceNum = 1;
  for (const fa of franchiseeAccounts) {
    for (let m = 1; m <= 3; m++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - m);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const grossRevenue = 8000 + Math.random() * 8000;
      const royaltyAmt = grossRevenue * 0.07;
      const brandFund = grossRevenue * 0.01;
      const systemsFee = grossRevenue * 0.02;
      const totalAmt = royaltyAmt + brandFund + systemsFee;
      const isPaid = m > 1; // Most recent month still pending

      const invNumber = `INV-${year}-${String(month).padStart(2, "0")}-${String(invoiceNum++).padStart(3, "0")}`;

      try {
        const invoice = await prisma.royaltyInvoice.create({
          data: {
            invoiceNumber: invNumber,
            franchiseeAccountId: fa.id,
            year,
            month,
            grossRevenue: Math.round(grossRevenue * 100) / 100,
            royaltyAmount: Math.round(royaltyAmt * 100) / 100,
            royaltyPercent: 7.0,
            brandFundAmount: Math.round(brandFund * 100) / 100,
            brandFundPercent: 1.0,
            systemsFeeAmount: Math.round(systemsFee * 100) / 100,
            systemsFeePercent: 2.0,
            totalAmount: Math.round(totalAmt * 100) / 100,
            status: isPaid ? "PAID" : (m === 1 && franchiseeAccounts.indexOf(fa) === 2) ? "DISPUTED" : "PAYMENT_PENDING",
            invoiceDate: daysAgo(m * 30 - 5),
            dueDate: new Date(year, month, 15),
          },
        });

        if (isPaid) {
          await prisma.royaltyPayment.create({
            data: {
              invoiceId: invoice.id,
              franchiseeAccountId: fa.id,
              amount: Math.round(totalAmt * 100) / 100,
              method: "ACH",
              status: "SUCCEEDED",
              processedAt: daysAgo(m * 30 - 10),
            },
          });
        }
      } catch { /* skip duplicates */ }
    }
  }

  // ─── Certifications ─────────────────────────────────────
  console.log("Creating certifications...");

  const certDefs = [
    { slug: "chess-instruction", name: "Chess Instruction Certification", category: "TRAINING" as const, required: true, renewalMonths: 12 },
    { slug: "first-aid-cpr", name: "First Aid & CPR", category: "COMPLIANCE" as const, required: true, renewalMonths: 24 },
    { slug: "background-check", name: "Background Check", category: "COMPLIANCE" as const, required: true, renewalMonths: 12 },
    { slug: "business-insurance", name: "Business Insurance", category: "INSURANCE" as const, required: true, renewalMonths: 12 },
    { slug: "marketing-playbook", name: "Marketing Playbook Mastery", category: "TRAINING" as const, required: false, renewalMonths: null },
  ];

  const certs: Array<{ id: string }> = [];
  for (const cd of certDefs) {
    const cert = await prisma.certification.upsert({
      where: { slug: cd.slug },
      update: {},
      create: { slug: cd.slug, name: cd.name, category: cd.category, requiredForLaunch: cd.required, renewalMonths: cd.renewalMonths },
    });
    certs.push({ id: cert.id });
  }

  // Assign certs to franchisees
  for (const fa of franchiseeAccounts) {
    for (let ci = 0; ci < certs.length; ci++) {
      const isExpiring = ci === 1 && franchiseeAccounts.indexOf(fa) === 0; // One expiring soon
      const isExpired = ci === 3 && franchiseeAccounts.indexOf(fa) === 4; // One expired
      try {
        await prisma.franchiseeCertification.create({
          data: {
            franchiseeAccountId: fa.id,
            certificationId: certs[ci].id,
            earnedAt: monthsAgo(6),
            expiresAt: isExpired ? daysAgo(10) : isExpiring ? new Date(Date.now() + 20 * 86400000) : new Date(Date.now() + 200 * 86400000),
            status: isExpired ? "EXPIRED" : "ACTIVE",
          },
        });
      } catch { /* skip duplicates */ }
    }
  }

  // ─── Support Tickets ────────────────────────────────────
  console.log("Creating support tickets...");

  const ticketData = [
    { subject: "TutorCruncher login not working", category: "TECHNICAL" as const, priority: "HIGH" as const, status: "IN_PROGRESS" as const, prospectIdx: 0, created: daysAgo(3), sla: daysAgo(-1) },
    { subject: "Marketing materials not received", category: "MARKETING" as const, priority: "MEDIUM" as const, status: "OPEN" as const, prospectIdx: 1, created: daysAgo(1), sla: new Date(Date.now() + 2 * 86400000) },
    { subject: "Question about royalty calculation", category: "BILLING" as const, priority: "MEDIUM" as const, status: "WAITING_ON_ADMIN" as const, prospectIdx: 2, created: daysAgo(5), sla: daysAgo(2) },
    { subject: "Need help with school partnership agreement", category: "OPERATIONS" as const, priority: "LOW" as const, status: "RESOLVED" as const, prospectIdx: 3, created: daysAgo(10), sla: daysAgo(3) },
    { subject: "Insurance renewal assistance", category: "COMPLIANCE" as const, priority: "HIGH" as const, status: "OPEN" as const, prospectIdx: 4, created: hoursAgo(6), sla: new Date(Date.now() + 1 * 86400000) },
  ];

  let ticketNum = 1;
  for (const t of ticketData) {
    const sp = selectedProspects[t.prospectIdx];
    if (!sp) continue;
    try {
      await prisma.supportTicket.create({
        data: {
          ticketNumber: `TKT-2026-${String(ticketNum++).padStart(5, "0")}`,
          subject: t.subject,
          description: `${t.subject} — reported by ${sp.firstName} ${sp.lastName}`,
          category: t.category,
          priority: t.priority,
          status: t.status,
          prospectId: sp.id,
          slaDeadline: t.sla,
          createdAt: t.created,
          resolvedAt: t.status === "RESOLVED" ? daysAgo(8) : null,
        },
      });
    } catch { /* skip */ }
  }

  // ─── Field Audits & Corrective Actions ──────────────────
  console.log("Creating audit templates and audits...");

  const auditTemplate = await prisma.auditTemplate.upsert({
    where: { slug: "quarterly-operations" },
    update: {},
    create: {
      slug: "quarterly-operations",
      name: "Quarterly Operations Review",
      description: "Standard quarterly review of franchise operations quality.",
      category: "OPERATIONS",
    },
  });

  // Create a corrective action via field audit
  for (let i = 0; i < 2; i++) {
    const sp = selectedProspects[i];
    if (!sp) continue;
    try {
      const audit = await prisma.fieldAudit.create({
        data: {
          templateId: auditTemplate.id,
          prospectId: sp.id,
          auditorId: "admin@demo.com",
          scheduledDate: daysAgo(15 - i * 5),
          status: i === 0 ? "COMPLETED" : "SCHEDULED",
          completedAt: i === 0 ? daysAgo(14) : null,
          overallScore: i === 0 ? 82 : null,
        },
      });

      if (i === 0) {
        await prisma.correctiveAction.create({
          data: {
            auditId: audit.id,
            description: "Safety signage missing in lesson area — need to display emergency procedures poster",
            assignedTo: sp.email,
            dueDate: daysAgo(-5), // 5 days from now
            status: "OPEN",
          },
        });
        await prisma.correctiveAction.create({
          data: {
            auditId: audit.id,
            description: "Tutor documentation incomplete — missing background check for new tutor Sarah K.",
            assignedTo: sp.email,
            dueDate: daysAgo(2), // overdue
            status: "IN_PROGRESS",
          },
        });
      }
    } catch { /* skip */ }
  }

  // ─── Franchisor Todos ───────────────────────────────────
  console.log("Creating franchisor todos...");

  const todoItems = [
    { prospectIdx: 0, text: "Set up G Suite account for Jessica Nguyen" },
    { prospectIdx: 1, text: "Order welcome kit for Marcus Thompson" },
    { prospectIdx: 2, text: "Review Amanda Walsh's school outreach list" },
    { prospectIdx: 4, text: "Schedule orientation call with Olivia Moore" },
  ];

  for (const todo of todoItems) {
    const sp = selectedProspects[todo.prospectIdx];
    if (!sp) continue;
    try {
      await prisma.franchisorTodo.create({
        data: {
          prospectId: sp.id,
          actionText: todo.text,
          status: "PENDING",
        },
      });
    } catch { /* skip */ }
  }

  // ─── Activity Feed ──────────────────────────────────────
  console.log("Creating activity feed...");

  const activities = [
    { prospectEmail: "lisa.taylor@demo.com", type: "FORM_SUBMITTED" as const, desc: "Submitted franchise inquiry form", time: hoursAgo(3) },
    { prospectEmail: "kevin.park@demo.com", type: "FORM_SUBMITTED" as const, desc: "Submitted franchise inquiry form", time: hoursAgo(6) },
    { prospectEmail: "priya.patel@demo.com", type: "CALL_LOGGED" as const, desc: "Discovery call completed — strong candidate, owns existing tutoring business", time: daysAgo(1) },
    { prospectEmail: "rachel.green@demo.com", type: "STAGE_CHANGED" as const, desc: "Pipeline stage changed to Discovery Call", time: daysAgo(1) },
    { prospectEmail: "alex.rivera@demo.com", type: "PRE_WORK_STARTED" as const, desc: "Started pre-work assignment: Territory Builder", time: daysAgo(2) },
    { prospectEmail: "emma.davis@demo.com", type: "PRE_WORK_SUBMITTED" as const, desc: "Submitted pre-work: Market Research", time: daysAgo(2) },
    { prospectEmail: "ryan.mitchell@demo.com", type: "SCORE_UPDATED" as const, desc: "Prospect score updated to 88", time: daysAgo(3) },
    { prospectEmail: "carlos.garcia@demo.com", type: "STAGE_CHANGED" as const, desc: "Pipeline stage changed to Interview", time: daysAgo(4) },
    { prospectEmail: "jessica.nguyen@demo.com", type: "NOTE_ADDED" as const, desc: "Admin note: Excellent Q1 performance, considering multi-unit expansion", time: daysAgo(5) },
    { prospectEmail: "marcus.thompson@demo.com", type: "DOCUMENT_SIGNED" as const, desc: "Signed territory agreement renewal", time: daysAgo(6) },
    { prospectEmail: "ben.foster@demo.com", type: "STAGE_CHANGED" as const, desc: "Pipeline stage changed to Selection Review", time: daysAgo(7) },
    { prospectEmail: "mike.johnson@demo.com", type: "EMAIL_SENT" as const, desc: "Sent follow-up email with FDD document", time: daysAgo(3) },
  ];

  for (const act of activities) {
    const prospect = prospects.find(p => p.email === act.prospectEmail);
    if (!prospect) continue;
    await prisma.prospectActivity.create({
      data: {
        prospectId: prospect.id,
        activityType: act.type,
        description: act.desc,
        performedBy: act.type === "FORM_SUBMITTED" ? undefined : "admin@demo.com",
        createdAt: act.time,
      },
    });
  }

  // ─── Pre-Work Submissions ───────────────────────────────
  console.log("Creating pre-work submissions...");

  const preWorkProspects = prospects.filter(p =>
    ["PRE_WORK_IN_PROGRESS", "PRE_WORK_COMPLETE", "INTERVIEW", "SELECTION_REVIEW", "SELECTED"].includes(p.stage)
  );

  for (const sp of preWorkProspects) {
    const isComplete = ["PRE_WORK_COMPLETE", "INTERVIEW", "SELECTION_REVIEW", "SELECTED"].includes(sp.stage);
    const modulesToComplete = isComplete ? preWorkModules.length : Math.floor(preWorkModules.length * 0.6);

    for (let mi = 0; mi < modulesToComplete; mi++) {
      const mod = preWorkModules[mi];
      try {
        await prisma.preWorkSubmission.upsert({
          where: { prospectId_moduleId: { prospectId: sp.id, moduleId: mod.id } },
          update: {},
          create: {
            prospectId: sp.id,
            moduleId: mod.id,
            status: isComplete ? "APPROVED" : "SUBMITTED",
            content: { response: `Demo submission for ${mod.slug}` },
            submittedAt: daysAgo(20 + mi * 2),
            reviewedAt: isComplete ? daysAgo(15 + mi * 2) : null,
            reviewedBy: isComplete ? "admin@demo.com" : null,
            score: isComplete ? 7 + Math.floor(Math.random() * 3) : null,
          },
        });
      } catch { /* skip duplicates */ }
    }
  }

  // ─── Workflow Templates ─────────────────────────────────
  console.log("Creating workflow templates...");

  try {
    await prisma.workflowTrigger.upsert({
      where: { id: "demo-new-inquiry-trigger" },
      update: {},
      create: {
        id: "demo-new-inquiry-trigger",
        name: "New Inquiry Welcome Flow",
        description: "Automatically sends welcome email and creates follow-up task when new inquiry arrives.",
        triggerType: "STAGE_CHANGE",
        triggerConfig: { fromStage: null, toStage: "NEW_INQUIRY" },
        isActive: true,
      },
    });

    await prisma.workflowTrigger.upsert({
      where: { id: "demo-prework-reminder-trigger" },
      update: {},
      create: {
        id: "demo-prework-reminder-trigger",
        name: "Pre-Work Reminder",
        description: "Sends reminder if pre-work not started after 7 days.",
        triggerType: "TIMER",
        triggerConfig: { delayDays: 7, condition: "preWorkStatus === NOT_STARTED" },
        isActive: true,
      },
    });
  } catch { /* skip */ }

  // ─── Summary ────────────────────────────────────────────
  const counts = {
    prospects: prospects.length,
    franchisees: franchiseeAccounts.length,
    markets: marketsData.length,
    phases: phases.length,
    modules: allModules.length,
  };

  console.log("\n✅ Demo seed complete!");
  console.log(`   ${counts.prospects} prospects (across all pipeline stages)`);
  console.log(`   ${counts.franchisees} active franchisees with accounts`);
  console.log(`   ${counts.markets} territories/markets`);
  console.log(`   ${counts.phases} academy phases, ${counts.modules} modules`);
  console.log(`   6 months of revenue data per franchisee`);
  console.log(`   Royalty invoices, certifications, support tickets, audits`);
  console.log(`   Activity feed, franchisor todos, pre-work submissions`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
