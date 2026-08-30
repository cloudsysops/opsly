import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Academy-exclusive knowledge documents for franchisees
// Note: Run `npx prisma db push` first to update schema with KnowledgeScope enum
const academyKnowledgeDocuments = [
  {
    title: "School Partnership Negotiation Playbook",
    category: "SALES" as const,
    scope: "ACADEMY" as const,
    content: `SCHOOL PARTNERSHIP NEGOTIATION GUIDE

INITIAL OUTREACH STRATEGY:
1. Research the school before reaching out
   - Check their website for enrichment programs
   - Look at class sizes and age groups
   - Find the decision-maker (often Director or Owner for private, Principal for public)

2. First Contact Script:
"Hi [Name], I'm [Your Name] with Acme Franchise. We teach chess to young children ages 3-8 using storytelling - our method won 2021 Toy of the Year. I'd love to show you a 15-minute demo with your students. When would work best for a quick call?"

PRICING STRATEGY:
- School pays (all-play model): $15-20 per student per lesson
- Parent pays (elective model): $22-30 per student per lesson
- School handles billing: offer 10% discount
- Recommend 13-lesson semesters (one per week)

NEGOTIATION TIPS:
- Start high, you can always come down
- Offer free demo day to reduce risk
- Multi-semester discounts (5% for annual commitment)
- Volume discounts for 4+ classrooms

COMMON OBJECTIONS AND RESPONSES:
"We don't have budget" → "Parents pay directly for elective programs"
"We already have enrichment" → "Chess is unique - complements other programs"
"Kids are too young" → "Our method is designed for ages 3+, award-winning"

CLOSING THE DEAL:
1. Always get a signed contract before starting
2. Collect payment terms in writing
3. Confirm classroom schedule and start date
4. Send welcome packet to school`,
    isPublic: true,
  },
  {
    title: "Marketing Campaign Templates",
    category: "MARKETING" as const,
    scope: "ACADEMY" as const,
    content: `PROVEN MARKETING CAMPAIGNS FOR FRANCHISEES

FACEBOOK/INSTAGRAM ADS:
Campaign: Free Trial Class
Target: Parents 25-45, 10-mile radius, interests in education, chess, enrichment
Budget: $10-20/day
Creative: Video of kids playing chess with testimonial
Copy: "FREE Chess Class for Kids 3-8! Our award-winning Acme Franchise program teaches chess through storytelling. Limited spots - register now!"
CTA: Sign Up Now → Landing page

COMMUNITY EVENT MARKETING:
Strategy: Set up at local events with demo board
Events: Farmer's markets, library events, school fairs, community festivals
Materials needed:
- Giant floor chess set
- Prize wheel with small prizes
- Signup clipboard
- Branded tent/tablecloth
- Coloring sheets for kids

EMAIL CAMPAIGNS:
Welcome Series (after lead capture):
Day 0: "Welcome! Here's what Acme Franchise is about"
Day 2: "Why chess for kids? The research"
Day 5: "See our students in action" (video)
Day 7: "Ready to try? Book your free class"

SEASONAL CAMPAIGNS:
Back-to-School (Aug-Sep): After-school program push
Holiday (Nov-Dec): Gift certificates, camps
New Year (Jan): New semester enrollment
Summer (Apr-May): Summer camp pre-registration

REFERRAL PROGRAM:
Offer: $50 credit for referrer, 10% off for new family
Process: Current families get referral cards
Track: Referrer name on signup form`,
    isPublic: true,
  },
  {
    title: "Pricing Optimization Guide",
    category: "SALES" as const,
    scope: "ACADEMY" as const,
    content: `PRICING STRATEGY AND OPTIMIZATION

RECOMMENDED PRICE RANGES BY PROGRAM TYPE:

School Programs:
- All-play (school pays): $15-20/student/lesson
- Elective (parent pays): $22-30/student/lesson
- After-school clubs: $25-35/student/lesson

Community/Club Programs:
- Group classes (6-12 kids): $25-35/student/hour
- Semi-private (3-5 kids): $40-50/student/hour
- Birthday parties: $250-400/party (2 hours)

Private Lessons:
- In-home: $60-100/hour
- Online: $40-60/hour
- Siblings discount: 25% off second child

Summer Camps:
- Half-day (3 hours): $250-350/week
- Full-day (6 hours): $450-600/week
- Early bird discount: 10% before April 1

PRICING PSYCHOLOGY:
- End prices in 7 or 9 ($27, $199)
- Show per-lesson price, not total
- Offer semester packages with small discount
- Bundle products (game + lessons)

DYNAMIC PRICING:
- Premium pricing for peak times (Saturdays, after school)
- Discount for off-peak (weekday mornings)
- Wait-list premium when demand is high

DISCOUNTS TO OFFER:
- Multi-child: 15% off second, 25% off third+
- Annual commitment: 5-10% off
- Referral: $50 credit
- Sibling: 25% off

AVOID:
- Deep discounts that devalue the service
- Complicated pricing structures
- Hidden fees that surprise parents`,
    isPublic: true,
  },
  {
    title: "Operations Standard Operating Procedures",
    category: "OPERATIONS" as const,
    scope: "ACADEMY" as const,
    content: `DAILY OPERATIONS SOP

BEFORE EACH CLASS:
1. Arrive 10-15 minutes early
2. Set up chess equipment (boards, pieces, lesson materials)
3. Greet school staff and confirm headcount
4. Review lesson plan and any special notes

DURING CLASS:
1. Start with attendance roll call
2. Follow lesson structure: Story → Demo → Play
3. Keep energy high with songs, movements
4. End with cleanup routine and preview of next lesson

AFTER CLASS:
1. Pack all materials (inventory check)
2. Brief school staff on any issues
3. Log attendance in system
4. Note any student achievements or concerns

WEEKLY TASKS:
- Monday: Review week's schedule, prep materials
- Wednesday: Mid-week check-in with schools
- Friday: Send parent communication/updates
- Weekend: Inventory check, marketing review

MONTHLY TASKS:
- Invoice schools (if applicable)
- Collect outstanding payments
- Review financials and P&L
- Plan next month's marketing
- Meet with tutor team (if applicable)

EMERGENCY PROCEDURES:
- Child injury: First aid, notify school, document
- Behavioral issue: Calm approach, involve school staff
- Cancellation: Notify all parties ASAP, reschedule

EQUIPMENT MAINTENANCE:
- Clean pieces monthly with disinfectant wipes
- Replace missing pieces from spare sets
- Check boards for damage quarterly`,
    isPublic: true,
  },
  {
    title: "Tutor Hiring and Training Guide",
    category: "OPERATIONS" as const,
    scope: "ACADEMY" as const,
    content: `HIRING AND MANAGING TUTORS

IDEAL TUTOR PROFILE:
- Background in education OR child development OR theater
- Enthusiastic, high-energy personality
- Reliable and punctual
- Chess knowledge NOT required (we train)
- Background check required

WHERE TO RECRUIT:
- Local colleges (education, theater majors)
- Facebook groups for educators
- Indeed/ZipRecruiter
- Referrals from current tutors
- Theater groups, improv classes

INTERVIEW QUESTIONS:
1. "Tell me about your experience with young children"
2. "How would you handle a child who won't participate?"
3. "Do a quick demo: teach me something simple"
4. "What's your availability?"
5. "Why are you interested in this role?"

RED FLAGS:
- Can't make eye contact or speak clearly
- Negative about previous jobs/kids
- Inflexible with schedule
- Doesn't ask questions about the role

COMPENSATION STRUCTURE:
- Starting rate: $18-25/hour (market dependent)
- Travel time: $0.50-0.67/mile
- Prep time: Include 15 min before/after
- Reviews: Annual, with merit increases

TRAINING REQUIREMENTS:
1. Acme Franchise Academy (online certification)
2. Shadow experienced tutor (2-3 classes)
3. Teach with mentor observation (2-3 classes)
4. Solo teaching with check-ins

ONGOING MANAGEMENT:
- Weekly check-ins initially, then monthly
- Quarterly classroom observations
- Annual performance reviews
- Team meetings (virtual or in-person monthly)`,
    isPublic: true,
  },
  {
    title: "Client Retention Strategies",
    category: "SALES" as const,
    scope: "ACADEMY" as const,
    content: `KEEPING FAMILIES ENROLLED

RETENTION METRICS TO TRACK:
- Re-enrollment rate by semester
- Churn reasons (exit surveys)
- Average lifetime value per family
- Net Promoter Score (NPS)

KEY RETENTION DRIVERS:
1. Student Progress Visibility
   - Monthly progress reports
   - Skill badges and certificates
   - Parent showcase events

2. Communication Cadence
   - Weekly class recaps (brief)
   - Monthly newsletter
   - Photo/video sharing (with permission)
   - Responsive to parent questions

3. Community Building
   - Chess tournaments (quarterly)
   - Family game nights
   - Parent coffee meetups
   - Online parent group

PREVENTING CHURN:
At-Risk Signals:
- Missing classes frequently
- Not responding to communications
- Negative feedback
- Payment issues

Intervention Steps:
1. Personal outreach (call, not email)
2. Understand the issue
3. Offer solutions (schedule change, makeup classes)
4. Follow up in 1 week

SEMESTER TRANSITION:
4 Weeks Before End:
- Send re-enrollment notice
- Highlight upcoming curriculum
- Early bird discount for returning families

2 Weeks Before End:
- Personal call to undecided families
- Share progress and what's next
- Address any concerns

LOYALTY PROGRAM:
- Year 1: 5% discount
- Year 2: 10% discount + priority registration
- Year 3+: 15% discount + free game
- Referral bonus at all levels`,
    isPublic: true,
  },
  {
    title: "Financial Management for Franchisees",
    category: "LEGAL" as const,
    scope: "ACADEMY" as const,
    content: `FINANCIAL MANAGEMENT BEST PRACTICES

TRACKING YOUR NUMBERS:

Key Metrics to Monitor Weekly:
- Revenue booked vs collected
- Number of students enrolled
- Class attendance rates
- Pipeline (leads, trials, conversions)

Monthly Financial Review:
- Profit & Loss statement
- Cash flow statement
- Accounts receivable aging
- Comparison to budget

EXPENSE CATEGORIES:
Variable Costs:
- Tutor wages (typically 30-40% of revenue)
- Travel/mileage
- Marketing (10-15% recommended)
- Supplies and materials

Fixed Costs:
- Royalties (7% of gross)
- Brand fund (1-2%)
- Internal systems fee (~2%)
- Insurance
- Software subscriptions

CASH FLOW MANAGEMENT:
- Bill schools net-15, follow up immediately
- Collect parent payments upfront or card-on-file
- Maintain 2-month operating reserve
- Time major purchases after strong months

TAX CONSIDERATIONS:
- Set aside 25-30% of profit for taxes
- Track mileage (currently $0.67/mile deduction)
- Home office deduction if applicable
- Quarterly estimated tax payments

GROWTH INVESTMENT:
When profitable, reinvest in:
1. Marketing (accelerate growth)
2. Additional tutors (scale capacity)
3. Equipment (more schools = more sets)
4. Training (advanced certifications)

Note: Consult with your accountant for tax and financial advice specific to your situation.`,
    isPublic: true,
  },
  {
    title: "Troubleshooting Common Challenges",
    category: "OPERATIONS" as const,
    scope: "ACADEMY" as const,
    content: `COMMON CHALLENGES AND SOLUTIONS

CHALLENGE: Low school response rate
SOLUTION:
- Personalize outreach (mention specific school details)
- Call instead of email
- Offer free demo day with no commitment
- Follow up 3 times before moving on
- Try different contacts at the school

CHALLENGE: Parents not enrolling after trial
SOLUTION:
- Follow up within 24 hours of trial
- Address objections directly
- Offer limited-time enrollment bonus
- Get testimonials from happy parents
- Improve demo quality (energy, engagement)

CHALLENGE: Attendance dropping
SOLUTION:
- Send reminder texts day before class
- Make-up class policy clear
- Address schedule conflicts proactively
- Increase engagement in class
- Personal check-in with absent families

CHALLENGE: Tutor reliability issues
SOLUTION:
- Clear expectations in writing
- Backup tutor system
- Progressive discipline policy
- Incentives for perfect attendance
- Consider part-time vs full-time balance

CHALLENGE: Cash flow problems
SOLUTION:
- Require payment upfront or card-on-file
- Invoice immediately after class
- Follow up on past-due within 7 days
- Reduce variable costs where possible
- Focus on highest-margin programs

CHALLENGE: Competition from other programs
SOLUTION:
- Emphasize unique award-winning curriculum
- Highlight research and results
- Competitive pricing analysis
- Better marketing presence
- Focus on customer experience

CHALLENGE: Seasonal enrollment dips
SOLUTION:
- Summer camps (peak revenue opportunity)
- Year-round marketing
- Diversify with birthday parties
- Corporate events
- Online/hybrid offerings`,
    isPublic: true,
  },
];

