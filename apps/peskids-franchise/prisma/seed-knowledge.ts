import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const knowledgeDocuments = [
  {
    title: "What is Acme Franchise?",
    category: "COMPANY_INFO" as const,
    content: `Acme Franchise is a children's chess education company that uses storytelling to make chess accessible and engaging for young learners ages 3-9.

Our unique curriculum wraps chess concepts in memorable stories and characters. Instead of abstract rules, children learn that knights do a special "gallop-gallop-step to the side" dance, and bishops are sneaky teachers who only walk on the same color squares.

Acme Franchise was established in 2011 in lower Manhattan, New York City, originally under the name Chess at Three. The program was the brainchild of Tyler Schwartz, Jon Sieber, and Sam Williams, who were looking for a way to teach young children the game of chess.

Key Milestones:
- 2011: Founded in Manhattan, NYC as "Chess at Three"
- 2012: Expanded into The Hamptons and Westchester, New York
- 2018: Launched the Acme Franchise boardgame for retail
- 2021: The boardgame was awarded "2021 Toy of the Year" and named Time Magazine's "Best Inventions of 2021"
- 2024: Rebranded the tutoring business to Acme Franchise
- 2025: Began franchising to offer others the opportunity to expand the brand

The game has been approved as a certified MESH (Mental Emotional and Social Health) game.`,
    isPublic: true,
  },
  {
    title: "Mission, Vision and Core Values",
    category: "COMPANY_INFO" as const,
    content: `Mission:
Acme Franchise transforms complex educational concepts into engaging, accessible experiences for children by weaving together storytelling, interactive gameplay, and family engagement.

Vision:
Partner with passionate local entrepreneurs, schools, and communities to deliver innovative, proprietary teaching tools to over one million kids per year.

Core Values:

1. We Believe in Our Team
We take initiative, execute with excellence, and own our outcomes. We lead with humility - no task is beneath us when we serve a greater purpose.

2. We Believe in Stories
Stories spark curiosity, unlock imagination, and make learning magical.

3. We Believe in Our Children
Chess is for everyone. Regardless of age, regardless of gender - chess is for you. Even story-loving little girls can become chess champions who change the world of chess forever.`,
    isPublic: true,
  },
  {
    title: "Franchise Business Model",
    category: "BUSINESS_MODEL" as const,
    content: `The Acme Franchise franchise opportunity allows passionate individuals to own their own children's chess education business.

Revenue Streams:

1. School Lessons - Conducted within preschools and early learning centers for ages 2+
   - Tutor sent to the school
   - School pays for all students OR parents billed directly (all-play vs elective)
   - Can be private schools or DOE schools
   - Run Free Fun Days to build interest

2. Community Lessons - Group lessons in community locations
   - Families gather in common areas, clubhouses, etc.
   - Minimum student recommendations for viability

3. Club (Pop-up Club) - Lessons at rented/leased locations
   - Run ads for free trials
   - Sales process to convert trials to enrollments

4. Private Lessons - 1-on-1 or small group at homes

5. Summer Camps - Week-long half-day camps
   - $500 per child per week typical pricing
   - 20 students per camp capacity

Revenue Potential:
Based on 10 active school partnerships with typical 4 classrooms and 20 students each, 30% parent opt-in, $25/lesson for 13 lessons over 3 terms: ~$234,000 annual school revenue. Add 4 summer camps at $40,000 each: ~$160,000. Total annual potential: $634,000+ from schools alone.`,
    isPublic: true,
  },
  {
    title: "Investment and Financial Requirements",
    category: "INVESTMENT" as const,
    content: `Initial Investment (from Item 7 of FDD):

The total investment necessary to begin operation of a Acme Franchise franchise is $55,627 to $75,988. This includes:

- Initial Franchise Fee: $45,000 (non-refundable)
- Equipment Fee: $669 - $2,267 (board games, lesson books, classroom materials, marketing materials)
- Opening Advertising Campaign: $500 - $2,000
- Additional Funds (3 months working capital): $5,458 - $22,721
- Other Costs (insurance, licenses, professional fees): ~$4,000

Total Initial Investment: $55,627 - $75,988

Ongoing Fees:
- Royalty Fee: 7% of Gross Revenue (minimum $200/week)
- Brand Fund Contribution: 1-2% of Gross Revenue (currently 1%)
- Internal Systems Fee: ~2% of Gross Revenue (sliding scale for operations hub, scheduling, CRM)
- Local Advertising: $500 - $2,000/month minimum (paid to third parties)
- Software & Applications: $30 - $80/month

Financial Qualifications:
- Net worth of at least $150,000
- Liquid capital of $50,000 - $100,000 available for investment

IMPORTANT: See Items 5, 6, and 7 of our Franchise Disclosure Document for complete details on all fees and costs. These figures are estimates from the FDD and actual costs may vary based on your specific situation.`,
    isPublic: true,
  },
  {
    title: "Training and Support",
    category: "TRAINING_SUPPORT" as const,
    content: `Acme Franchise provides comprehensive training and ongoing support to all franchisees.

Initial Training:
The initial training program is in Westside, Tennessee for five (5) days. Training includes up to two (2) people; at least one owner and manager must attend.

Pre-Training Materials:
- Training Agenda
- Acme Franchise Kit
- Operations Manuals (Introduction, Training and Pre-Opening)
- Access to the Teach Story Time Portal (must complete Modules 1-3)

Training Topics:
- Creating new business entity
- Establishing banking relationships
- Seeking tutor candidates
- Introducing the brand to the market
- Curriculum certification
- Classroom management
- Operations systems

Acme Franchise Academy:
Prior to teaching lessons, franchisees complete Acme Franchise Academy covering:
- The curriculum
- Chess basics
- How to use teaching tools
- Classroom management
- Professional behavior
- Brand standards

Ongoing Support:
- Dedicated franchise success coach
- Monthly franchisee meetings
- Quarterly business reviews
- Advanced curriculum training
- Peer networking events
- Franchise support email: franchisesupport@acmefranchise.com
- Earl AI assistant for operational questions`,
    isPublic: true,
  },
  {
    title: "Pre-Work Phase Explained",
    category: "PROCESS" as const,
    content: `The pre-work phase is a critical part of our franchise selection process. It consists of 5 modules completed over 2-4 weeks:

Module 1: Territory Builder
- Define your target territory
- Use map-based territory selector
- Identify zip codes and cities
- Count schools in your area (preschools, daycares, elementary)

Module 2: Market Research
- Analyze total addressable market
- Research public vs private vs charter schools
- Document enrollment estimates
- Study income demographics
- Identify existing enrichment competitors
- Cite all your sources

Module 3: Outreach Tracker
- Contact at least 10 schools
- Have at least 5 live conversations
- Track: school name, contact, date, method, outcome
- Develop call scripts and follow-up templates

Module 4: Reflection & Video
- What objections did you hear?
- What excited schools?
- What surprised you?
- Optional: Submit a Loom video reflection

Module 5: 90-Day Launch Plan
- Week 1 actions
- 30-day milestones
- 60-day milestones
- 90-day goals
- Local presence strategy (PTAs, libraries, fairs)

Why Pre-Work Matters:
- Demonstrates commitment and initiative
- Gives you real experience with core activities
- Helps both parties assess fit
- Prepares you for a successful launch

What We're Looking For:
- Follow-through and quality work
- Ability to build relationships
- Strategic thinking
- Coachability
- Genuine enthusiasm`,
    isPublic: true,
  },
  {
    title: "Chess Benefits for Children",
    category: "CHESS_BENEFITS" as const,
    content: `Research shows that gameplay combined with storytelling has powerful learning outcomes.

Academic Skills:
- Board games support numeracy skills: counting, sorting, spatial reasoning
- Games increase interest in mathematics
- Vocabulary expansion and reading comprehension improvement
- Narrative skills reinforced through thematic elements

Cognitive Skills:
- Critical thinking through strategic planning
- Problem-solving and deductive reasoning
- Working memory improvement
- Executive function development (turn-taking, resource management)
- Metacognition in cooperative games

Social-Emotional Skills:
- Self-regulation and patience
- Sportsmanship and handling wins/losses
- Understanding others' perspectives
- Navigating social dynamics
- Empathy and communication skills

The Role of Storytelling:
Stories capture children's attention in ways that enhance learning. Fantasy elements stimulate cognitive engagement and enrich learning outcomes. Critical elements include:
- Well-integrated narratives
- Empathetic characters
- Adaptive storylines

Acme Franchise Application:
The weaving of gameplay, storytelling, and family connection is the foundation of all Acme Franchise programs. The program reimagines chess by embedding gameplay in engaging stories that support:
- Critical thinking
- Executive function
- Collaboration
- Communication
- Language development
- Mathematical thinking

Each game is taught using silly stories with captivating characters, vibrant illustrations, custom game pieces, and unique game boards.`,
    isPublic: true,
  },
  {
    title: "Franchisor-Franchisee Relationship",
    category: "BUSINESS_MODEL" as const,
    content: `The franchise system is built on an interdependent relationship between all Acme Franchise franchisees and the franchisor.

Franchisor Responsibilities:
- Build and develop the business model, branding, and operational guidelines
- Provide initial and ongoing training and support
- Create and implement marketing campaigns
- Develop and maintain brand standards
- Continuous innovation and product development
- Supply chain management and approved suppliers
- Legal compliance and intellectual property protection

Franchisee Responsibilities:
- Follow Acme Franchise established guidelines and procedures
- Manage local operations including staffing, marketing, and sales
- Adhere to brand standards for products and services
- Implement local marketing while following brand guidelines
- Maintain customer satisfaction and brand reputation
- Manage business finances and maintain profitability
- Pay royalties and fees as specified in franchise agreement

Key Relationship Points:
- Franchisees are independently owned and operated
- Acme Franchise does NOT control hiring, firing, supervision, or compensation
- Franchisees are solely responsible for employment decisions
- Open communication is key to mutual success
- Submit suggestions to franchisesupport@acmefranchise.com
- Decisions benefit the entire franchise system`,
    isPublic: true,
  },
  {
    title: "Frequently Asked Questions",
    category: "FRANCHISE_FAQ" as const,
    content: `Q: Do I need chess experience?
A: No! Our curriculum certification teaches you everything you need to know about chess and our teaching method. You'll complete Acme Franchise Academy before teaching.

Q: Do I need teaching experience?
A: Not required, but helpful. We train you on classroom management and engaging young learners ages 2-8.

Q: Is this full-time or part-time?
A: Most start part-time and grow to full-time. Programs run after school and on weekends. The business operates flexibly, with or without a physical location.

Q: What territories are available?
A: We have territories available in most major metros. Westside and Eastside are already active. Contact us to discuss your preferred area.

Q: How long to get started?
A: Typical timeline is 10-18 weeks from inquiry to launching your first programs. Initial training is 5 days in Westside.

Q: What ongoing support do I get?
A: Dedicated coach, monthly meetings, marketing resources, continuous training, annual conference, and our Earl AI assistant.

Q: Can I hire instructors?
A: Yes! Most franchisees start as owner-operators and hire additional tutors as they grow. Training on recruiting and managing tutors is included.

Q: What about curriculum updates?
A: Acme Franchise provides ongoing curriculum development. You'll receive notification when changes are made and access to new materials.

Q: Is there an annual conference?
A: Yes, there's a $1,500 per attendee annual conference fee for the franchisee gathering.`,
    isPublic: true,
  },
  {
    title: "Selection Process Steps",
    category: "PROCESS" as const,
    content: `Our franchise selection process is designed to ensure mutual fit:

1. Initial Inquiry (1-2 days)
Submit your interest and we'll reach out within 24-48 hours.

2. Discovery Call (30 minutes)
Learn about the opportunity and discuss your background and goals.

3. FDD Review (14+ days)
Receive and review the Franchise Disclosure Document with your attorney.

4. Pre-Work Phase (2-4 weeks)
Complete all 5 modules to demonstrate commitment:
- Territory Builder
- Market Research
- Outreach Tracker
- Reflection
- 90-Day Launch Plan

5. Discovery Day (1-2 days)
Visit Westside to meet the team and observe classes.

6. Selection & Agreement (1-2 weeks)
If mutual fit, review and sign the Franchise Agreement.

7. Training & Launch (4-8 weeks)
Complete 5-day training in Westside, then launch your first programs.

Total timeline: 10-18 weeks from inquiry to launch.

What We Look For in Franchisees:
- Passion for education and children
- Entrepreneurial drive
- Community connection
- Coachability
- Financial readiness
- Long-term commitment`,
    isPublic: true,
  },
  {
    title: "Research Whitepaper: Effectiveness of Storytelling and Gameplay",
    category: "CHESS_BENEFITS" as const,
    content: `Acme Franchise has published a comprehensive research whitepaper titled "Effectiveness of Storytelling and Gameplay to Ignite Learning" authored by Lee A. Scott, M.A. and Jennifer Jipson, Ph.D., with Dr. Deborah Weber as advisor.

KEY RESEARCH FINDINGS:

Board Games and Academic Learning:
- A systematic review of 19 studies found clear evidence that playing board games benefits various early math skills including numeracy, calculation, spatial reasoning, sorting, and patterning (Balladares et al., 2023)
- Children who frequently play board games perform better in math than those who play card or video games
- Board games increase children's interest in mathematics - attitudes and ability reinforce each other
- Games create environments that foster language development through conversation, turn-taking, and active listening

Cognitive Skills Development:
- Games foster critical thinking by requiring players to analyze situations, anticipate outcomes, and strategize
- Strategy games like chess are positively linked to developing executive function skills including flexible thinking, working memory, and inhibitory control
- Children who play more board games perform better on tasks measuring inhibitory control (Gashaj et al., 2021)
- Real-time feedback loops in games are crucial for young children's learning

Socioemotional Benefits:
- Board games help develop self-regulation - the most important social skill in gameplay
- Children learn to wait their turn, think about moves, cope with losses, and manage excitement
- Research concluded that board games are effective tools for supporting positive mental health and fostering interpersonal interactions (Noda et al., 2019)
- Games provide structured yet playful settings for practicing empathy, patience, and effective communication

The Power of Storytelling:
- Storytelling structures information in ways that become memorable, interrelated, and personally meaningful
- Fantasy stories ignite imagination and creativity, supporting attention, memory, vocabulary learning, and deep processing
- Children learn more when fantasy components are made relevant to educational content rather than gratuitous
- Stories help children navigate complex emotions and develop empathy

Four Key Elements for Effective Narrative in Games (Naul et al., 2020):
1. Distributed narrative - story distributed throughout gameplay
2. Endogenous fantasy and intrinsic integration - story built within the game, not separate
3. Empathetic characters - strong characters children can relate to
4. Adaptive and responsive storytelling - player interaction impacts outcomes

Family Engagement Impact:
- When families are engaged in supporting learning, children achieve higher academic performance and greater sense of belonging (Epstein, 2020)
- Family gameplay can enhance mental and emotional well-being and improve critical life skills
- Six skill areas impacted by board games: Stress Relief, Critical Thinking, Collaboration, Working Memory, Confidence, and Communication

Chess-Specific Research:
- Chess has more significant impact on early learners than older children (Chitiyo et al., 2023)
- Regular chess play is associated with improved cognitive abilities including problem-solving, critical thinking, and spatial skills (Giovanni S. et al., 2016)
- Chess promotes social and emotional skills such as patience, sportsmanship, and resilience (Aciego et al., 2016)

The whitepaper is available for download at: /Story-Time-Chess-Research-Whitepaper.pdf

This research forms the foundation of all Story Time Learning programs, demonstrating how gameplay, storytelling, and family connections can intertwine to create powerful learning experiences.`,
    isPublic: true,
  },
  {
    title: "Westside Market Success Story",
    category: "TESTIMONIALS" as const,
    content: `Westside Market Case Study

Westside was one of our first franchise markets, led by Jon Sieber. Here's what's working:

Networking Strategy:
- Outreach to family-focused venues like Woodland Play Cafe & Family Club
- Direct messaging introducing Acme Franchise and class opportunities
- Quick response follow-up within hours

Social Media Outreach:
- Connecting with MNPS Family & Community Partnerships
- Introducing the NYC track record and DOE experience
- Requesting direction to decision-makers

Start-up Marketing Package:
Essential materials for market launch include:
- Giant chessboard and colorful pieces
- Pull-up banners (informational + offerings)
- Coloring sheets
- Prize spinner wheel
- Sandwich board
- Acme Franchise branded tent
- Branded tablecloth
- Logo and character stickers

The Westside team has demonstrated successful cold outreach templates that get responses and convert to partnerships.`,
    isPublic: true,
  },
  {
    title: "Territory and Market Information",
    category: "TERRITORY_INFO" as const,
    content: `Territory Overview:

Active Markets:
- Westside, Tennessee (established)
- Eastside, Florida (established)
- NYC Metro Area (company-operated)

Expansion Targets:
- Major metropolitan areas with strong early childhood education markets
- Areas with high concentrations of preschools, daycares, and elementary schools
- Communities valuing enrichment education

Territory Definition:
- Based on geographic boundaries (zip codes, cities)
- Exclusive rights within defined area
- Protection from other franchisees operating in your territory

Market Research Considerations:
- Total addressable market: typically 50+ schools per territory
- Target 20% conversion rate for partnerships
- Look for 4+ classrooms per school average
- 20 students per classroom estimate
- 30% parent opt-in for elective programs (higher in urban markets)

School Types to Target:
- Private ECEs (Early Childhood Education centers)
- Public K-5 elementary schools
- Charter schools
- Libraries
- Community centers
- Learning centers

Market Assessment:
During pre-work, you'll research your specific market to understand opportunity size, competition, and demographics.`,
    isPublic: true,
  },
  {
    title: "FDD Item 19 - Financial Performance Representations",
    category: "INVESTMENT" as const,
    content: `IMPORTANT: Item 19 of our Franchise Disclosure Document contains historic financial performance data from our company-owned outlets. This document is shared AFTER your initial conversation with our franchise team.

WHAT ITEM 19 CONTAINS:
- Historic sales data from our 5 company-owned locations
- Breakdown by revenue type (In-Home, School, Retail where applicable)
- Required disclaimers about individual results varying

WHY WE DON'T SHARE SPECIFIC FIGURES BEFORE THE FDD:
The FDD is a legal document that must be provided in its complete form. Our team will walk you through Item 19 in detail after your initial conversation, so you can understand the context and ask questions.

WHAT TO EXPECT:
After speaking with our franchise team, you'll receive the complete FDD including Item 19 with all financial performance data. You'll have at least 14 days to review it with your attorney and financial advisor before making any decisions.

IMPORTANT: Acme Franchise does not make earnings predictions or projections. We do not authorize our employees or representatives to make any financial performance representations beyond what is documented in the FDD. If anyone provides earnings projections, please report it to our management at franchisesupport@acmefranchise.com.`,
    isPublic: true,
  },
  {
    title: "FDD Compliance Rules - Earnings Claims",
    category: "INVESTMENT" as const,
    content: `FRANCHISE COMPLIANCE - WHAT WE CAN AND CANNOT SAY

FDD DISCLOSURE TIMING:
The FDD is shared AFTER the initial conversation with our franchise team, not before. Do not tell prospects to "review the FDD" - they haven't received it yet. Instead, let them know the FDD will be shared after speaking with our team.

WHAT WE CAN SHARE BEFORE FDD:
- General investment range: $55,627 - $75,988 (mention full details in FDD after conversation)
- General business model description and revenue streams
- Information about training and support
- Testimonials about the experience (not earnings claims)

WHAT WE CANNOT DO:
- Make earnings predictions or projections for franchisees
- Promise or guarantee any specific financial returns
- Provide ROI calculations or payback period estimates
- Share specific company-owned outlet sales figures (those are in the FDD)
- Tell prospects to "review the FDD" before they've had a conversation with our team

HOW TO HANDLE EARNINGS QUESTIONS:
Say something like: "I can't provide specific earnings projections. After your initial conversation with our team, they'll share the Franchise Disclosure Document which contains all the detailed financial information. Would you like to schedule a call?"

IMPORTANT: Acme Franchise does not authorize employees or representatives to make financial performance representations. The FDD contains all official financial data and is only shared after an initial conversation with our franchise team.`,
    isPublic: true,
  },
  {
    title: "Franchise Disclosure Document Overview",
    category: "PROCESS" as const,
    content: `The Franchise Disclosure Document (FDD) is a legal document that provides detailed information about the Acme Franchise franchise opportunity. Federal and state laws require us to provide this document at least 14 days before you sign any agreement or pay any fees.

WHEN YOU RECEIVE THE FDD:
The FDD is shared AFTER your initial conversation with our franchise team - not before. This allows us to understand your goals and ensure mutual fit before diving into the detailed documentation.

FDD RECEIPT PROCESS:
1. Submit inquiry and have initial conversation with our team
2. If there's mutual interest, receive the FDD
3. Required 14-day waiting period to review
4. Review FDD with your attorney and financial advisor
5. Contact existing franchisees (listed in Exhibit E)
6. Complete pre-work modules during review period
7. If mutual fit, proceed to franchise agreement signing

KEY FDD ITEMS (shared after initial conversation):
- Item 5: Initial Fees
- Item 6: Other Fees (ongoing royalties, brand fund, technology fees)
- Item 7: Estimated Initial Investment ($55,627 - $75,988)
- Item 19: Financial Performance Representations
- Item 20: Outlets and Franchisee Information
- Exhibit E: List of current and former franchisees

REGISTRATION STATES:
Acme Franchise is registered to offer franchises in states that regulate franchise sales: California, Hawaii, Illinois, Indiana, Maryland, Michigan, Minnesota, New York, North Dakota, Oregon, Rhode Island, South Dakota, Virginia, Washington, and Wisconsin.

NOTE: This website and Earl the chatbot provide general information only. This is not an offer to sell a franchise. An offer is made only through the Franchise Disclosure Document, which you'll receive after speaking with our team.`,
    isPublic: true,
  },
];

