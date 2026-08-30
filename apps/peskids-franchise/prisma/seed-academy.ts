import { PrismaClient, AcademyModuleType, ResourceCategory } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Academy content...");

  // Seed Academy Phases
  const phases = [
    {
      id: "phase-1",
      slug: "foundation",
      title: "Foundation",
      description: "Build your foundation for success. Learn the Acme Franchise mission, values, and business model.",
      sequence: 1,
      duration: "Week 1",
    },
    {
      id: "phase-2",
      slug: "operations",
      title: "Operations Setup",
      description: "Set up your business operations including legal, financial, and administrative essentials.",
      sequence: 2,
      duration: "Week 2-3",
    },
    {
      id: "phase-3",
      slug: "sales-marketing",
      title: "Sales & Marketing",
      description: "Master school sales, community marketing, and building your local presence.",
      sequence: 3,
      duration: "Week 4-6",
    },
    {
      id: "phase-4",
      slug: "launch",
      title: "Launch & Growth",
      description: "Execute your launch plan and strategies for sustainable growth.",
      sequence: 4,
      duration: "Week 7-12",
    },
  ];

  for (const phase of phases) {
    await prisma.academyPhase.upsert({
      where: { slug: phase.slug },
      update: phase,
      create: phase,
    });
  }
  console.log(`✓ Seeded ${phases.length} phases`);

  // Seed Academy Modules
  const modules = [
    // Phase 1: Foundation
    {
      id: "mod-welcome",
      phaseId: "phase-1",
      slug: "welcome-to-stc",
      title: "Welcome to Acme Franchise",
      description: "An introduction to our mission, story, and what makes STC special.",
      content: `
        <h2>Welcome to the Acme Franchise Family!</h2>
        <p>Congratulations on joining one of the most innovative chess education programs in the world. Acme Franchise combines the magic of storytelling with the strategic thinking of chess to create an engaging learning experience for children.</p>

        <h3>Our Mission</h3>
        <p>To teach every child the game of chess through the power of story, making learning fun and accessible from the earliest ages.</p>

        <h3>What Makes Us Different</h3>
        <ul>
          <li><strong>Story-First Approach:</strong> Each chess piece has a character and story that makes learning memorable</li>
          <li><strong>Age-Appropriate:</strong> Designed for children as young as 3 years old</li>
          <li><strong>Proven Results:</strong> Our method has helped thousands of children fall in love with chess</li>
          <li><strong>Multi-Channel Revenue:</strong> Schools, afterschool, private lessons, camps, and events</li>
        </ul>

        <h3>Your Journey Ahead</h3>
        <p>Over the next 90 days, you'll learn everything you need to build a successful Acme Franchise franchise. This academy will guide you through operations, sales, marketing, and growth strategies.</p>
      `,
      sequence: 1,
      duration: 15,
      points: 10,
      moduleType: AcademyModuleType.READING,
    },
    {
      id: "mod-intro-video",
      phaseId: "phase-1",
      slug: "intro-video",
      title: "Welcome Video from Our Founder",
      description: "Watch a personal message from our founder about the Acme Franchise mission.",
      content: `<p>In this video, you'll hear directly from our founder about why Acme Franchise was created and the impact we're making in children's education worldwide.</p>`,
      sequence: 2,
      duration: 8,
      points: 15,
      moduleType: AcademyModuleType.VIDEO,
      resourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Replace with actual STC video
    },
    {
      id: "mod-business-model",
      phaseId: "phase-1",
      slug: "business-model-overview",
      title: "Understanding the Business Model",
      description: "Deep dive into revenue streams, pricing, and how franchisees make money.",
      content: `
        <h2>The Acme Franchise Business Model</h2>

        <h3>Revenue Streams</h3>
        <p>As a franchisee, you have multiple ways to generate income:</p>

        <h4>1. School Partnerships (Primary)</h4>
        <ul>
          <li>Partner with preschools and elementary schools</li>
          <li>Deliver curriculum during or after school</li>
          <li>Typical: 8-12 week programs, 1x/week</li>
          <li>Revenue: $150-300 per student per semester</li>
        </ul>

        <h4>2. Private Lessons</h4>
        <ul>
          <li>One-on-one or small group instruction</li>
          <li>In-home or online delivery</li>
          <li>Higher margin, more flexible scheduling</li>
          <li>Revenue: $60-120 per hour</li>
        </ul>

        <h4>3. Camps & Events</h4>
        <ul>
          <li>Summer camps, holiday camps</li>
          <li>Birthday parties</li>
          <li>Community events and tournaments</li>
          <li>Great for brand awareness and lead generation</li>
        </ul>

        <h3>Key Metrics to Track</h3>
        <ul>
          <li>Number of active school partnerships</li>
          <li>Student enrollment per school</li>
          <li>Retention rate semester-to-semester</li>
          <li>Private lesson hours booked</li>
          <li>Event revenue</li>
        </ul>
      `,
      sequence: 3,
      duration: 20,
      points: 15,
      moduleType: AcademyModuleType.READING,
    },
    {
      id: "mod-curriculum",
      phaseId: "phase-1",
      slug: "curriculum-overview",
      title: "The STC Curriculum",
      description: "Learn about our unique story-based chess curriculum and how to deliver it.",
      content: `
        <h2>Acme Franchise Curriculum</h2>

        <h3>The Characters</h3>
        <p>Each chess piece is brought to life through characters that children love:</p>
        <ul>
          <li><strong>King Shaky:</strong> The nervous but lovable king who needs protection</li>
          <li><strong>Queen Allegra:</strong> The powerful queen who can move anywhere</li>
          <li><strong>The Knights:</strong> They do the famous "gallop-gallop-step to the side" dance</li>
          <li><strong>The Bishops:</strong> They slide diagonally through the kingdom</li>
          <li><strong>The Rooks:</strong> Steady and strong, they guard the castle</li>
          <li><strong>The Pawns:</strong> Little soldiers with big dreams</li>
        </ul>

        <h3>Lesson Structure</h3>
        <ol>
          <li><strong>Story Time (5 min):</strong> Read the story introducing the concept</li>
          <li><strong>Demonstration (5 min):</strong> Show the movement/concept on the demo board</li>
          <li><strong>Practice (15 min):</strong> Students practice on their own boards</li>
          <li><strong>Game Play (10 min):</strong> Guided play incorporating new skills</li>
          <li><strong>Review (5 min):</strong> Recap and preview next lesson</li>
        </ol>

        <h3>Scope & Sequence</h3>
        <p>Our curriculum is designed as a progressive journey:</p>
        <ul>
          <li>Level 1: Piece movements and basic rules</li>
          <li>Level 2: Check, checkmate, and simple tactics</li>
          <li>Level 3: Opening principles and strategy</li>
          <li>Level 4: Advanced tactics and tournament play</li>
        </ul>
      `,
      sequence: 4,
      duration: 25,
      points: 15,
      moduleType: AcademyModuleType.READING,
    },

    // Phase 1: Foundation Quiz
    {
      id: "mod-foundation-quiz",
      phaseId: "phase-1",
      slug: "foundation-quiz",
      title: "Foundation Knowledge Check",
      description: "Test your understanding of the Acme Franchise foundation concepts.",
      content: `<p>You've learned about the Acme Franchise mission, business model, and curriculum. Now let's make sure you've got the fundamentals down!</p>`,
      sequence: 5,
      duration: 10,
      points: 25,
      moduleType: AcademyModuleType.QUIZ,
      quizData: {
        passingScore: 70,
        questions: [
          {
            question: "What is the primary teaching method that makes Acme Franchise unique?",
            options: [
              "Memorization-based learning",
              "Story-based learning with character pieces",
              "Competition-focused training",
              "Video-only instruction"
            ],
            correctIndex: 1
          },
          {
            question: "What is the minimum age Acme Franchise curriculum is designed for?",
            options: [
              "5 years old",
              "6 years old",
              "3 years old",
              "7 years old"
            ],
            correctIndex: 2
          },
          {
            question: "Which of these is NOT a primary revenue stream for STC franchisees?",
            options: [
              "School partnerships",
              "Private lessons",
              "Chess equipment sales",
              "Summer camps"
            ],
            correctIndex: 2
          },
          {
            question: "What is the typical STC lesson structure?",
            options: [
              "All game play",
              "Story, demonstration, practice, game play, review",
              "Lecture only",
              "Video watching"
            ],
            correctIndex: 1
          },
          {
            question: "What is the nervous but lovable king character called?",
            options: [
              "King Charles",
              "King Brave",
              "King Shaky",
              "King Arthur"
            ],
            correctIndex: 2
          }
        ]
      }
    },

    // Phase 2: Operations
    {
      id: "mod-ops-walkthrough",
      phaseId: "phase-2",
      slug: "operations-walkthrough",
      title: "Operations Walkthrough Video",
      description: "Watch a detailed walkthrough of how a typical day looks for a Acme Franchise franchisee.",
      content: `<p>This video provides a real-world look at franchise operations, including scheduling classes, managing instructors, and handling parent communications.</p>`,
      sequence: 1,
      duration: 12,
      points: 20,
      moduleType: AcademyModuleType.VIDEO,
      resourceUrl: "https://www.loom.com/share/example123456789", // Replace with actual Loom video
    },
    {
      id: "mod-legal-setup",
      phaseId: "phase-2",
      slug: "legal-business-setup",
      title: "Legal & Business Setup",
      description: "Essential steps to establish your business legally and properly.",
      content: `
        <h2>Setting Up Your Business</h2>

        <h3>Business Entity</h3>
        <p>We recommend forming an LLC for liability protection and tax flexibility. Consult with a local attorney and CPA for state-specific guidance.</p>

        <h3>Required Insurance</h3>
        <ul>
          <li><strong>General Liability:</strong> Minimum $1M per occurrence</li>
          <li><strong>Professional Liability:</strong> Covers teaching activities</li>
          <li><strong>Workers' Compensation:</strong> If you have employees</li>
        </ul>

        <h3>Licenses & Permits</h3>
        <ul>
          <li>Business license for your city/county</li>
          <li>Seller's permit (for merchandise)</li>
          <li>Background check clearances for school work</li>
        </ul>

        <h3>Banking & Accounting</h3>
        <ul>
          <li>Open a dedicated business bank account</li>
          <li>Set up accounting software (QuickBooks recommended)</li>
          <li>Understand royalty payment schedule</li>
        </ul>
      `,
      sequence: 2,
      duration: 30,
      points: 20,
      moduleType: AcademyModuleType.READING,
    },
    {
      id: "mod-hiring",
      phaseId: "phase-2",
      slug: "hiring-instructors",
      title: "Hiring & Training Instructors",
      description: "Build your team with qualified, passionate chess instructors.",
      content: `
        <h2>Building Your Team</h2>

        <h3>Ideal Instructor Profile</h3>
        <ul>
          <li>Love of working with children (more important than chess skill!)</li>
          <li>Basic chess knowledge (we can teach the rest)</li>
          <li>Reliable and professional</li>
          <li>Background check clearance</li>
          <li>Available during school hours</li>
        </ul>

        <h3>Where to Find Instructors</h3>
        <ul>
          <li>Local chess clubs</li>
          <li>College students (education or recreation majors)</li>
          <li>Retired teachers</li>
          <li>Stay-at-home parents</li>
          <li>Indeed, Craigslist, local Facebook groups</li>
        </ul>

        <h3>Training Process</h3>
        <ol>
          <li>Shadow experienced instructor for 2-3 lessons</li>
          <li>Co-teach with supervision</li>
          <li>Solo teach with feedback session</li>
          <li>Ongoing monthly check-ins</li>
        </ol>

        <h3>Compensation</h3>
        <p>Typical pay ranges from $20-40/hour depending on experience and market. Consider offering bonuses for retention and positive reviews.</p>
      `,
      sequence: 3,
      duration: 25,
      points: 20,
      moduleType: AcademyModuleType.READING,
    },

    // Phase 2: Operations Quiz
    {
      id: "mod-operations-quiz",
      phaseId: "phase-2",
      slug: "operations-quiz",
      title: "Operations Knowledge Check",
      description: "Test your understanding of business operations and team building.",
      content: `<p>Review what you've learned about setting up your business and building your team.</p>`,
      sequence: 4,
      duration: 8,
      points: 20,
      moduleType: AcademyModuleType.QUIZ,
      quizData: {
        passingScore: 70,
        questions: [
          {
            question: "What type of business entity is recommended for liability protection?",
            options: [
              "Sole Proprietorship",
              "LLC",
              "Partnership",
              "None needed"
            ],
            correctIndex: 1
          },
          {
            question: "What is the minimum general liability insurance coverage required?",
            options: [
              "$500,000 per occurrence",
              "$1 million per occurrence",
              "$250,000 per occurrence",
              "No minimum required"
            ],
            correctIndex: 1
          },
          {
            question: "Which quality is MORE important than chess skill when hiring instructors?",
            options: [
              "Advanced degree",
              "Love of working with children",
              "Tournament experience",
              "Professional teaching certification"
            ],
            correctIndex: 1
          },
          {
            question: "What is the typical instructor pay range per hour?",
            options: [
              "$10-15",
              "$15-20",
              "$20-40",
              "$50-75"
            ],
            correctIndex: 2
          }
        ]
      }
    },

    // Phase 3: Sales & Marketing
    {
      id: "mod-school-sales",
      phaseId: "phase-3",
      slug: "school-sales-process",
      title: "School Sales Process",
      description: "Master the art of partnering with schools for consistent revenue.",
      content: `
        <h2>Selling to Schools</h2>

        <h3>The School Sales Funnel</h3>
        <ol>
          <li><strong>Research:</strong> Identify target schools in your territory</li>
          <li><strong>Outreach:</strong> Email, call, or visit decision makers</li>
          <li><strong>Demo:</strong> Offer a free sample lesson</li>
          <li><strong>Proposal:</strong> Present partnership options</li>
          <li><strong>Close:</strong> Sign agreement, schedule start date</li>
        </ol>

        <h3>Decision Makers</h3>
        <ul>
          <li><strong>Preschools:</strong> Director or Owner</li>
          <li><strong>Elementary:</strong> Principal, Enrichment Coordinator, or PTA</li>
          <li><strong>After-School Programs:</strong> Program Director</li>
        </ul>

        <h3>Overcoming Objections</h3>
        <ul>
          <li><strong>"We already have chess":</strong> Our story-based method is different...</li>
          <li><strong>"Budget is tight":</strong> Parent-pay model = no cost to school</li>
          <li><strong>"Kids are too young":</strong> Our curriculum starts at age 3!</li>
        </ul>

        <h3>Key Metrics</h3>
        <ul>
          <li>Outreach volume: 20+ contacts per week</li>
          <li>Demo conversion: 50%+</li>
          <li>Close rate: 30%+ of demos</li>
        </ul>
      `,
      sequence: 1,
      duration: 30,
      points: 25,
      moduleType: AcademyModuleType.READING,
    },
    {
      id: "mod-local-marketing",
      phaseId: "phase-3",
      slug: "local-marketing",
      title: "Local Marketing Strategies",
      description: "Build your brand presence in the community.",
      content: `
        <h2>Marketing Your Franchise</h2>

        <h3>Community Presence</h3>
        <ul>
          <li><strong>Libraries:</strong> Host free chess storytime events</li>
          <li><strong>Farmers Markets:</strong> Demo table with mini lessons</li>
          <li><strong>Community Fairs:</strong> Booth with activities</li>
          <li><strong>Festivals:</strong> Sponsor and participate</li>
        </ul>

        <h3>Digital Marketing</h3>
        <ul>
          <li>Google Business Profile (essential for local SEO)</li>
          <li>Facebook page with regular posts</li>
          <li>Instagram for photos/videos of lessons</li>
          <li>Nextdoor for neighborhood reach</li>
        </ul>

        <h3>Parent Referrals</h3>
        <p>Your best marketing is word-of-mouth from happy parents:</p>
        <ul>
          <li>Ask for Google reviews after successful classes</li>
          <li>Offer referral incentives</li>
          <li>Send progress updates parents can share</li>
        </ul>

        <h3>School Partnerships as Marketing</h3>
        <p>Every school program is a marketing opportunity:</p>
        <ul>
          <li>Parents see their kids loving chess</li>
          <li>Natural upsell to private lessons</li>
          <li>Summer camp leads</li>
        </ul>
      `,
      sequence: 2,
      duration: 25,
      points: 20,
      moduleType: AcademyModuleType.READING,
    },

    // Phase 3: Sales Quiz
    {
      id: "mod-sales-quiz",
      phaseId: "phase-3",
      slug: "sales-marketing-quiz",
      title: "Sales & Marketing Knowledge Check",
      description: "Test your understanding of school sales and local marketing strategies.",
      content: `<p>Let's see how well you understand the sales process and marketing strategies.</p>`,
      sequence: 3,
      duration: 8,
      points: 20,
      moduleType: AcademyModuleType.QUIZ,
      quizData: {
        passingScore: 70,
        questions: [
          {
            question: "What is the recommended weekly school outreach volume?",
            options: [
              "5+ contacts",
              "10+ contacts",
              "20+ contacts",
              "50+ contacts"
            ],
            correctIndex: 2
          },
          {
            question: "Who is typically the decision maker at a preschool?",
            options: [
              "The PTA",
              "The Director or Owner",
              "Individual teachers",
              "Parents"
            ],
            correctIndex: 1
          },
          {
            question: "What is the best response to 'Kids are too young for chess'?",
            options: [
              "You're probably right",
              "Our curriculum starts at age 3!",
              "We'll come back in a few years",
              "Chess is only for older kids"
            ],
            correctIndex: 1
          },
          {
            question: "Which is your BEST marketing tool?",
            options: [
              "Paid advertising",
              "Word-of-mouth from happy parents",
              "Cold calling",
              "Email blasts"
            ],
            correctIndex: 1
          }
        ]
      }
    },

    // Phase 4: Launch
    {
      id: "mod-90day-plan",
      phaseId: "phase-4",
      slug: "90-day-launch-plan",
      title: "Your 90-Day Launch Plan",
      description: "Execute your plan for a successful market launch.",
      content: `
        <h2>90-Day Launch Plan</h2>

        <h3>Days 1-30: Foundation</h3>
        <ul>
          <li>Complete all legal/business setup</li>
          <li>Build initial school list (100+ targets)</li>
          <li>Create marketing materials</li>
          <li>Begin outreach to top 20 schools</li>
          <li>Hire first 1-2 instructors</li>
        </ul>

        <h3>Days 31-60: Traction</h3>
        <ul>
          <li>Conduct 10+ school demos</li>
          <li>Close first 3-5 school partnerships</li>
          <li>Host first community event</li>
          <li>Launch Google Ads for private lessons</li>
          <li>Collect first testimonials</li>
        </ul>

        <h3>Days 61-90: Growth</h3>
        <ul>
          <li>Deliver first school programs</li>
          <li>Refine and optimize operations</li>
          <li>Plan summer camp offerings</li>
          <li>Build pipeline for next semester</li>
          <li>Review metrics and adjust strategy</li>
        </ul>

        <h3>Success Metrics at 90 Days</h3>
        <ul>
          <li>5+ active school partnerships</li>
          <li>50+ enrolled students</li>
          <li>2+ trained instructors</li>
          <li>First positive month of revenue</li>
        </ul>
      `,
      sequence: 1,
      duration: 30,
      points: 30,
      moduleType: AcademyModuleType.READING,
    },
    {
      id: "mod-ongoing-support",
      phaseId: "phase-4",
      slug: "ongoing-support",
      title: "Ongoing Support & Resources",
      description: "How to get help and continue growing after launch.",
      content: `
        <h2>Support & Resources</h2>

        <h3>Franchise Support</h3>
        <ul>
          <li><strong>Weekly Check-ins:</strong> During first 90 days</li>
          <li><strong>Monthly Calls:</strong> Ongoing franchisee meetings</li>
          <li><strong>Slack Channel:</strong> Real-time support and community</li>
          <li><strong>Resource Library:</strong> Templates, scripts, materials</li>
        </ul>

        <h3>Continuing Education</h3>
        <ul>
          <li>Quarterly webinars on best practices</li>
          <li>Annual franchisee conference</li>
          <li>New curriculum updates</li>
          <li>Marketing campaign playbooks</li>
        </ul>

        <h3>Earl the Squirrel AI Coach</h3>
        <p>Your 24/7 AI assistant can help with:</p>
        <ul>
          <li>Quick answers to operational questions</li>
          <li>Sales script suggestions</li>
          <li>Problem-solving guidance</li>
          <li>Resource recommendations</li>
        </ul>

        <h3>Franchise Community</h3>
        <p>Connect with other franchisees to:</p>
        <ul>
          <li>Share best practices</li>
          <li>Get advice on challenges</li>
          <li>Celebrate wins together</li>
          <li>Build lasting relationships</li>
        </ul>
      `,
      sequence: 2,
      duration: 20,
      points: 15,
      moduleType: AcademyModuleType.READING,
    },
  ];

  for (const module of modules) {
    await prisma.academyModule.upsert({
      where: { slug: module.slug },
      update: module,
      create: module,
    });
  }
  console.log(`✓ Seeded ${modules.length} modules`);

  // Seed Resources
  const resources = [
    {
      id: "res-ops-manual",
      slug: "operations-manual",
      title: "Operations Manual",
      description: "Complete guide to running your Acme Franchise franchise.",
      category: ResourceCategory.OPERATIONS,
      content: "This comprehensive manual covers all aspects of franchise operations including daily procedures, quality standards, and best practices.",
    },
    {
      id: "res-school-packet",
      slug: "school-partnership-packet",
      title: "School Partnership Packet",
      description: "Leave-behind materials for school meetings.",
      category: ResourceCategory.SALES,
      content: "Professional packet including program overview, pricing, testimonials, and enrollment information for school administrators.",
    },
    {
      id: "res-email-templates",
      slug: "email-templates",
      title: "Email Outreach Templates",
      description: "Proven email templates for school outreach.",
      category: ResourceCategory.MARKETING,
      content: "Collection of email templates for initial outreach, follow-ups, demo scheduling, and post-demo communication.",
    },
    {
      id: "res-instructor-guide",
      slug: "instructor-training-guide",
      title: "Instructor Training Guide",
      description: "Complete training program for new instructors.",
      category: ResourceCategory.TRAINING,
      content: "Step-by-step guide for onboarding and training chess instructors including lesson delivery, classroom management, and quality standards.",
    },
    {
      id: "res-marketing-toolkit",
      slug: "marketing-toolkit",
      title: "Marketing Toolkit",
      description: "Social media templates, flyers, and promotional materials.",
      category: ResourceCategory.MARKETING,
      content: "Ready-to-use marketing materials including social media graphics, flyer templates, and promotional content.",
    },
  ];

  for (const resource of resources) {
    await prisma.academyResource.upsert({
      where: { slug: resource.slug },
      update: resource,
      create: resource,
    });
  }
  console.log(`✓ Seeded ${resources.length} resources`);

  // Seed Badges
  const badges = [
    {
      id: "badge-first-login",
      slug: "first-login",
      title: "First Steps",
      description: "Logged into the Academy for the first time",
      points: 10,
      criteria: "Complete your first login to the Story Time Academy.",
    },
    {
      id: "badge-foundation",
      slug: "foundation-complete",
      title: "Foundation Builder",
      description: "Completed the Foundation phase",
      points: 50,
      criteria: "Complete all modules in Phase 1: Foundation.",
    },
    {
      id: "badge-operations",
      slug: "operations-complete",
      title: "Operations Expert",
      description: "Completed the Operations Setup phase",
      points: 75,
      criteria: "Complete all modules in Phase 2: Operations Setup.",
    },
    {
      id: "badge-sales-master",
      slug: "sales-marketing-complete",
      title: "Sales Master",
      description: "Completed the Sales & Marketing phase",
      points: 100,
      criteria: "Complete all modules in Phase 3: Sales & Marketing.",
    },
    {
      id: "badge-launch-ready",
      slug: "launch-ready",
      title: "Launch Ready",
      description: "Completed all Academy phases",
      points: 150,
      criteria: "Complete all four phases of the Story Time Academy.",
    },
  ];

  for (const badge of badges) {
    await prisma.academyBadge.upsert({
      where: { slug: badge.slug },
      update: badge,
      create: badge,
    });
  }
  console.log(`✓ Seeded ${badges.length} badges`);

  console.log("\n✅ Academy seeding complete!");
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
