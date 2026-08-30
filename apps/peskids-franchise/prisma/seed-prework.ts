import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const preWorkModules = [
  {
    id: "territory",
    slug: "territory",
    title: "Territory Builder",
    description: "Define your target territory with specific schools and research methodology.",
    instructions: `<h3>Define Your Territory Like You'll Work It</h3>
<p>This isn't about drawing lines on a map—it's about identifying YOUR territory with the specificity of someone who will drive it every day.</p>

<h4>What we need from you:</h4>
<ul>
  <li><strong>Primary metro area</strong> - Where will you be based?</li>
  <li><strong>Top 3-5 zip codes</strong> - With justification for each</li>
  <li><strong>Drive time analysis</strong> - Max commute, efficiency strategy</li>
  <li><strong>School identification</strong> - List 15+ schools BY NAME:
    <ul>
      <li>At least 5 preschools/daycares</li>
      <li>At least 5 elementary schools</li>
      <li>At least 5 private/charter schools</li>
    </ul>
  </li>
  <li><strong>Personal connection</strong> - Why YOU for THIS territory?</li>
  <li><strong>Research methodology</strong> - How did you find these schools? Time spent?</li>
</ul>

<h4>Format Requirements (Instruction-Following Test):</h4>
<p>List your 15+ schools in this EXACT format:</p>
<pre>
PRESCHOOLS/DAYCARES:
1. [School Name] | [Address] | [Est. Enrollment]
2. [School Name] | [Address] | [Est. Enrollment]
...

ELEMENTARY SCHOOLS:
1. [School Name] | [Address] | [Est. Enrollment]
...

PRIVATE/CHARTER:
1. [School Name] | [Address] | [Est. Enrollment]
...
</pre>

<h4>What we're evaluating:</h4>
<ul>
  <li>Specificity over vague answers</li>
  <li>Ability to follow format instructions</li>
  <li>Research depth and methodology</li>
  <li>Understanding of YOUR market</li>
</ul>`,
    sequence: 1,
    isRequired: true,
    submissionType: "FORM",
  },
  {
    id: "research",
    slug: "research",
    title: "Market Research",
    description: "Deep analysis of your market: demographics, competitors, demand evidence, and honest challenges.",
    instructions: `<h3>Know Your Market Cold</h3>
<p>This module tests whether you can research like a business owner. Vague answers fail. Specific data wins.</p>

<h4>What we need:</h4>

<h5>1. Top 10 Schools (Detailed)</h5>
<p>Your best 10 opportunities with structured data:</p>
<pre>
School Name | Type | Est. Students | Contact Name & Title (if found)
</pre>

<h5>2. Demographics (With Sources)</h5>
<ul>
  <li>Median household income - exact number with source</li>
  <li>Percentage of families with children under 12 - with source</li>
</ul>

<h5>3. Competition Analysis</h5>
<ul>
  <li><strong>Direct competitors</strong> - Any chess programs, clubs, instruction in area</li>
  <li><strong>Enrichment competitors</strong> - STEM, coding, music (shows demand exists)</li>
  <li><strong>Competitor pricing</strong> - What do they charge? How did you find this?</li>
</ul>

<h5>4. Demand Evidence</h5>
<p>Show us proof that parents WANT chess enrichment:</p>
<ul>
  <li>Facebook groups discussing chess or enrichment</li>
  <li>Reviews mentioning desire for chess programs</li>
  <li>School newsletters advertising similar programs</li>
  <li>Any other evidence you can find</li>
</ul>

<h5>5. Honest Assessment</h5>
<ul>
  <li>What concerns you about this market? Be honest—we appreciate realism over optimism.</li>
  <li>What makes this market ripe for Acme Franchise despite those concerns?</li>
</ul>

<h4>What we're looking for:</h4>
<ul>
  <li>Data-driven analysis, not guesses</li>
  <li>Sources cited for claims</li>
  <li>Intellectual honesty about challenges</li>
  <li>Understanding of competitive landscape</li>
</ul>`,
    sequence: 2,
    isRequired: true,
    submissionType: "FORM",
  },
  {
    id: "outreach",
    slug: "outreach",
    title: "School Outreach Tracker",
    description: "Contact at least 10 schools, have 5 live conversations, reach 2 decision-makers. This is the critical module.",
    instructions: `<h3>Time to Pick Up the Phone</h3>
<p><strong>This is the most important module.</strong> We want to see you actually do the work that franchisees do every day. This gives you a real taste of the job and shows us your ability to hustle.</p>

<h4>Requirements (Non-Negotiable):</h4>
<ul>
  <li><strong>Contact at least 10 schools</strong> - Calls, visits, emails, LinkedIn</li>
  <li><strong>Have at least 5 live conversations</strong> - Not voicemails, actual talks</li>
  <li><strong>Reach at least 2 decision-makers</strong> - Director, Principal, or Owner</li>
</ul>

<h4>Log Each Contact (Structured Format):</h4>
<p>For EACH school contact, provide:</p>
<ul>
  <li>School name</li>
  <li>Contact name (if reached)</li>
  <li>Contact title</li>
  <li>Phone number and/or email</li>
  <li>Date of contact</li>
  <li>Method: call, visit, email, or LinkedIn</li>
  <li>Outcome: conversation, voicemail, no answer, email sent</li>
  <li>Notes: What did you discuss? What was their response?</li>
  <li>Follow-up date (if applicable)</li>
</ul>

<h4>Additional Analysis Required:</h4>
<ul>
  <li><strong>Best call times</strong> - What times worked? When do decision-makers answer?</li>
  <li><strong>Gatekeeper tactics</strong> - How did you get past the front desk? What worked?</li>
  <li><strong>Decision-maker access</strong> - What titles did you actually reach?</li>
  <li><strong>Meetings scheduled</strong> - Did you schedule any demos or meetings?</li>
  <li><strong>Most persistent attempt</strong> - Describe your most persistent outreach (multiple follow-ups to same school)</li>
  <li><strong>Creative approaches</strong> - Did you try walk-ins? Events? LinkedIn? What else?</li>
</ul>

<h4>Your Call Script (REQUIRED):</h4>
<p>Paste your actual script. We want to see how you introduce Acme Franchise and handle the conversation.</p>

<h4>Script Evolution:</h4>
<p>How did your script change after real calls? What did you learn and adjust?</p>

<h4>What we're evaluating:</h4>
<ul>
  <li>Volume and persistence</li>
  <li>Quality of conversations</li>
  <li>Ability to reach decision-makers</li>
  <li>Learning and adaptation</li>
  <li>Comfort with rejection</li>
</ul>

<p><em>Note: The goal isn't to close deals—it's to demonstrate you can do this work every day.</em></p>`,
    sequence: 3,
    isRequired: true,
    submissionType: "FORM",
  },
  {
    id: "reflection",
    slug: "reflection",
    title: "Reflection & Video",
    description: "Analyze your outreach experience with specific examples. Video submission is REQUIRED.",
    instructions: `<h3>What Did You Actually Learn?</h3>
<p>After completing your outreach, we want honest reflection—not generic positivity. Be specific.</p>

<h4>Questions to Answer:</h4>

<h5>1. Top 3 Objections (Exact Quotes)</h5>
<p>What specific pushback did you hear? Use their words if possible.</p>

<h5>2. Your Objection Responses</h5>
<p>How would you respond to each objection now?</p>

<h5>3. Best Conversation</h5>
<p>Describe your best conversation in detail. What made it work? What did you say that resonated?</p>

<h5>4. Worst Conversation</h5>
<p>What went poorly? What would you do differently?</p>

<h5>5. Hardest Part</h5>
<p>What was genuinely difficult about this process?</p>

<h5>6. Skill Gaps</h5>
<p>What skills do you need to develop?</p>

<h5>7. Coaching Needs</h5>
<p>What support would help you succeed as a franchisee?</p>

<h5>8. Honest Self-Assessment</h5>
<ul>
  <li>Knowing what you know now, would you do this work every day?</li>
  <li>Rate yourself 1-10 on your outreach performance</li>
  <li>Why that number?</li>
</ul>

<h4>VIDEO SUBMISSION (REQUIRED - Not Optional)</h4>
<p>Record a 2-5 minute Loom video covering:</p>
<ol>
  <li><strong>Introduce yourself</strong> (30 seconds) - Who are you? Why Acme Franchise?</li>
  <li><strong>Best conversation</strong> (1 minute) - Recreate your best call. What did you say? How did they respond?</li>
  <li><strong>Difficult moment</strong> (1 minute) - Describe a hard moment and what you learned</li>
  <li><strong>Why Acme Franchise</strong> (1 minute) - Why this specific franchise?</li>
  <li><strong>Commitment level</strong> (30 seconds) - Your availability and commitment to making this work</li>
</ol>

<p><em>This video is how we get to know you. Take it seriously.</em></p>`,
    sequence: 4,
    isRequired: true,
    submissionType: "FORM",
  },
  {
    id: "plan",
    slug: "plan",
    title: "90-Day Launch Plan",
    description: "Create a specific, measurable 90-day plan with weekly targets and honest risk assessment.",
    instructions: `<h3>Plan Like You're Starting Monday</h3>
<p>This isn't a hypothetical exercise. Write this plan as if you're launching your franchise on the first of next month.</p>

<h4>Week 1 (Day-by-Day Breakdown):</h4>
<ul>
  <li>Which 5 SPECIFIC schools will you visit in Week 1? (Names)</li>
  <li>Break down Week 1 day-by-day: What will you do Monday? Tuesday? etc.</li>
</ul>

<h4>Day 30 Targets:</h4>
<ul>
  <li>Number of schools contacted: ___</li>
  <li>Number of demos/meetings scheduled: ___</li>
  <li>Revenue target: $___  (How did you calculate this?)</li>
</ul>

<h4>Day 60 Targets:</h4>
<ul>
  <li>Number of active schools: ___</li>
  <li>Number of weekly classes running: ___</li>
  <li>What challenges do you anticipate at this stage?</li>
</ul>

<h4>Day 90 Targets:</h4>
<ul>
  <li>Monthly revenue target: $___</li>
  <li>Total active schools: ___</li>
  <li>Will you need tutors? How many?</li>
</ul>

<h4>Community Presence:</h4>
<ul>
  <li>List 3 SPECIFIC events you'll attend or host (names, dates if possible)</li>
  <li>Name specific businesses or organizations you'll partner with</li>
  <li>Marketing budget: How much? How will you spend it?</li>
</ul>

<h4>Risk Assessment:</h4>
<ul>
  <li>What's the biggest risk to your plan?</li>
  <li>What's your Plan B if primary strategy fails?</li>
</ul>

<h4>Time & Financial Commitment:</h4>
<ul>
  <li>Hours per week you'll dedicate: ___</li>
  <li>When do you plan to go full-time?</li>
</ul>

<h4>What we're looking for:</h4>
<ul>
  <li>Specificity—names, numbers, dates</li>
  <li>Realistic targets (not fantasy)</li>
  <li>Understanding of the franchise model</li>
  <li>Honest risk assessment</li>
  <li>Clear commitment level</li>
</ul>`,
    sequence: 5,
    isRequired: true,
    submissionType: "FORM",
  },
];

async function main() {
  console.log("Seeding pre-work modules (v2 - rigorous questions)...");

  for (const module of preWorkModules) {
    await prisma.preWorkModule.upsert({
      where: { slug: module.slug },
      update: {
        title: module.title,
        description: module.description,
        instructions: module.instructions,
        sequence: module.sequence,
        isRequired: module.isRequired,
        submissionType: module.submissionType as "FORM" | "FILE_UPLOAD" | "TEXT" | "CHECKLIST" | "VIDEO_LOOM",
      },
      create: {
        id: module.id,
        slug: module.slug,
        title: module.title,
        description: module.description,
        instructions: module.instructions,
        sequence: module.sequence,
        isRequired: module.isRequired,
        submissionType: module.submissionType as "FORM" | "FILE_UPLOAD" | "TEXT" | "CHECKLIST" | "VIDEO_LOOM",
      },
    });

    console.log(`Created/updated module: ${module.title}`);
  }

  console.log("\nPre-work modules seeding complete!");
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
