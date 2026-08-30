import { PrismaClient, SubmissionType, MarketStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create Pre-Work Modules
  const modules = [
    {
      slug: "territory",
      title: "Territory Builder",
      description: "Map your territory, identify schools, and build your target list.",
      instructions: `
        <h3>Objective</h3>
        <p>Define the geographic territory where you plan to operate your Acme Franchise franchise.</p>

        <h3>What You Need to Do</h3>
        <ol>
          <li>Identify the city/metro area you want to serve</li>
          <li>List the specific zip codes you're targeting</li>
          <li>Count the total number of schools (preschools, daycares, elementary schools) in your target area</li>
          <li>Explain why you chose this territory</li>
        </ol>

        <h3>Resources</h3>
        <ul>
          <li>Google Maps for territory mapping</li>
          <li>State Department of Education school directories</li>
          <li>GreatSchools.org for school information</li>
        </ul>

        <h3>Tips</h3>
        <p>Choose a territory that's large enough to support a profitable business but small enough that you can reasonably cover it. Consider drive times, population density, and income demographics.</p>
      `,
      sequence: 1,
      isRequired: true,
      submissionType: SubmissionType.FORM,
    },
    {
      slug: "research",
      title: "Market Research",
      description: "Analyze your local market, competition, and demographic fit.",
      instructions: `
        <h3>Objective</h3>
        <p>Conduct thorough market research to understand the opportunity in your target territory.</p>

        <h3>What You Need to Research</h3>
        <ol>
          <li>Number of preschools and daycares</li>
          <li>Number of elementary schools (public, private, charter)</li>
          <li>Area demographics (income levels, family composition)</li>
          <li>Existing competition (other chess programs, enrichment providers)</li>
        </ol>

        <h3>Requirements</h3>
        <ul>
          <li>Cite your data sources</li>
          <li>Be specific with numbers</li>
          <li>Provide analysis, not just data</li>
        </ul>

        <h3>Resources</h3>
        <ul>
          <li>U.S. Census Bureau</li>
          <li>State education department</li>
          <li>Local chamber of commerce</li>
          <li>Google searches for competitors</li>
        </ul>
      `,
      sequence: 2,
      isRequired: true,
      submissionType: SubmissionType.FORM,
    },
    {
      slug: "outreach",
      title: "Outreach Tracker",
      description: "Contact schools and document your conversations.",
      instructions: `
        <h3>Objective</h3>
        <p>Practice the core skill of franchise development: building relationships with schools.</p>

        <h3>Requirements</h3>
        <ul>
          <li><strong>Contact at least 10 schools</strong></li>
          <li><strong>Have at least 5 live conversations</strong></li>
          <li>Document each contact attempt</li>
        </ul>

        <h3>What to Track</h3>
        <p>For each contact:</p>
        <ul>
          <li>School name and type</li>
          <li>Contact person and role</li>
          <li>Date and method (call, visit, email)</li>
          <li>Outcome and notes</li>
        </ul>

        <h3>Conversation Starters</h3>
        <p>When you reach someone, try:</p>
        <ul>
          <li>"I'm exploring starting a children's chess enrichment program in the area..."</li>
          <li>"Do you currently offer after-school enrichment programs?"</li>
          <li>"What would it take for a new program to be considered?"</li>
        </ul>

        <h3>Note</h3>
        <p>You're NOT selling yet—you're learning. The goal is to understand the landscape and practice having these conversations.</p>
      `,
      sequence: 3,
      isRequired: true,
      submissionType: SubmissionType.FORM,
    },
    {
      slug: "reflection",
      title: "Reflection & Video",
      description: "Reflect on your outreach experience and share insights.",
      instructions: `
        <h3>Objective</h3>
        <p>Process what you learned during the outreach phase and share your insights.</p>

        <h3>Questions to Answer</h3>
        <ol>
          <li>What objections did you hear from schools?</li>
          <li>What excited schools about chess enrichment?</li>
          <li>What surprised you during this process?</li>
          <li>What key lessons did you learn?</li>
        </ol>

        <h3>Optional: Video Reflection</h3>
        <p>We'd love to see and hear from you! Record a short (2-5 minute) Loom video sharing your reflections. This helps us get to know you better.</p>

        <h3>What We're Looking For</h3>
        <ul>
          <li>Honest self-reflection</li>
          <li>Evidence of learning</li>
          <li>Coachability and openness</li>
          <li>Enthusiasm for the work</li>
        </ul>
      `,
      sequence: 4,
      isRequired: true,
      submissionType: SubmissionType.FORM,
    },
    {
      slug: "plan",
      title: "90-Day Launch Plan",
      description: "Create your detailed plan for launching your franchise.",
      instructions: `
        <h3>Objective</h3>
        <p>Develop a concrete plan for your first 90 days as a Acme Franchise franchisee.</p>

        <h3>Sections to Complete</h3>
        <ol>
          <li><strong>Week 1 Actions</strong>: What will you do in your very first week?</li>
          <li><strong>30-Day Milestones</strong>: What will you have accomplished by Day 30?</li>
          <li><strong>60-Day Milestones</strong>: What will you have accomplished by Day 60?</li>
          <li><strong>90-Day Goals</strong>: Where do you want to be at the end of your first quarter?</li>
          <li><strong>Local Presence Plan</strong>: How will you build community awareness?</li>
        </ol>

        <h3>Consider Including</h3>
        <ul>
          <li>Specific schools you'll target first</li>
          <li>Marketing activities (PTAs, libraries, community fairs)</li>
          <li>Revenue targets (number of students, programs)</li>
          <li>Personal development goals</li>
        </ul>

        <h3>What Makes a Good Plan</h3>
        <ul>
          <li>Specific and actionable</li>
          <li>Realistic but ambitious</li>
          <li>Shows understanding of the business model</li>
          <li>Reflects your unique market</li>
        </ul>
      `,
      sequence: 5,
      isRequired: true,
      submissionType: SubmissionType.FORM,
    },
  ];

  for (const module of modules) {
    await prisma.preWorkModule.upsert({
      where: { slug: module.slug },
      update: module,
      create: module,
    });
    console.log(`Created/updated module: ${module.title}`);
  }

  // Create Markets
  const markets = [
    {
      name: "Westside",
      state: "TN",
      status: MarketStatus.ACTIVE,
      latitude: 36.1627,
      longitude: -86.7816,
      description: "Our flagship market with established school partnerships.",
    },
    {
      name: "Eastside",
      state: "FL",
      status: MarketStatus.ACTIVE,
      latitude: 28.5383,
      longitude: -81.3792,
      description: "Growing market with strong community presence.",
    },
    {
      name: "Austin",
      state: "TX",
      status: MarketStatus.AVAILABLE,
      latitude: 30.2672,
      longitude: -97.7431,
      description: "Prime territory with excellent demographics.",
    },
    {
      name: "Denver",
      state: "CO",
      status: MarketStatus.AVAILABLE,
      latitude: 39.7392,
      longitude: -104.9903,
      description: "Strong education market with family-focused communities.",
    },
    {
      name: "Atlanta",
      state: "GA",
      status: MarketStatus.AVAILABLE,
      latitude: 33.749,
      longitude: -84.388,
      description: "Large metro area with diverse school options.",
    },
  ];

  for (const market of markets) {
    await prisma.market.upsert({
      where: { name_state: { name: market.name, state: market.state } },
      update: market,
      create: market,
    });
    console.log(`Created/updated market: ${market.name}, ${market.state}`);
  }

  console.log("Seeding complete!");
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
