/**
 * Seed script for Operations Manual content
 *
 * Run with: npx tsx prisma/seed-manual.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================
// SECTIONS
// ============================================

const sections = [
  {
    slug: "getting-started",
    title: "Getting Started",
    description:
      "Everything you need to know to begin your journey as a Acme Franchise franchisee.",
    icon: "\u{1F680}",
    sortOrder: 0,
  },
  {
    slug: "daily-operations",
    title: "Daily Operations",
    description:
      "Step-by-step guidance for running your chess classes and managing day-to-day activities.",
    icon: "\u{1F4CB}",
    sortOrder: 1,
  },
  {
    slug: "marketing-sales",
    title: "Marketing & Sales",
    description:
      "Strategies and guidelines for growing your franchise through local marketing and partnerships.",
    icon: "\u{1F4E3}",
    sortOrder: 2,
  },
  {
    slug: "brand-standards",
    title: "Brand Standards",
    description:
      "Visual identity, communication, and appearance guidelines to maintain brand consistency.",
    icon: "\u{1F3A8}",
    sortOrder: 3,
  },
  {
    slug: "policies-compliance",
    title: "Policies & Compliance",
    description:
      "Safety, incident reporting, and data privacy policies that protect our students and franchise network.",
    icon: "\u2696\uFE0F",
    sortOrder: 4,
  },
];

// ============================================
// PAGES
// ============================================

interface PageData {
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  sortOrder: number;
  requiresAcknowledgment: boolean;
  sectionSlug: string;
}

const pages: PageData[] = [
  // ========================================
  // SECTION 1: Getting Started
  // ========================================
  {
    slug: "welcome-to-stc-franchise",
    title: "Welcome to Acme Franchise Franchise",
    excerpt:
      "An overview of the Acme Franchise franchise system, what to expect as a franchisee, and the support available to you.",
    sortOrder: 0,
    requiresAcknowledgment: false,
    sectionSlug: "getting-started",
    content: `<h2>Welcome to the Acme Franchise Family</h2>
<p>Congratulations on becoming a Acme Franchise franchisee! You are now part of a growing network of passionate educators and entrepreneurs who are transforming the way children learn chess. Our franchise system is designed to give you the tools, training, and ongoing support you need to build a thriving business in your community.</p>

<h3>What Acme Franchise Is All About</h3>
<p>Acme Franchise is not just another chess program. We use a narrative-driven curriculum that introduces chess concepts through engaging stories, colorful characters, and imaginative play. Children as young as three years old can begin learning chess with us, building critical thinking skills, patience, and confidence along the way. Our approach has been featured nationally and has helped thousands of families discover the joy of chess.</p>

<h3>What to Expect as a Franchisee</h3>
<p>As a franchisee, you will operate your own Acme Franchise territory, delivering classes at schools, community centers, libraries, and private homes. Your responsibilities include:</p>
<ul>
  <li>Marketing and outreach to schools and families in your territory</li>
  <li>Scheduling and delivering chess classes using the Acme Franchise curriculum</li>
  <li>Hiring, training, and managing part-time chess tutors</li>
  <li>Managing enrollments, invoicing, and customer relationships</li>
  <li>Meeting monthly reporting and royalty obligations</li>
</ul>

<h3>Support Available to You</h3>
<p>You are never alone in this journey. The Acme Franchise corporate team provides:</p>
<ul>
  <li><strong>Dedicated onboarding support</strong> through the 90-Day Launch Journey</li>
  <li><strong>Marketing materials</strong> including flyers, social media templates, and email campaigns</li>
  <li><strong>Ongoing training</strong> through the Story Time Academy portal</li>
  <li><strong>Operational tools</strong> including scheduling software, invoicing platforms, and CRM access</li>
  <li><strong>Regular check-ins</strong> with your franchisor to review progress and troubleshoot challenges</li>
</ul>
<p>We are invested in your success. When you succeed, we all succeed.</p>`,
  },
  {
    slug: "system-overview",
    title: "System Overview",
    excerpt:
      "How to navigate the franchise portal, key features available to you, and where to get help.",
    sortOrder: 1,
    requiresAcknowledgment: false,
    sectionSlug: "getting-started",
    content: `<h2>Your Franchise Portal</h2>
<p>The Acme Franchise Franchise Portal is your central hub for managing every aspect of your franchise. This section walks you through the key features and how to get the most out of the system.</p>

<h3>Dashboard</h3>
<p>When you log in, your dashboard gives you a snapshot of your franchise health at a glance. You will see your current month revenue, upcoming classes, outstanding tasks from your 90-Day Journey, and any notifications from the corporate team. Check your dashboard daily to stay on top of priorities.</p>

<h3>90-Day Journey</h3>
<p>The Journey section is your guided onboarding path. It breaks down everything you need to accomplish in your first 90 days into weekly tasks with clear deadlines. Each task has a specific owner (you, the franchisor, or collaborative) and a verification method so both parties know when it is complete. Complete tasks on time to stay on track for a successful launch.</p>

<h3>Royalties & Financials</h3>
<p>The Royalties section shows your monthly invoices, payment history, and revenue breakdown. Each month, your gross revenue is calculated and a royalty invoice is generated for your review. You can approve or dispute invoices directly in the portal before payment is collected.</p>

<h3>Operations Manual</h3>
<p>You are reading it right now. The Operations Manual contains all the policies, procedures, and best practices you need to run your franchise. Some pages require your acknowledgment to confirm you have read and understood the content. You can return to any page at any time for reference.</p>

<h3>Getting Help</h3>
<p>If you need assistance at any point, you have several options:</p>
<ul>
  <li><strong>Earl the Squirrel (AI Assistant)</strong> - Use the chat widget on any page to ask questions about franchise operations</li>
  <li><strong>Email</strong> - Reach the franchise team at <a href="mailto:franchising@acmefranchise.com">franchising@acmefranchise.com</a></li>
  <li><strong>Scheduled Calls</strong> - Request a call with your franchisor through the portal</li>
</ul>`,
  },
  {
    slug: "key-contacts",
    title: "Key Contacts",
    excerpt:
      "Who to contact for operations, marketing, billing, and technical support questions.",
    sortOrder: 2,
    requiresAcknowledgment: false,
    sectionSlug: "getting-started",
    content: `<h2>Key Contacts Directory</h2>
<p>Knowing who to reach out to for specific questions saves time and ensures you get the right answer quickly. Below is a directory of key contacts organized by department.</p>

<h3>Franchise Operations</h3>
<p>For questions about your territory, class scheduling, tutor management, curriculum delivery, or day-to-day operations:</p>
<ul>
  <li><strong>Email:</strong> <a href="mailto:franchising@acmefranchise.com">franchising@acmefranchise.com</a></li>
  <li><strong>Response Time:</strong> Within 24 hours on business days</li>
  <li><strong>Best For:</strong> Territory questions, scheduling conflicts, operational guidance, partnership agreements</li>
</ul>

<h3>Marketing Support</h3>
<p>For marketing materials, brand guidelines, social media questions, or advertising approval:</p>
<ul>
  <li><strong>Email:</strong> <a href="mailto:franchising@acmefranchise.com">franchising@acmefranchise.com</a> (subject line: Marketing Request)</li>
  <li><strong>Response Time:</strong> Within 48 hours on business days</li>
  <li><strong>Best For:</strong> Custom flyer requests, social media content review, event marketing support</li>
</ul>

<h3>Billing & Royalties</h3>
<p>For questions about royalty invoices, payment processing, revenue discrepancies, or financial reporting:</p>
<ul>
  <li><strong>Email:</strong> <a href="mailto:admin@acmefranchise.com">admin@acmefranchise.com</a></li>
  <li><strong>Response Time:</strong> Within 24 hours on business days</li>
  <li><strong>Best For:</strong> Invoice disputes, payment questions, Stripe Connect issues, revenue verification</li>
</ul>

<h3>Technical Support</h3>
<p>For issues with the franchise portal, login problems, or software-related questions:</p>
<ul>
  <li><strong>Email:</strong> <a href="mailto:admin@acmefranchise.com">admin@acmefranchise.com</a></li>
  <li><strong>Response Time:</strong> Within 24 hours (urgent issues within 4 hours)</li>
  <li><strong>Best For:</strong> Portal bugs, password resets, system access issues, integration problems</li>
</ul>

<h3>Emergency Contacts</h3>
<p>For urgent situations involving child safety, legal matters, or situations requiring immediate response:</p>
<ul>
  <li><strong>Phone:</strong> Contact your franchisor directly via the number provided during onboarding</li>
  <li><strong>For child safety emergencies:</strong> Call 911 first, then notify the franchise team immediately</li>
</ul>`,
  },

  // ========================================
  // SECTION 2: Daily Operations
  // ========================================
  {
    slug: "class-preparation",
    title: "Class Preparation",
    excerpt:
      "How to prepare for chess classes, materials needed, and room setup requirements.",
    sortOrder: 0,
    requiresAcknowledgment: false,
    sectionSlug: "daily-operations",
    content: `<h2>Preparing for a Great Class</h2>
<p>A well-prepared class sets the stage for engaged students and happy parents. Preparation should begin at least 24 hours before each class and include reviewing the lesson plan, gathering materials, and confirming logistics with the venue.</p>

<h3>Materials Checklist</h3>
<p>Before every class, confirm you have the following items packed and ready:</p>
<ul>
  <li><strong>Chess sets</strong> - One set per two students, plus one demonstration set</li>
  <li><strong>Acme Franchise storybook</strong> for the lesson being taught</li>
  <li><strong>Character cards</strong> matching the lesson (King, Queen, Rook, Bishop, Knight, Pawn)</li>
  <li><strong>Attendance sheet</strong> or digital check-in device</li>
  <li><strong>Name tags</strong> for new students</li>
  <li><strong>Parent flyers</strong> with enrollment information and contact details</li>
  <li><strong>Branded tablecloth or banner</strong> if space allows</li>
  <li><strong>Small prizes or stickers</strong> for participation and achievements</li>
</ul>

<h3>Reviewing the Lesson Plan</h3>
<p>Each class follows the Acme Franchise curriculum sequence. Before class, review:</p>
<ol>
  <li>Which story and chess piece you are introducing or reviewing</li>
  <li>The key learning objectives for the session</li>
  <li>Practice games or activities planned for the second half of class</li>
  <li>Any differentiation needed for advanced students or beginners joining mid-session</li>
</ol>

<h3>Room Setup</h3>
<p>Arrive at the venue at least 15 minutes early to set up. Arrange tables and chairs so that all students can see the demonstration board. Place chess sets at each station with pieces in starting position. If using a projector or TV screen, test the connection and have your slides ready. Post the Acme Franchise banner near the entrance so parents can easily identify the classroom.</p>

<h3>Confirming with the Venue</h3>
<p>The day before class, send a brief confirmation to your venue contact. Confirm the room assignment, class time, and expected student count. If this is a school partnership, confirm with the front office that you are on the visitor list and know the check-in procedure.</p>`,
  },
  {
    slug: "class-management",
    title: "Class Management",
    excerpt:
      "Running a class effectively, student engagement techniques, handling disruptions, and time management.",
    sortOrder: 1,
    requiresAcknowledgment: false,
    sectionSlug: "daily-operations",
    content: `<h2>Running an Effective Chess Class</h2>
<p>The classroom experience is the heart of your franchise. A well-run class creates repeat customers, word-of-mouth referrals, and lasting impact on students. Follow these guidelines to deliver consistently excellent sessions.</p>

<h3>Class Structure (Typical 45-60 Minute Session)</h3>
<ol>
  <li><strong>Welcome & Review (5 minutes)</strong> - Greet students by name, review what was learned last week, build excitement for today's lesson</li>
  <li><strong>Story Time (10-15 minutes)</strong> - Read the Acme Franchise story for the lesson, introduce the new chess piece or concept using the narrative</li>
  <li><strong>Demonstration (5-10 minutes)</strong> - Show the chess concept on the demonstration board, walk through examples, ask questions to check understanding</li>
  <li><strong>Practice Games (15-20 minutes)</strong> - Students play practice games or mini-challenges that reinforce the lesson concept</li>
  <li><strong>Wrap-Up & Preview (5 minutes)</strong> - Celebrate achievements, hand out stickers or prizes, preview next week's story</li>
</ol>

<h3>Student Engagement Techniques</h3>
<p>Young learners need variety and energy to stay engaged. Use these techniques throughout every class:</p>
<ul>
  <li><strong>Use character voices</strong> when reading stories. Make the King sound regal, the Knight sound brave, the Pawns sound eager to learn.</li>
  <li><strong>Ask questions constantly.</strong> "What piece did we learn about last week?" "Where can the Bishop move?" Keep students actively thinking.</li>
  <li><strong>Celebrate every success.</strong> When a student makes a good move, recognize it publicly. Positive reinforcement keeps children motivated.</li>
  <li><strong>Use pair activities.</strong> Partner stronger students with newer ones for peer teaching moments.</li>
  <li><strong>Keep energy high.</strong> Stand up, move around the room, use hand signals, and vary your vocal volume to maintain attention.</li>
</ul>

<h3>Handling Disruptions</h3>
<p>Disruptions are a normal part of working with children. Handle them calmly and consistently:</p>
<ul>
  <li><strong>Redirect quietly.</strong> Move closer to the disruptive student and gently redirect their attention without stopping the class.</li>
  <li><strong>Use positive framing.</strong> Instead of "Stop talking," try "I love how this table is focused on the game."</li>
  <li><strong>Take a break.</strong> If energy is too high, pause for a 30-second stretch or a quick group activity before continuing.</li>
  <li><strong>Talk privately.</strong> If a student is consistently disruptive, speak with them one-on-one after class and, if needed, follow up with the parent.</li>
</ul>

<h3>Time Management</h3>
<p>Pacing is critical. Start and end on time to maintain trust with venues and parents. If a story or demonstration runs long, shorten the practice game segment rather than cutting into pickup time. Keep a clock or phone timer visible to yourself throughout the session.</p>`,
  },
  {
    slug: "after-class-procedures",
    title: "After-Class Procedures",
    excerpt:
      "Post-class cleanup, parent communication, attendance logging, and follow-up tasks.",
    sortOrder: 2,
    requiresAcknowledgment: false,
    sectionSlug: "daily-operations",
    content: `<h2>After-Class Procedures</h2>
<p>What you do after class is just as important as the class itself. Consistent follow-through builds trust, keeps your records accurate, and creates opportunities for growth.</p>

<h3>Cleanup & Venue Care</h3>
<p>Leave every venue in better condition than you found it. This is non-negotiable for maintaining partnerships:</p>
<ul>
  <li>Return all tables and chairs to their original positions</li>
  <li>Pick up any stray chess pieces, stickers, or materials from the floor</li>
  <li>Pack all Acme Franchise materials into your transport bag</li>
  <li>Check that no personal items were left behind by students</li>
  <li>Thank the venue staff on your way out</li>
</ul>

<h3>Attendance Logging</h3>
<p>Log attendance within 2 hours of each class while the details are fresh. For each session, record:</p>
<ol>
  <li>Date, time, and venue of the class</li>
  <li>Names of students present and absent</li>
  <li>Any new students who attended (note parent contact info)</li>
  <li>Notes about student progress or any issues that occurred</li>
</ol>
<p>Accurate attendance records are essential for billing, for tracking student retention, and for demonstrating value to school partners during contract renewals.</p>

<h3>Parent Communication</h3>
<p>Send a brief class recap to parents within 24 hours of each session. This can be done via email or through your parent messaging system. Include:</p>
<ul>
  <li>What story and chess piece was covered in class</li>
  <li>A tip for practicing at home (e.g., "Ask your child to show you how the Knight moves!")</li>
  <li>A preview of what is coming next week</li>
  <li>Any upcoming events, schedule changes, or enrollment opportunities</li>
</ul>
<p>Consistent parent communication is one of the top drivers of retention and referrals.</p>

<h3>Follow-Up Tasks</h3>
<p>After each class day, review and complete these follow-up items:</p>
<ul>
  <li>Update your CRM or tracking sheet with new leads or interested parents</li>
  <li>Follow up with any parents who expressed interest in additional classes or private lessons</li>
  <li>Note any material shortages so you can restock before your next class</li>
  <li>If a student was absent for two or more consecutive classes, reach out to the parent to check in</li>
</ul>`,
  },

  // ========================================
  // SECTION 3: Marketing & Sales
  // ========================================
  {
    slug: "local-marketing-guide",
    title: "Local Marketing Guide",
    excerpt:
      "How to market in your territory, approved channels, and budget guidelines.",
    sortOrder: 0,
    requiresAcknowledgment: false,
    sectionSlug: "marketing-sales",
    content: `<h2>Marketing Your Acme Franchise Franchise</h2>
<p>Effective local marketing is the engine that drives enrollment and revenue growth. Your territory is your opportunity. This guide outlines the approved marketing channels, budget guidelines, and strategies that have proven successful across the Acme Franchise franchise network.</p>

<h3>Approved Marketing Channels</h3>
<p>You are encouraged to use the following channels to promote your franchise locally:</p>
<ul>
  <li><strong>Facebook & Instagram</strong> - Create local business pages (not personal accounts) for your territory. Post 3-5 times per week with a mix of class photos, chess tips, parent testimonials, and enrollment CTAs.</li>
  <li><strong>Google Business Profile</strong> - Set up and maintain your listing. Encourage happy parents to leave reviews. Respond to all reviews within 48 hours.</li>
  <li><strong>Email Marketing</strong> - Build a local parent email list. Send a monthly newsletter plus enrollment-specific campaigns. Use approved templates from the portal.</li>
  <li><strong>Flyers & Print Materials</strong> - Distribute at schools, libraries, community centers, and family-friendly businesses. Use only approved branded templates.</li>
  <li><strong>Local Community Events</strong> - Set up booths at farmers markets, school fairs, and community festivals.</li>
  <li><strong>Nextdoor & Local Facebook Groups</strong> - Share class information in community groups (follow group rules about self-promotion).</li>
</ul>

<h3>Budget Guidelines</h3>
<p>We recommend allocating 5-10% of your monthly gross revenue toward local marketing. For franchisees in their first 90 days, a minimum marketing budget of $200-400 per month is recommended. A typical breakdown:</p>
<ul>
  <li><strong>Digital Ads (Facebook/Instagram):</strong> $10-20/day during enrollment periods</li>
  <li><strong>Print Materials:</strong> $50-100/month for flyers and banners</li>
  <li><strong>Community Events:</strong> $50-150 per event for booth fees and materials</li>
  <li><strong>Email Platform:</strong> Free tier or $20-50/month depending on list size</li>
</ul>

<h3>What Requires Approval</h3>
<p>The following activities require franchisor approval before execution:</p>
<ol>
  <li>Any paid advertising that modifies the Acme Franchise brand messaging or imagery</li>
  <li>Press releases or media interviews</li>
  <li>Partnerships with businesses that involve co-branding</li>
  <li>Any marketing spend exceeding $500 in a single month</li>
</ol>
<p>Submit approval requests via email to <a href="mailto:franchising@acmefranchise.com">franchising@acmefranchise.com</a> with your proposed materials attached. Allow 3-5 business days for review.</p>`,
  },
  {
    slug: "school-partnerships",
    title: "School Partnerships",
    excerpt:
      "How to approach schools, pitch effectively, and establish partnership agreements.",
    sortOrder: 1,
    requiresAcknowledgment: false,
    sectionSlug: "marketing-sales",
    content: `<h2>Building School Partnerships</h2>
<p>School partnerships are the foundation of a successful Acme Franchise franchise. A single school partnership can generate steady, recurring revenue and provide a built-in audience of families. This guide covers how to approach schools, pitch effectively, and set up successful partnerships.</p>

<h3>Identifying Target Schools</h3>
<p>Focus your outreach on schools that are most likely to convert:</p>
<ul>
  <li><strong>Private and independent schools</strong> - Often have budget for enrichment and value differentiation</li>
  <li><strong>Charter schools</strong> - Frequently looking for STEM-adjacent programs</li>
  <li><strong>Preschools and daycares</strong> - Our curriculum starts at age 3, making these ideal partners</li>
  <li><strong>After-school program providers</strong> - Always seeking quality programming to fill afternoon slots</li>
  <li><strong>Public school enrichment programs</strong> - Some districts have budget for vendor-led enrichment</li>
</ul>

<h3>Making First Contact</h3>
<p>Your first contact should be brief, professional, and focused on the value to the school. Recommended approach:</p>
<ol>
  <li><strong>Email first</strong> - Send a concise introduction email to the principal, enrichment coordinator, or after-school director. Include a one-page overview of Acme Franchise and mention that you offer free demo classes.</li>
  <li><strong>Follow up by phone</strong> - Call 3-5 business days after your email. Reference the email and ask if they would be interested in a complimentary demo class.</li>
  <li><strong>In-person visit</strong> - If you are in the area, stop by the front office with a flyer and ask to leave it for the decision maker. Keep it brief and friendly.</li>
</ol>

<h3>The Demo Class</h3>
<p>The demo class is your most powerful sales tool. When a school agrees to a demo:</p>
<ul>
  <li>Confirm logistics at least 3 days in advance (date, time, age group, number of students, room)</li>
  <li>Arrive 20 minutes early to set up</li>
  <li>Deliver a high-energy, curriculum-faithful lesson</li>
  <li>Have enrollment information ready to hand to the school contact and parents</li>
  <li>Follow up within 48 hours to discuss next steps</li>
</ul>

<h3>Partnership Agreement Terms</h3>
<p>Once a school wants to move forward, work with them to agree on:</p>
<ul>
  <li><strong>Schedule:</strong> Day of the week, class time, and duration (typically 45-60 minutes)</li>
  <li><strong>Pricing Model:</strong> Per-student tuition (parents pay you) or flat fee (school pays you)</li>
  <li><strong>Minimum Enrollment:</strong> Set a minimum student count to make the class viable (typically 6-8 students)</li>
  <li><strong>Semester Commitment:</strong> Aim for semester-long agreements with renewal options</li>
  <li><strong>Venue Requirements:</strong> Table/chair setup, storage space for materials, projector access if available</li>
</ul>
<p>Use the partnership agreement template available in the portal Documents section. All agreements should be reviewed before signing.</p>`,
  },
  {
    slug: "community-events",
    title: "Community Events",
    excerpt:
      "How to run successful demo events, chess tournaments, and library programs.",
    sortOrder: 2,
    requiresAcknowledgment: false,
    sectionSlug: "marketing-sales",
    content: `<h2>Community Events</h2>
<p>Community events are one of the most effective ways to introduce Acme Franchise to new families and generate enrollment leads. Whether you are running a demo at a library, hosting a chess tournament, or setting up a booth at a local fair, these events put your brand in front of your target audience in a fun, memorable way.</p>

<h3>Types of Events</h3>
<p>Successful franchisees typically run a mix of the following event types:</p>
<ul>
  <li><strong>Library Acme Franchise sessions</strong> - Partner with your local library to host a free Acme Franchise class during their regular programming. Libraries are excellent partners because they actively seek children's programs and have built-in audiences.</li>
  <li><strong>Chess tournaments for kids</strong> - Host beginner-friendly tournaments at community centers, schools, or parks. Keep the format simple (round-robin, short time controls) and emphasize fun over competition.</li>
  <li><strong>Pop-up demo events</strong> - Set up a table at farmers markets, school fairs, community festivals, or family-friendly businesses. Bring demo chess sets and Acme Franchise storybooks for children to try.</li>
  <li><strong>Birthday party packages</strong> - Offer chess-themed birthday party packages. These introduce Acme Franchise to entire friend groups and often convert to class enrollments.</li>
</ul>

<h3>Planning Your Event</h3>
<p>For every community event, plan at least 2-3 weeks in advance:</p>
<ol>
  <li><strong>Secure the venue and date.</strong> Confirm availability, setup/teardown times, and any fees.</li>
  <li><strong>Promote the event.</strong> Post on social media, send to your email list, create a flyer for the venue to display, and post on community calendars.</li>
  <li><strong>Prepare materials.</strong> Pack chess sets, storybooks, character cards, enrollment flyers, sign-up sheets, branded tablecloth, and giveaways.</li>
  <li><strong>Plan the format.</strong> For a demo event, prepare a 20-30 minute mini-lesson. For a tournament, plan brackets, prizes, and volunteer helpers.</li>
  <li><strong>Collect leads.</strong> Prepare a sign-up sheet (physical or digital) to capture parent names, email addresses, and phone numbers.</li>
</ol>

<h3>During the Event</h3>
<p>Be high-energy, approachable, and ready to talk to every family. Wear your Acme Franchise branded shirt. Engage children first (let them try the chess sets) and parents second (explain the program, hand out flyers). Take photos and videos with permission for social media content.</p>

<h3>After the Event</h3>
<p>Follow up with all leads within 48 hours. Send an email thanking them for attending, include a link to learn more or enroll, and offer a special promotion for event attendees if appropriate. Post event photos on social media and tag the venue to build the partnership relationship.</p>`,
  },

  // ========================================
  // SECTION 4: Brand Standards
  // ========================================
  {
    slug: "logo-visual-identity",
    title: "Logo & Visual Identity",
    excerpt:
      "Logo usage rules, color palette, typography, and approved templates for consistent branding.",
    sortOrder: 0,
    requiresAcknowledgment: true,
    sectionSlug: "brand-standards",
    content: `<h2>Logo & Visual Identity Guidelines</h2>
<p>Consistent visual branding across all franchisees is essential to building trust and recognition for Acme Franchise. These guidelines ensure that every piece of material a parent or school sees reinforces our professional, fun, and educational brand identity.</p>

<h3>Logo Usage</h3>
<p>The Acme Franchise logo is our most important brand asset. Follow these rules at all times:</p>
<ul>
  <li><strong>Use only approved logo files.</strong> Download logos from the portal Documents section. Never recreate, redraw, or modify the logo.</li>
  <li><strong>Maintain clear space.</strong> Keep a minimum clear space around the logo equal to the height of the "S" in "Story." No text, images, or other elements should encroach on this space.</li>
  <li><strong>Minimum size.</strong> The logo should never appear smaller than 1 inch wide in print or 100 pixels wide on screen.</li>
  <li><strong>Do not alter colors.</strong> Use the logo in its original colors on light backgrounds, or the white version on dark backgrounds. Never apply color filters, gradients, or effects.</li>
  <li><strong>Do not rotate, stretch, or distort</strong> the logo in any way.</li>
</ul>

<h3>Brand Color Palette</h3>
<p>Our brand colors reflect the playful, trustworthy nature of Acme Franchise. Use these colors consistently in all materials:</p>
<ul>
  <li><strong>Navy (#2D2F8E)</strong> - Primary brand color. Use for headers, buttons, and prominent elements.</li>
  <li><strong>Purple (#6A469D)</strong> - Accent color. Use for gradients, secondary elements, and highlights.</li>
  <li><strong>Cyan (#50C8DF)</strong> - Supporting color. Use for links, callouts, and interactive elements.</li>
  <li><strong>Green (#34B256)</strong> - Success and positive messaging.</li>
  <li><strong>Yellow (#FACC29)</strong> - Attention and emphasis. Use sparingly.</li>
  <li><strong>Orange (#F79A30)</strong> - Energy and calls to action.</li>
</ul>

<h3>Typography</h3>
<p>For print materials, use the following fonts:</p>
<ul>
  <li><strong>Headlines:</strong> Poppins Bold or Semi-Bold</li>
  <li><strong>Body text:</strong> Poppins Regular or Light</li>
  <li><strong>Fallback fonts:</strong> If Poppins is not available, use Arial or Helvetica</li>
</ul>

<h3>Approved Templates</h3>
<p>To maintain brand consistency, use the approved templates available in the portal for:</p>
<ul>
  <li>Class flyers and posters</li>
  <li>Email newsletters</li>
  <li>Social media post templates</li>
  <li>Business cards</li>
  <li>Parent welcome packets</li>
  <li>School partnership proposals</li>
</ul>
<p>If you need a custom design that is not covered by existing templates, submit a request to the marketing team for review before production.</p>`,
  },
  {
    slug: "communication-guidelines",
    title: "Communication Guidelines",
    excerpt:
      "Tone of voice, email standards, and social media guidelines for professional franchise communication.",
    sortOrder: 1,
    requiresAcknowledgment: true,
    sectionSlug: "brand-standards",
    content: `<h2>Communication Guidelines</h2>
<p>Every interaction you have with parents, schools, and community members reflects on the Acme Franchise brand. Consistent, professional, and warm communication builds trust and differentiates us from generic chess programs. These guidelines apply to all written and verbal communications.</p>

<h3>Tone of Voice</h3>
<p>The Acme Franchise brand voice is:</p>
<ul>
  <li><strong>Warm and approachable.</strong> We are friendly educators, not corporate salespeople. Write and speak the way you would talk to a neighbor whose child you care about.</li>
  <li><strong>Enthusiastic but not pushy.</strong> Share excitement about chess and learning without aggressive sales language. Let the program speak for itself.</li>
  <li><strong>Professional and trustworthy.</strong> Parents are entrusting their children to us. Every communication should reinforce that we are organized, reliable, and safe.</li>
  <li><strong>Inclusive.</strong> Chess is for everyone. Avoid language that suggests chess is only for gifted children or that skill level matters more than the learning experience.</li>
</ul>

<h3>Email Communication Standards</h3>
<p>When sending emails to parents, schools, or partners:</p>
<ol>
  <li>Use your Acme Franchise email address or the portal email system. Never send franchise-related emails from personal accounts.</li>
  <li>Include the Acme Franchise logo in your email signature.</li>
  <li>Proofread every email before sending. Spelling and grammar errors undermine professionalism.</li>
  <li>Respond to all inquiries within 24 hours on business days. If you cannot provide a full answer, send an acknowledgment and timeline.</li>
  <li>Keep emails concise. Parents are busy. Get to the point within the first two sentences.</li>
</ol>

<h3>Social Media Guidelines</h3>
<p>Social media is a powerful tool for local marketing. Follow these guidelines:</p>
<ul>
  <li><strong>Always get photo permission</strong> before posting images of children. Use the photo consent form provided in the portal.</li>
  <li><strong>Post positive, educational content.</strong> Share chess tips, class highlights, student achievements, and enrollment opportunities.</li>
  <li><strong>Do not engage in negative interactions.</strong> If you receive a negative comment or review, respond professionally and offer to resolve the issue offline. Never argue publicly.</li>
  <li><strong>Do not post political, religious, or controversial content</strong> on your franchise social media accounts.</li>
  <li><strong>Tag @AcmeFranchise</strong> in posts when appropriate so the corporate team can amplify your content.</li>
</ul>

<h3>Parent Communication Best Practices</h3>
<p>Regular parent communication is one of the strongest drivers of retention. At minimum, send:</p>
<ul>
  <li>A class recap after each session with what was learned and a practice tip</li>
  <li>A monthly newsletter with upcoming schedule, events, and enrollment updates</li>
  <li>Timely responses to any parent questions or concerns</li>
</ul>`,
  },
  {
    slug: "dress-code-appearance",
    title: "Dress Code & Appearance",
    excerpt:
      "Professional appearance standards for classes, events, and school visits.",
    sortOrder: 2,
    requiresAcknowledgment: false,
    sectionSlug: "brand-standards",
    content: `<h2>Dress Code & Professional Appearance</h2>
<p>Your appearance is part of the Acme Franchise brand experience. When you walk into a school, community center, or event, you are representing not just yourself but the entire franchise network. A polished, consistent appearance builds trust with parents and venue partners.</p>

<h3>Class & Event Attire</h3>
<p>For all classes and events, the following dress code applies to you and any tutors you employ:</p>
<ul>
  <li><strong>Acme Franchise branded polo or t-shirt</strong> - Wear the official branded shirt at every class and event. Order additional shirts through the portal if needed.</li>
  <li><strong>Clean, neat pants or shorts</strong> - Dark jeans, khakis, or clean athletic pants are appropriate. Avoid ripped, stained, or excessively casual clothing.</li>
  <li><strong>Closed-toe shoes</strong> - Required for safety when working with children. Clean sneakers or casual shoes are fine.</li>
  <li><strong>Name badge</strong> - Wear your Acme Franchise name badge at all times during classes and events.</li>
</ul>

<h3>What to Avoid</h3>
<ul>
  <li>Clothing with other brand logos, offensive graphics, or political messaging</li>
  <li>Flip-flops or open-toe sandals</li>
  <li>Excessively casual attire (pajama pants, tank tops, etc.)</li>
  <li>Strong perfume or cologne (some children have sensitivities)</li>
</ul>

<h3>School Visits & Meetings</h3>
<p>When visiting schools for meetings with administrators or partnership discussions, dress one step above your class attire. A Acme Franchise polo with clean khakis or slacks is appropriate. You do not need to wear a suit, but you should look like a professional who is serious about education and business.</p>

<h3>Tutor Appearance Standards</h3>
<p>All tutors you hire must follow the same dress code. Provide each tutor with at least one branded shirt upon hiring. Include the dress code expectations in your tutor onboarding materials and reinforce standards during performance reviews. Tutors who consistently fail to meet appearance standards should be coached and, if necessary, replaced.</p>

<h3>Personal Hygiene</h3>
<p>This should go without saying, but maintaining good personal hygiene is essential when working closely with children and families. Ensure clean clothing, groomed appearance, and fresh breath before every class.</p>`,
  },

  // ========================================
  // SECTION 5: Policies & Compliance
  // ========================================
  {
    slug: "safety-policy",
    title: "Safety Policy",
    excerpt:
      "Child safety protocols, background check requirements, and emergency procedures.",
    sortOrder: 0,
    requiresAcknowledgment: true,
    sectionSlug: "policies-compliance",
    content: `<h2>Child Safety Policy</h2>
<p>The safety of every child in our program is our highest priority. This policy outlines the protocols, requirements, and procedures that every Acme Franchise franchisee and tutor must follow without exception. Failure to comply with this policy may result in immediate termination of your franchise agreement.</p>

<h3>Background Check Requirements</h3>
<p>Every individual who has direct contact with children through your franchise must pass a comprehensive background check before their first class:</p>
<ul>
  <li><strong>Franchisees:</strong> Must complete a background check during the onboarding process before receiving access to class materials.</li>
  <li><strong>Tutors:</strong> Must complete a background check before their first day of work. Do not allow any tutor to teach or observe a class until their background check has cleared.</li>
  <li><strong>Volunteers:</strong> Any volunteer who assists with classes must also pass a background check if they will have unsupervised access to children.</li>
</ul>
<p>Use the approved background check provider listed in the portal. Background checks must be renewed every two years.</p>

<h3>Supervision Standards</h3>
<p>Children in our program must be supervised at all times:</p>
<ul>
  <li>Maintain a maximum ratio of 1 adult to 12 children during classes</li>
  <li>Never leave children unattended in a room, even briefly</li>
  <li>Bathroom breaks for young children should follow the venue's established protocol (typically a teacher or parent escorts the child)</li>
  <li>At pickup time, release children only to authorized adults. If you do not recognize the person picking up a child, verify with the parent before releasing the child.</li>
</ul>

<h3>Physical Contact Policy</h3>
<p>Appropriate physical contact is limited to:</p>
<ul>
  <li>High-fives and fist bumps for encouragement</li>
  <li>Brief, side-by-side contact (e.g., sitting next to a child to help them with a chess position)</li>
  <li>Guiding a child's hand to move a chess piece when requested or with clear verbal consent</li>
</ul>
<p>Avoid picking up children, lap-sitting, or extended one-on-one interactions in isolated spaces.</p>

<h3>Emergency Procedures</h3>
<ol>
  <li><strong>Medical Emergency:</strong> Call 911 immediately. Administer basic first aid if trained. Notify the venue staff. Contact the child's parent/guardian. Report the incident to the franchise team within 1 hour.</li>
  <li><strong>Building Emergency (fire, lockdown):</strong> Follow the venue's emergency procedures. Account for all children in your class. Do not leave the building until cleared by emergency personnel.</li>
  <li><strong>Allergic Reaction:</strong> If a child shows signs of an allergic reaction, call 911 immediately. Ask the child or check enrollment records for known allergies and EpiPen information.</li>
  <li><strong>Missing Child:</strong> Immediately notify venue staff and call 911. Do not leave the remaining children unsupervised. Contact the parent/guardian immediately.</li>
</ol>

<h3>First Aid</h3>
<p>Keep a basic first aid kit at every class location. The kit should include adhesive bandages, antiseptic wipes, disposable gloves, and an ice pack. Familiarize yourself with the location of the venue's first aid supplies and AED (if available).</p>`,
  },
  {
    slug: "incident-reporting",
    title: "Incident Reporting",
    excerpt:
      "How to report incidents, documentation requirements, and escalation procedures.",
    sortOrder: 1,
    requiresAcknowledgment: true,
    sectionSlug: "policies-compliance",
    content: `<h2>Incident Reporting Procedures</h2>
<p>Accurate and timely incident reporting protects children, protects you, and protects the franchise brand. Every franchisee and tutor must understand and follow these procedures. When in doubt, report it. It is always better to document an incident that turns out to be minor than to fail to document one that escalates.</p>

<h3>What Constitutes a Reportable Incident</h3>
<p>The following situations must be reported using the formal incident reporting process:</p>
<ul>
  <li><strong>Injury to a child</strong> during a Acme Franchise class or event, no matter how minor</li>
  <li><strong>Medical emergency</strong> of any kind (allergic reaction, seizure, fainting, etc.)</li>
  <li><strong>Behavioral incident</strong> involving physical aggression between students</li>
  <li><strong>Property damage</strong> at a venue caused by a student, tutor, or franchisee</li>
  <li><strong>Complaint from a parent</strong> regarding safety, conduct, or quality of instruction</li>
  <li><strong>Suspected child abuse or neglect</strong> observed or disclosed during class</li>
  <li><strong>Unauthorized pickup attempt</strong> by someone not on the approved pickup list</li>
  <li><strong>Near-miss events</strong> that could have resulted in injury or harm</li>
</ul>

<h3>Reporting Timeline</h3>
<p>Incident reports must be submitted according to the following timeline:</p>
<ol>
  <li><strong>Immediate (within 1 hour):</strong> Call or text the franchise team for any injury requiring medical attention, any medical emergency, or any suspected abuse situation.</li>
  <li><strong>Same day (within 4 hours):</strong> Submit a written incident report via the portal for all reportable incidents.</li>
  <li><strong>Follow-up (within 48 hours):</strong> Provide any additional details, photos, or documentation requested by the franchise team.</li>
</ol>

<h3>How to Document an Incident</h3>
<p>When completing an incident report, include the following information:</p>
<ul>
  <li><strong>Date, time, and location</strong> of the incident</li>
  <li><strong>Names of all individuals involved</strong> (students, tutors, parents, venue staff)</li>
  <li><strong>Names of witnesses</strong></li>
  <li><strong>Factual description of what happened.</strong> Stick to facts, not opinions. Write what you saw and heard, not what you think happened.</li>
  <li><strong>Actions taken</strong> (first aid administered, 911 called, parent notified, etc.)</li>
  <li><strong>Photos</strong> if applicable (injury, property damage, scene)</li>
  <li><strong>Follow-up plan</strong> (what will you do next to prevent recurrence)</li>
</ul>

<h3>Escalation Procedures</h3>
<p>The franchise team will review every incident report and determine if additional action is needed. Escalation levels:</p>
<ul>
  <li><strong>Level 1 (Minor):</strong> Documented and filed. No further action unless pattern emerges.</li>
  <li><strong>Level 2 (Moderate):</strong> Requires follow-up call with franchisee. May require parent meeting or venue notification.</li>
  <li><strong>Level 3 (Serious):</strong> Requires immediate investigation. May involve insurance notification, legal review, or temporary suspension of classes at the affected venue.</li>
</ul>

<h3>Mandatory Reporting</h3>
<p>As individuals who work with children, franchisees and tutors may be mandatory reporters under state law. If you observe or a child discloses signs of abuse or neglect, you are legally required to report it to your state's child protective services agency. Contact information for your state's reporting hotline is available in the portal. Report first, then notify the franchise team.</p>`,
  },
  {
    slug: "data-privacy-confidentiality",
    title: "Data Privacy & Confidentiality",
    excerpt:
      "Student data handling, FERPA compliance, and confidentiality obligations.",
    sortOrder: 2,
    requiresAcknowledgment: true,
    sectionSlug: "policies-compliance",
    content: `<h2>Data Privacy & Confidentiality Policy</h2>
<p>As a Acme Franchise franchisee, you handle sensitive personal information about children and families. Protecting this data is both a legal requirement and a core franchise obligation. This policy outlines your responsibilities for data handling, privacy compliance, and confidentiality.</p>

<h3>Types of Data You Handle</h3>
<p>In the course of operating your franchise, you will collect and store:</p>
<ul>
  <li><strong>Student information:</strong> Names, ages, grade levels, school names, allergy and medical information</li>
  <li><strong>Parent/guardian information:</strong> Names, email addresses, phone numbers, home addresses, payment information</li>
  <li><strong>Attendance records:</strong> Dates, times, and locations of class participation</li>
  <li><strong>Photos and videos:</strong> Taken during classes and events (with consent)</li>
  <li><strong>Financial records:</strong> Enrollment payments, invoices, and billing history</li>
</ul>

<h3>FERPA Compliance</h3>
<p>When operating within school settings, you may be subject to the Family Educational Rights and Privacy Act (FERPA). Key requirements include:</p>
<ul>
  <li>Student education records provided by a school must be treated as confidential</li>
  <li>Do not share student information obtained through a school partnership with anyone outside the franchise without written parental consent</li>
  <li>If a school provides you with student lists, attendance data, or academic information, treat that data with the same protections the school would</li>
  <li>Return or destroy school-provided data at the end of each partnership term unless the school agrees otherwise in writing</li>
</ul>

<h3>Data Security Requirements</h3>
<p>Protect personal data using these minimum security practices:</p>
<ol>
  <li><strong>Digital Data:</strong> Store student and parent information in the franchise portal or in a password-protected system. Do not store personal data in unsecured spreadsheets, personal email, or unencrypted files.</li>
  <li><strong>Physical Data:</strong> If you use paper attendance sheets or enrollment forms, store them in a locked cabinet or bag. Never leave physical records unattended at a venue.</li>
  <li><strong>Passwords:</strong> Use strong, unique passwords for all franchise-related accounts. Enable two-factor authentication where available.</li>
  <li><strong>Device Security:</strong> If you access franchise data on a personal laptop, phone, or tablet, ensure the device is password-protected and has up-to-date security software.</li>
  <li><strong>Data Sharing:</strong> Never share student or family data with third parties (other businesses, marketing partners, etc.) without explicit written consent from the parent/guardian.</li>
</ol>

<h3>Photo & Video Consent</h3>
<p>Before photographing or recording any child:</p>
<ul>
  <li>Collect a signed photo/video consent form from the parent or guardian. Use the form available in the portal.</li>
  <li>Maintain a record of which families have and have not given consent</li>
  <li>If a parent has not given consent, ensure their child is not included in any photos or videos</li>
  <li>When posting photos on social media, never include a child's full name unless the parent has specifically approved it</li>
</ul>

<h3>Confidentiality Obligations</h3>
<p>As a franchisee, you also have confidentiality obligations regarding Acme Franchise business information:</p>
<ul>
  <li>Do not share franchise financial data, royalty rates, or operational metrics with anyone outside the franchise system</li>
  <li>Proprietary curriculum content, training materials, and business processes are confidential and may not be shared with competitors or used outside the franchise</li>
  <li>Discussions in franchisee meetings, calls, or forums are confidential unless explicitly stated otherwise</li>
</ul>

<h3>Data Breach Response</h3>
<p>If you suspect a data breach (unauthorized access to student/parent data, lost device with franchise data, compromised account), take these steps immediately:</p>
<ol>
  <li>Secure the affected account or device (change passwords, lock device remotely)</li>
  <li>Notify the franchise team within 4 hours</li>
  <li>Document what data may have been exposed and how many families are affected</li>
  <li>Do not communicate with affected families until you have coordinated with the franchise team on the notification plan</li>
</ol>`,
  },
];

// ============================================
// SEED FUNCTIONS
// ============================================

async function seedSections() {
  console.log("Seeding manual sections...");
  for (const section of sections) {
    await prisma.manualSection.upsert({
      where: { slug: section.slug },
      update: {
        title: section.title,
        description: section.description,
        icon: section.icon,
        sortOrder: section.sortOrder,
      },
      create: section,
    });
    console.log(`  ${section.icon} ${section.title}`);
  }
}

async function seedPages() {
  console.log("Seeding manual pages...");
  for (const page of pages) {
    const section = await prisma.manualSection.findUnique({
      where: { slug: page.sectionSlug },
    });
    if (!section) {
      console.error(`  Section not found: ${page.sectionSlug}`);
      continue;
    }

    const { sectionSlug, ...pageData } = page;
    const now = new Date();

    const upsertedPage = await prisma.manualPage.upsert({
      where: { slug: page.slug },
      update: {
        title: pageData.title,
        content: pageData.content,
        excerpt: pageData.excerpt,
        sortOrder: pageData.sortOrder,
        requiresAcknowledgment: pageData.requiresAcknowledgment,
        status: "PUBLISHED",
        publishedAt: now,
        publishedBy: "system",
        currentVersion: 1,
        sectionId: section.id,
      },
      create: {
        slug: pageData.slug,
        title: pageData.title,
        content: pageData.content,
        excerpt: pageData.excerpt,
        sortOrder: pageData.sortOrder,
        requiresAcknowledgment: pageData.requiresAcknowledgment,
        status: "PUBLISHED",
        publishedAt: now,
        publishedBy: "system",
        currentVersion: 1,
        sectionId: section.id,
      },
    });

    // Upsert version 1 for this page
    await prisma.manualPageVersion.upsert({
      where: {
        pageId_versionNumber: {
          pageId: upsertedPage.id,
          versionNumber: 1,
        },
      },
      update: {
        content: pageData.content,
        changeType: "MAJOR",
        changeSummary: "Initial version",
        createdBy: "system",
      },
      create: {
        pageId: upsertedPage.id,
        versionNumber: 1,
        content: pageData.content,
        changeType: "MAJOR",
        changeSummary: "Initial version",
        createdBy: "system",
      },
    });

    const ackLabel = pageData.requiresAcknowledgment ? " [ACK REQUIRED]" : "";
    console.log(`  - ${pageData.title}${ackLabel}`);
  }
}

async function main() {
  console.log("Seeding Operations Manual...\n");

  await seedSections();
  console.log("");

  await seedPages();
  console.log("");

  // Print summary
  const sectionCount = await prisma.manualSection.count();
  const pageCount = await prisma.manualPage.count();
  const versionCount = await prisma.manualPageVersion.count();
  const ackRequiredCount = await prisma.manualPage.count({
    where: { requiresAcknowledgment: true },
  });

  console.log("Operations Manual seeded successfully!");
  console.log(`   ${sectionCount} sections`);
  console.log(`   ${pageCount} pages (${ackRequiredCount} require acknowledgment)`);
  console.log(`   ${versionCount} page versions`);
}

main()
  .catch((e) => {
    console.error("Error seeding operations manual:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
