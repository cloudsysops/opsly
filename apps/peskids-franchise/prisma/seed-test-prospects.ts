import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding test prospects...\n");

  // Password for both test accounts: "test123"
  const passwordHash = await hash("test123", 12);

  // Get pre-work modules
  const modules = await prisma.preWorkModule.findMany({
    orderBy: { sequence: "asc" },
  });

  if (modules.length === 0) {
    console.error("No pre-work modules found. Run seed-prework.ts first.");
    process.exit(1);
  }

  // Get academy modules for the SELECTED prospect
  const academyModules = await prisma.academyModule.findMany({
    orderBy: { sequence: "asc" },
    take: 4,
  });

  // ============================================
  // PROSPECT 1: Sarah Martinez - PRE_WORK_IN_PROGRESS
  // ============================================
  const sarah = await prisma.prospect.upsert({
    where: { email: "sarah.martinez@example.com" },
    update: {},
    create: {
      email: "sarah.martinez@example.com",
      passwordHash,
      firstName: "Sarah",
      lastName: "Martinez",
      phone: "(512) 555-0142",
      preferredTerritory: "Austin, TX",
      interestLevel: "SERIOUSLY_CONSIDERING",
      liquidity: "RANGE_100K_250K",
      aboutYourself:
        "Former elementary school teacher with 8 years of experience. I left teaching to start a family but miss working with kids. I taught chess club after school and loved watching kids develop problem-solving skills. Now that my kids are in school, I'm ready to build something of my own.",
      referralSource: "Google search for 'education franchises'",
      pipelineStage: "PRE_WORK_IN_PROGRESS",
      prospectScore: 72,
      preWorkStatus: "IN_PROGRESS",
      preWorkStartedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "education_franchises_2026",
    },
  });

  console.log(`Created prospect: ${sarah.firstName} ${sarah.lastName} (${sarah.pipelineStage})`);

  // Sarah's pre-work submissions (completed 2 of 5)
  // Module 1: Territory Builder - APPROVED
  await prisma.preWorkSubmission.upsert({
    where: { prospectId_moduleId: { prospectId: sarah.id, moduleId: modules[0].id } },
    update: {},
    create: {
      prospectId: sarah.id,
      moduleId: modules[0].id,
      status: "APPROVED",
      submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      reviewedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      score: 8,
      content: {
        targetTerritory: "Austin, TX Metro Area",
        targetZipCodes: "78701, 78702, 78703, 78704, 78731, 78745, 78757",
        estimatedSchools: 47,
        rationale:
          "Austin has a strong education-focused community with high household incomes. The central and south Austin areas have numerous private preschools and daycares catering to professional families. Many parents here value enrichment activities and are willing to invest in their children's development.",
      },
    },
  });

  // Module 2: Market Research - SUBMITTED (awaiting review)
  await prisma.preWorkSubmission.upsert({
    where: { prospectId_moduleId: { prospectId: sarah.id, moduleId: modules[1].id } },
    update: {},
    create: {
      prospectId: sarah.id,
      moduleId: modules[1].id,
      status: "SUBMITTED",
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      content: {
        preschoolCount: 28,
        daycareCount: 15,
        elementaryCount: 22,
        privateSchoolCount: 12,
        demographics:
          "Median household income: $85,000. High concentration of dual-income professional families. Strong emphasis on STEM education. Active PTA involvement typical.",
        competition:
          "Found 2 chess clubs at elementary schools (volunteer-run). One Kumon center. Several coding camps. No dedicated chess enrichment programs in preschools.",
        dataSources:
          "Texas Education Agency, Census.gov, local Facebook parenting groups, Google Maps research",
        opportunities:
          "Gap in market for preschool-age chess programs. Parents actively seeking enrichment activities. Many schools looking for after-school program options.",
        challenges:
          "Competitive enrichment market. Need to differentiate from coding and STEM programs. Some schools may have budget constraints.",
      },
    },
  });

  // Sarah's activity log
  await prisma.prospectActivity.createMany({
    data: [
      {
        prospectId: sarah.id,
        activityType: "FORM_SUBMITTED",
        description: "Submitted initial inquiry form",
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
      {
        prospectId: sarah.id,
        activityType: "STAGE_CHANGED",
        description: "Pipeline stage changed to INITIAL_CONTACT",
        metadata: { from: "NEW_INQUIRY", to: "INITIAL_CONTACT" },
        createdAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
      },
      {
        prospectId: sarah.id,
        activityType: "STAGE_CHANGED",
        description: "Pipeline stage changed to DISCOVERY_CALL",
        metadata: { from: "INITIAL_CONTACT", to: "DISCOVERY_CALL" },
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        prospectId: sarah.id,
        activityType: "LOGIN",
        description: "Logged into prospect portal",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        prospectId: sarah.id,
        activityType: "STAGE_CHANGED",
        description: "Pipeline stage changed to PRE_WORK_IN_PROGRESS",
        metadata: { from: "DISCOVERY_CALL", to: "PRE_WORK_IN_PROGRESS" },
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        prospectId: sarah.id,
        activityType: "PRE_WORK_SUBMITTED",
        description: "Submitted Territory Builder module",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        prospectId: sarah.id,
        activityType: "PRE_WORK_SUBMITTED",
        description: "Submitted Market Research module",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ],
    skipDuplicates: true,
  });

  // Sarah's admin notes
  await prisma.prospectNote.upsert({
    where: { id: "sarah-note-1" },
    update: {},
    create: {
      id: "sarah-note-1",
      prospectId: sarah.id,
      content:
        "Great discovery call. Sarah has teaching background and understands the education space. Her husband is supportive and they have savings set aside. She's methodical and thorough - exactly what we want in a franchisee. Watch her progress on pre-work closely.",
      authorEmail: "admin@acmefranchise.com",
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`  - Created pre-work submissions (2/5 complete)`);
  console.log(`  - Created activity history (7 events)`);
  console.log(`  - Created admin note\n`);

  // ============================================
  // PROSPECT 2: Michael Chen - SELECTED (Academy access)
  // ============================================
  const michael = await prisma.prospect.upsert({
    where: { email: "michael.chen@example.com" },
    update: {},
    create: {
      email: "michael.chen@example.com",
      passwordHash,
      firstName: "Michael",
      lastName: "Chen",
      phone: "(404) 555-0198",
      preferredTerritory: "Atlanta, GA",
      interestLevel: "READY_TO_START",
      liquidity: "RANGE_250K_500K",
      aboutYourself:
        "Recently exited from my tech startup (we were acquired). Looking for something meaningful to do next. I have two young kids who love chess - we play every weekend. I want to combine my business experience with my passion for education and make a difference in my community.",
      referralSource: "Referred by existing franchisee",
      pipelineStage: "SELECTED",
      prospectScore: 94,
      preWorkStatus: "APPROVED",
      preWorkStartedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      preWorkCompletedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      utmSource: "referral",
      utmMedium: "word_of_mouth",
    },
  });

  console.log(`Created prospect: ${michael.firstName} ${michael.lastName} (${michael.pipelineStage})`);

  // Michael's pre-work submissions (all 5 complete and approved)
  for (let i = 0; i < modules.length; i++) {
    const module = modules[i];
    const submittedDaysAgo = 45 - i * 5;
    const reviewedDaysAgo = submittedDaysAgo - 2;

    await prisma.preWorkSubmission.upsert({
      where: { prospectId_moduleId: { prospectId: michael.id, moduleId: module.id } },
      update: {},
      create: {
        prospectId: michael.id,
        moduleId: module.id,
        status: "APPROVED",
        submittedAt: new Date(Date.now() - submittedDaysAgo * 24 * 60 * 60 * 1000),
        reviewedAt: new Date(Date.now() - reviewedDaysAgo * 24 * 60 * 60 * 1000),
        score: 9,
        content: getMichaelSubmissionContent(module.slug),
      },
    });
  }

  // Michael's academy progress (completed first 2 modules, in progress on 3rd)
  if (academyModules.length > 0) {
    for (let i = 0; i < Math.min(academyModules.length, 3); i++) {
      const mod = academyModules[i];
      const isCompleted = i < 2;

      await prisma.academyProgress.upsert({
        where: { prospectId_moduleId: { prospectId: michael.id, moduleId: mod.id } },
        update: {},
        create: {
          prospectId: michael.id,
          moduleId: mod.id,
          status: isCompleted ? "COMPLETED" : "IN_PROGRESS",
          completedAt: isCompleted ? new Date(Date.now() - (7 - i * 3) * 24 * 60 * 60 * 1000) : null,
          timeSpent: isCompleted ? 1200 + i * 300 : 450,
          score: isCompleted ? 85 + i * 5 : null,
        },
      });
    }
    console.log(`  - Created academy progress (2 modules complete, 1 in progress)`);
  }

  // Michael's documents (FDD acknowledged)
  await prisma.prospectDocument.upsert({
    where: { prospectId_documentType: { prospectId: michael.id, documentType: "FDD_RECEIPT" } },
    update: {},
    create: {
      prospectId: michael.id,
      documentType: "FDD_RECEIPT",
      acknowledgedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      signatureStatus: "SIGNED",
      signedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.prospectDocument.upsert({
    where: { prospectId_documentType: { prospectId: michael.id, documentType: "FRANCHISE_AGREEMENT" } },
    update: {},
    create: {
      prospectId: michael.id,
      documentType: "FRANCHISE_AGREEMENT",
      acknowledgedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      signatureStatus: "SIGNED",
      signedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    },
  });

  // Michael's activity log
  await prisma.prospectActivity.createMany({
    data: [
      {
        prospectId: michael.id,
        activityType: "FORM_SUBMITTED",
        description: "Submitted initial inquiry form",
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      },
      {
        prospectId: michael.id,
        activityType: "STAGE_CHANGED",
        description: "Pipeline stage changed to INITIAL_CONTACT",
        createdAt: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000),
      },
      {
        prospectId: michael.id,
        activityType: "STAGE_CHANGED",
        description: "Pipeline stage changed to DISCOVERY_CALL",
        createdAt: new Date(Date.now() - 52 * 24 * 60 * 60 * 1000),
      },
      {
        prospectId: michael.id,
        activityType: "STAGE_CHANGED",
        description: "Pipeline stage changed to PRE_WORK_IN_PROGRESS",
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      },
      {
        prospectId: michael.id,
        activityType: "PRE_WORK_SUBMITTED",
        description: "Submitted all 5 pre-work modules",
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      },
      {
        prospectId: michael.id,
        activityType: "STAGE_CHANGED",
        description: "Pipeline stage changed to PRE_WORK_COMPLETE",
        createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      },
      {
        prospectId: michael.id,
        activityType: "STAGE_CHANGED",
        description: "Pipeline stage changed to INTERVIEW",
        createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      },
      {
        prospectId: michael.id,
        activityType: "DOCUMENT_SIGNED",
        description: "Signed FDD acknowledgment",
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        prospectId: michael.id,
        activityType: "STAGE_CHANGED",
        description: "Pipeline stage changed to SELECTION_REVIEW",
        createdAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
      },
      {
        prospectId: michael.id,
        activityType: "DOCUMENT_SIGNED",
        description: "Signed Franchise Agreement",
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
      {
        prospectId: michael.id,
        activityType: "STAGE_CHANGED",
        description: "Pipeline stage changed to SELECTED - Welcome to the family!",
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
      {
        prospectId: michael.id,
        activityType: "LOGIN",
        description: "Started Story Time Academy training",
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    ],
    skipDuplicates: true,
  });

  // Michael's admin notes
  await prisma.prospectNote.upsert({
    where: { id: "michael-note-1" },
    update: {},
    create: {
      id: "michael-note-1",
      prospectId: michael.id,
      content:
        "Exceptional candidate. Tech background gives him operational sophistication. His school outreach was impressive - got 3 schools interested before even signing. Atlanta territory is great. Referred by Jon Sieber who vouched for him.",
      authorEmail: "franchising@acmefranchise.com",
      createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.prospectNote.upsert({
    where: { id: "michael-note-2" },
    update: {},
    create: {
      id: "michael-note-2",
      prospectId: michael.id,
      content:
        "Interview went great. Michael has clear vision for his territory. His 90-day plan was the best we've seen. Recommendation: APPROVE immediately.",
      authorEmail: "admin@acmefranchise.com",
      createdAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`  - Created pre-work submissions (5/5 complete, all approved)`);
  console.log(`  - Created signed documents (FDD, Franchise Agreement)`);
  console.log(`  - Created activity history (12 events)`);
  console.log(`  - Created admin notes (2)\n`);

  console.log("=".repeat(50));
  console.log("TEST ACCOUNTS CREATED:");
  console.log("=".repeat(50));
  console.log("\n1. PROSPECT IN PRE-WORK (Mid-funnel):");
  console.log("   Email: sarah.martinez@example.com");
  console.log("   Password: test123");
  console.log("   Stage: PRE_WORK_IN_PROGRESS");
  console.log("   Pre-work: 2/5 modules complete\n");

  console.log("2. SELECTED FRANCHISEE (Academy access):");
  console.log("   Email: michael.chen@example.com");
  console.log("   Password: test123");
  console.log("   Stage: SELECTED");
  console.log("   Academy: 2 modules complete, 1 in progress\n");

  console.log("ADMIN LOGIN:");
  console.log("   Go to: /login");
  console.log('   Click "Sign in with Google" (use @acmefranchise.com account)');
  console.log("   CRM Dashboard: /admin");
  console.log("   Pipeline Board: /admin/pipeline");
  console.log("   Prospect List: /admin/prospects\n");
}

function getMichaelSubmissionContent(slug: string): object {
  switch (slug) {
    case "territory":
      return {
        targetTerritory: "Atlanta, GA Metro - Buckhead/Sandy Springs",
        targetZipCodes: "30305, 30309, 30319, 30324, 30326, 30327, 30328, 30338, 30342",
        estimatedSchools: 62,
        rationale:
          "Buckhead and Sandy Springs are affluent areas with high concentration of young families. Strong private school presence. Parents here invest heavily in enrichment. My kids go to school in this area so I know the community well.",
      };
    case "research":
      return {
        preschoolCount: 35,
        daycareCount: 22,
        elementaryCount: 28,
        privateSchoolCount: 18,
        demographics:
          "Median household income: $125,000+. High education attainment. Dual-income professional families. Strong emphasis on extracurriculars.",
        competition:
          "Found 1 chess academy in Midtown (20 min away). A few coding camps. Several Kumon/Mathnasium. No chess programs in preschools.",
        dataSources:
          "Georgia DOE, local school websites, personal visits to 5 schools, conversations with 3 school directors",
        opportunities:
          "Huge gap in early childhood chess. Schools actively looking for enrichment partners. Parents willing to pay premium.",
        challenges: "Competitive market for after-school time slots. Need strong relationships with directors.",
      };
    case "outreach":
      return {
        totalContacts: 15,
        liveConversations: 8,
        interestedSchools: 3,
        contacts: [
          {
            school: "Peachtree Presbyterian Preschool",
            contact: "Director Sarah Williams",
            method: "In-person visit",
            outcome: "Very interested. Wants to pilot in spring.",
          },
          {
            school: "Trinity School",
            contact: "Enrichment Coordinator",
            method: "Phone call",
            outcome: "Asked for proposal. Will review with board.",
          },
          {
            school: "The Children's School",
            contact: "Head of School",
            method: "Email + follow-up call",
            outcome: "Interested. Scheduled meeting for next week.",
          },
        ],
        learnings:
          "Directors are very receptive when I mention the story-based approach. The combination of chess + literacy is unique and compelling. Timing matters - spring semester planning happens in October.",
      };
    case "reflection":
      return {
        objections:
          "Budget constraints at some schools. Some directors unfamiliar with chess benefits. Scheduling conflicts with existing programs.",
        excitement:
          "The story-based approach resonated strongly. Directors loved that it's not just chess - it's literacy, social skills, and critical thinking. Several mentioned parents asking for chess.",
        surprises:
          "How warm the reception was. Expected more pushback. Also surprised how many schools don't have any chess offering.",
        lessons:
          "Relationship building is key. Personal visits much more effective than cold calls. Need to have materials ready to leave behind.",
        loomVideoUrl: "https://www.loom.com/share/example123456",
      };
    case "plan":
      return {
        week1:
          "Complete all Academy training. Set up business entity and bank account. Order marketing materials. Schedule meetings with 10 target schools.",
        day30:
          "Launch pilot program at 2 schools. Build relationship with 5 additional schools. Hire and train first instructor. Attend 2 community events.",
        day60:
          "Expand to 5 total schools. Establish referral program with happy parents. Launch social media presence. Connect with local chess community.",
        day90:
          "Operating at 8+ schools. Hire second instructor. Generate $15k+ monthly revenue. Build waitlist for fall expansion.",
        localPresence:
          "Partner with local libraries for free chess events. Sponsor little league team. Set up booth at Buckhead Art Festival. Host 'Chess in the Park' monthly.",
        goalMetrics:
          "8 schools, 150+ students enrolled, 2 instructors hired, $15k MRR",
      };
    default:
      return { note: "Completed successfully" };
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