async function main() {
  console.log("Seeding knowledge base with comprehensive content...");

  for (const doc of knowledgeDocuments) {
    const docId = doc.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 24);

    const slug = doc.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 80);

    const created = await prisma.knowledgeDocument.upsert({
      where: { id: docId },
      update: doc,
      create: {
        id: docId,
        slug,
        ...doc,
      },
    });

    // Delete existing chunks for this document
    await prisma.knowledgeChunk.deleteMany({
      where: { documentId: created.id },
    });

    // Create chunks with better splitting
    const paragraphs = doc.content.split("\n\n").filter((c) => c.trim().length > 30);

    for (let i = 0; i < paragraphs.length; i++) {
      await prisma.knowledgeChunk.create({
        data: {
          id: `${created.id}-chunk-${i}`,
          documentId: created.id,
          content: paragraphs[i].trim(),
          tokenCount: Math.ceil(paragraphs[i].length / 4),
          sequence: i,
        },
      });
    }

    console.log(`Created/updated document: ${doc.title} with ${paragraphs.length} chunks`);
  }

  const totalDocs = await prisma.knowledgeDocument.count();
  const totalChunks = await prisma.knowledgeChunk.count();

  console.log(`\nKnowledge base seeding complete!`);
  console.log(`Total documents: ${totalDocs}`);
  console.log(`Total chunks: ${totalChunks}`);
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