async function main() {
  console.log("Seeding Academy-exclusive knowledge base...");
  console.log("NOTE: Run 'npx prisma db push' first to update schema with new enums.\n");

  for (const doc of academyKnowledgeDocuments) {
    const docId = `academy-${doc.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 30)}`;

    // Use raw create/update to handle new enum values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const created = await (prisma.knowledgeDocument as any).upsert({
      where: { id: docId },
      update: {
        title: doc.title,
        category: doc.category,
        content: doc.content,
        isPublic: doc.isPublic,
        scope: doc.scope,
      },
      create: {
        id: docId,
        title: doc.title,
        category: doc.category,
        content: doc.content,
        isPublic: doc.isPublic,
        scope: doc.scope,
      },
    });

    // Delete existing chunks for this document
    await prisma.knowledgeChunk.deleteMany({
      where: { documentId: created.id },
    });

    // Create chunks with better splitting - split by double newline or headers
    const paragraphs = doc.content
      .split(/\n\n+/)
      .filter((c: string) => c.trim().length > 30);

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

    console.log(
      `Created/updated: ${doc.title} (${doc.scope}) with ${paragraphs.length} chunks`
    );
  }

  // Also index existing AcademyResource content if any
  const resources = await prisma.academyResource.findMany({
    where: {
      content: { not: null },
    },
  });

  console.log(`\nIndexing ${resources.length} existing AcademyResources...`);

  for (const resource of resources) {
    if (!resource.content || resource.content.length < 50) continue;

    const docId = `resource-${resource.slug}`;

    // Map ResourceCategory to KnowledgeCategory
    const categoryMap: Record<string, string> = {
      OPERATIONS: "OPERATIONS",
      MARKETING: "MARKETING",
      SALES: "SALES",
      TRAINING: "TRAINING_SUPPORT",
      LEGAL: "LEGAL",
      FINANCIAL: "INVESTMENT",
      TEMPLATES: "OPERATIONS",
    };

    const category = categoryMap[resource.category] || "TRAINING_SUPPORT";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const created = await (prisma.knowledgeDocument as any).upsert({
      where: { id: docId },
      update: {
        title: resource.title,
        category,
        content: resource.content,
        isPublic: true,
        scope: "ACADEMY",
      },
      create: {
        id: docId,
        title: resource.title,
        category,
        content: resource.content,
        isPublic: true,
        scope: "ACADEMY",
      },
    });

    // Delete existing chunks
    await prisma.knowledgeChunk.deleteMany({
      where: { documentId: created.id },
    });

    // Create chunks
    const paragraphs = resource.content
      .split(/\n\n+/)
      .filter((c: string) => c.trim().length > 30);

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

    console.log(`Indexed resource: ${resource.title} with ${paragraphs.length} chunks`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const academyDocs = await (prisma.knowledgeDocument as any).count({
    where: { scope: "ACADEMY" },
  });
  const totalChunks = await prisma.knowledgeChunk.count();

  console.log(`\nAcademy knowledge seeding complete!`);
  console.log(`Academy-exclusive documents: ${academyDocs}`);
  console.log(`Total chunks in knowledge base: ${totalChunks}`);
  console.log(
    `\nNote: Run 'npx tsx prisma/seed-embeddings.ts' to generate embeddings for new chunks.`
  );
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
