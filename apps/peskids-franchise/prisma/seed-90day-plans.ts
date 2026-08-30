import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Types ───────────────────────────────────────────────────────────────────

interface PhaseInput {
  slug: string;
  title: string;
  description: string;
  order: number;
  dayStart: number;
  dayEnd: number;
}

interface ModuleInput {
  slug: string;
  title: string;
  description: string;
  order: number;
  resourceUrl: string | null;
  targetDay: number;
  points: number;
  isMilestone: boolean;
  notifyFranchisor: boolean;
  owner: "FRANCHISEE" | "FRANCHISOR" | "COLLABORATIVE";
  verificationType: "CHECKBOX" | "FRANCHISOR_CONFIRMS";
  franchisorActionText: string | null;
}

// ─── Phase Definitions (shared structure, both tracks use same weeks) ────────

const PHASES: PhaseInput[] = [
  // FOUNDATION (Weeks 1-4)
  { slug: "w01-setting-up-business", title: "Week 1: Setting Up Business", description: "Finalize your business entity, banking, insurance, and payroll setup.", order: 1, dayStart: 1, dayEnd: 7 },
  { slug: "w02-onboarding", title: "Week 2: Onboarding", description: "Complete onboarding training and meet the STC team.", order: 2, dayStart: 8, dayEnd: 14 },
  { slug: "w03-systems", title: "Week 3: Systems", description: "Set up all operational systems: email, Tutor Cruncher, Canva, and Stripe.", order: 3, dayStart: 15, dayEnd: 21 },
  { slug: "w04-pre-marketing", title: "Week 4: Pre-Marketing", description: "Prepare marketing assets, finalize school target list, and print materials.", order: 4, dayStart: 22, dayEnd: 28 },
  // ACTIVATION (Weeks 5-8)
  { slug: "w05-social-media-marketing", title: "Week 5: Social Media / Marketing", description: "Launch social media presence and personal network marketing.", order: 5, dayStart: 29, dayEnd: 35 },
  { slug: "w06-market-outreach", title: "Week 6: Market Outreach", description: "Contact schools, hand out materials, and schedule demo days.", order: 6, dayStart: 36, dayEnd: 42 },
  { slug: "w07-demo-classes", title: "Week 7: Demo Classes", description: "Execute demo days, gather testimonials, and set up enrollment.", order: 7, dayStart: 43, dayEnd: 49 },
  { slug: "w08-selling-to-parents", title: "Week 8: Selling to Parents", description: "Follow up with schools, enroll parents, and target paid classes.", order: 8, dayStart: 50, dayEnd: 56 },
  // GROWTH (Weeks 9-12)
  { slug: "w09-tutor-hires", title: "Week 9: Tutor Hires", description: "Create Indeed account, post jobs, screen applicants, and hire.", order: 9, dayStart: 57, dayEnd: 63 },
  { slug: "w10-financial-review", title: "Week 10: Financial Review", description: "Set up financial tracking and review KPI dashboard.", order: 10, dayStart: 64, dayEnd: 70 },
  { slug: "w11-tutor-management", title: "Week 11: Tutor Management", description: "Establish tutor check-ins, culture events, and development programs.", order: 11, dayStart: 71, dayEnd: 77 },
  { slug: "w12-scale", title: "Week 12: Scale", description: "Take what you have learned and grow your franchise.", order: 12, dayStart: 78, dayEnd: 84 },
];

// ─── Owner-Tutor Modules ────────────────────────────────────────────────────

function ownerTutorModules(): { phaseSlug: string; modules: ModuleInput[] }[] {
  return [
    {
      phaseSlug: "w01-setting-up-business",
      modules: [
        { slug: "ot-1a-finalize-business-entity", title: "Finalize business entity", description: "Operating agreement, LLC Filing, EIN Filing", resourceUrl: "OPERATIONS MANUAL", order: 1, targetDay: 1, points: 15, isMilestone: true, notifyFranchisor: true, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-1b-open-bank-account", title: "Open Bank Account", description: "Need EIN and a bank to work with", resourceUrl: "OPERATIONS MANUAL", order: 2, targetDay: 2, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-1c-obtain-business-insurance", title: "Obtain Business Insurance", description: "Obtain insurance based on our suggested limits", resourceUrl: "OPERATIONS MANUAL", order: 3, targetDay: 3, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-1d-payroll", title: "Payroll", description: "Intro to third party vendor and set up time to talk", resourceUrl: "ADP INTRO", order: 4, targetDay: 4, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-1e-accounting", title: "Accounting", description: "Intro to third party vendor and set up — Sam can help with this", resourceUrl: "QUICKBOOKS", order: 5, targetDay: 5, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-1f-tour-territory", title: "Tour Territory", description: "Smappen Territory Data + Excel spreadsheet + any other resources", resourceUrl: "OBJECTIVE MAP", order: 6, targetDay: 6, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
      ],
    },
    {
      phaseSlug: "w02-onboarding",
      modules: [
        { slug: "ot-2a-onboarding-session", title: "Onboarding Session", description: "Complete the training in the Operations Manual — Story Time University", resourceUrl: "OPERATIONS MANUAL", order: 1, targetDay: 8, points: 10, isMilestone: false, notifyFranchisor: false, owner: "COLLABORATIVE", verificationType: "FRANCHISOR_CONFIRMS", franchisorActionText: "Conduct onboarding session with franchisee" },
        { slug: "ot-2b-meeting-key-members", title: "Meeting Key Members", description: "Set up meetings to meet everyone all at once, and find individual time for more", resourceUrl: "ONE SHEET ON KEY MEMBERS", order: 2, targetDay: 9, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-2c-mission-vision-values", title: "Mission Vision Values", description: "Obtain a copy, ask them to print it out and hang it somewhere", resourceUrl: "OPERATIONS MANUAL", order: 3, targetDay: 10, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-2d-review-starter-kit", title: "Review Contents of Starter Kit", description: "What do you have, what is it used for", resourceUrl: "ONE SHEET EXPLAINING WHAT IT IS", order: 4, targetDay: 11, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-2e-review-school-plan", title: "Review Targeted Plan of Schools", description: "Start breaking down schools into easy digestible targets to approach. See Persona information", resourceUrl: "SAMPLE OF SCHOOL PERSONAS", order: 5, targetDay: 12, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
      ],
    },
    {
      phaseSlug: "w03-systems",
      modules: [
        { slug: "ot-3a-complete-stc-modules", title: "Complete Story Time Modules", description: "Log on to Teach Story Time and review all of the modules", resourceUrl: "TST", order: 1, targetDay: 15, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-3b-read-white-paper", title: "Read White Paper and Alignments", description: "Review White Paper and Alignments to understand Standards", resourceUrl: "DRIVE", order: 2, targetDay: 16, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-3c-setup-email", title: "Setup Email — G Suite", description: "Obtain log in from Admin User", resourceUrl: "ONE SHEET", order: 3, targetDay: 17, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-3d-tutor-cruncher", title: "Tutor Cruncher", description: "Watch Tutor Cruncher Videos and review", resourceUrl: "TUTOR CRUNCHER DOCS AND VIDEOS", order: 4, targetDay: 18, points: 10, isMilestone: false, notifyFranchisor: false, owner: "COLLABORATIVE", verificationType: "FRANCHISOR_CONFIRMS", franchisorActionText: "Set up franchisee in Tutor Cruncher" },
        { slug: "ot-3e-canva", title: "Canva", description: "Create Canva Account, log in, and watch videos to review", resourceUrl: "ONE SHEET + VIDEOS", order: 5, targetDay: 19, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-3f-stripe", title: "Stripe", description: "Log on to Stripe and link Tutor Cruncher and Bank Accounts", resourceUrl: "ONE SHEET + VIDEOS (DOUG)", order: 6, targetDay: 20, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
      ],
    },
    {
      phaseSlug: "w04-pre-marketing",
      modules: [
        { slug: "ot-4a-meta-logins", title: "Meta Logins (Facebook + Instagram)", description: "Log in to pages and start posting the developed schedule", resourceUrl: "ONE SHEET + SOCIAL MEDIA POSTS", order: 1, targetDay: 22, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-4b-google-business-profile", title: "Google Business Profile", description: "Log in to Google Business and fill in personal information", resourceUrl: "ONE SHEET + DOUG", order: 2, targetDay: 23, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-4c-branded-marketing-assets", title: "Fill in Branded Marketing Assets", description: "Log in to Canva and start manipulating pertinent marketing docs", resourceUrl: "CANVA FOLDER", order: 3, targetDay: 24, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-4d-receive-welcome-kit", title: "Receive Welcome Kit", description: "Receive Welcome Kit and review items inside", resourceUrl: "ONE SHEET EXPLAINER", order: 4, targetDay: 25, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-4e-finalize-school-list", title: "Finalize School Target List", description: "Have a ranked list of schools you want to target and start marketing to", resourceUrl: "FRANCHISEE DEVELOPED EXCEL", order: 5, targetDay: 26, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-4f-draft-email-plan", title: "Draft Email Marketing Plan", description: "Start preparing emails with local information and personal info from schools", resourceUrl: "GOOGLE DRIVE — EMAIL PLAN", order: 6, targetDay: 27, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-4g-print-materials", title: "Print Marketing Materials", description: "Find local printer (Alphagraphics is a vendor partner) and print documents", resourceUrl: "CANVA FOLDER", order: 7, targetDay: 28, points: 15, isMilestone: true, notifyFranchisor: true, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
      ],
    },
    {
      phaseSlug: "w05-social-media-marketing",
      modules: [
        { slug: "ot-5a-launch-social-media", title: "Launch Facebook and Instagram Marketing", description: "Follow social plan posting at least 3 times a week", resourceUrl: "GOOGLE DRIVE", order: 1, targetDay: 29, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-5b-post-personal-socials", title: "Post on Personal Social Media Announcing Launch", description: "Post announcement on all personal social media", resourceUrl: "ONE SHEET", order: 2, targetDay: 30, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-5c-email-friends-family", title: "Email Family and Friends Asking for Introductions", description: "Email relevant friends and families asking for introductions to schools", resourceUrl: "ONE SHEET", order: 3, targetDay: 31, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
      ],
    },
    {
      phaseSlug: "w06-market-outreach",
      modules: [
        { slug: "ot-6a-reach-out-schools", title: "Reach Out to 50-75 Schools from Your List", description: "Follow in-person, email, and phone scripts to contact schools", resourceUrl: "ONE SHEET", order: 1, targetDay: 36, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-6b-hand-out-packets", title: "Hand Out STC Packets Promoting Free Demo Days", description: "Use printed documents", resourceUrl: "MARKETING MATERIALS", order: 2, targetDay: 37, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-6c-five-demo-days", title: "Have 5 Demo Days Scheduled", description: "Have 5 confirmed calendar links with Demo Days scheduled", resourceUrl: "ONE SHEET", order: 3, targetDay: 38, points: 15, isMilestone: true, notifyFranchisor: true, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-6d-explain-elective-allplay", title: "Explain to Directors How Elective vs All Play Works", description: "Learn the difference between elective and all play and what works best", resourceUrl: "ONE SHEET", order: 4, targetDay: 39, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-6e-local-events-list", title: "Develop a List of Local Events to Participate In", description: "Search for local street fairs and other kids activities to participate in", resourceUrl: "ONE SHEET", order: 5, targetDay: 40, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
      ],
    },
    {
      phaseSlug: "w07-demo-classes",
      modules: [
        { slug: "ot-7a-execute-demo-days", title: "Execute Demo Days", description: "Conduct in person demo for parents, students, and directors", resourceUrl: "ONE SHEET — GOOGLE DRIVE", order: 1, targetDay: 43, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-7b-gather-photos", title: "Gather Photos and Testimonials", description: "Obtain photos for socials and email use", resourceUrl: "ONE SHEET — GOOGLE DRIVE", order: 2, targetDay: 44, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-7c-setup-schedule", title: "Setup Schedule with Director", description: "Follow up with director for feedback and planning regular lessons", resourceUrl: "ONE SHEET — GOOGLE DRIVE", order: 3, targetDay: 45, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-7d-parent-enrollment", title: "Setup Parent Enrollment", description: "Setup school in Tutor Cruncher and send link to director or direct to parents", resourceUrl: "GOOGLE DOC", order: 4, targetDay: 46, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
      ],
    },
    {
      phaseSlug: "w08-selling-to-parents",
      modules: [
        { slug: "ot-8a-follow-up-schools", title: "Follow Up with Schools and Directors to Enroll Parents", description: "Follow up with directors to push enrollment for students", resourceUrl: "EMAIL TEMPLATES", order: 1, targetDay: 50, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-8b-mark-lessons-complete", title: "Mark Lessons Complete for Parent Engagement", description: "Mark all completed lessons to start automated emails", resourceUrl: null, order: 2, targetDay: 51, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-8c-target-five-classes", title: "Target 5 Paid Classes by This Week", description: "Goal is 5 classes", resourceUrl: null, order: 3, targetDay: 52, points: 15, isMilestone: true, notifyFranchisor: true, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
      ],
    },
    {
      phaseSlug: "w09-tutor-hires",
      modules: [
        { slug: "ot-9a-indeed-account", title: "Create an Indeed Account", description: "Create and Log in to Indeed", resourceUrl: "ONE SHEET — DOUG", order: 1, targetDay: 57, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-9b-post-job-description", title: "Post Job Description on Indeed", description: "Work with Doug or HR to post a job description", resourceUrl: "ONE SHEET — OPERATIONS MANUAL", order: 2, targetDay: 58, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-9c-screen-applicants", title: "Screen New Applicants", description: "Do initial calls with job applicants and follow screening guidelines", resourceUrl: "JESSICA GOOGLE DRIVE", order: 3, targetDay: 59, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-9d-hire-first-tutor", title: "Hire First Tutor", description: "Extend initial job offer to first batch of tutors or super tutor", resourceUrl: "JESSICA DOCUMENTS", order: 4, targetDay: 60, points: 15, isMilestone: true, notifyFranchisor: true, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
      ],
    },
    {
      phaseSlug: "w10-financial-review",
      modules: [
        { slug: "ot-10a-analyzing-quickbooks", title: "Analyzing QuickBooks", description: "Upkeep and QuickBooks Health", resourceUrl: "OPS MANUAL — SAM", order: 1, targetDay: 64, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-10b-start-bookkeeping", title: "Start Logging Bookkeeping", description: "Using our Charter of Accounts, start financial tracking", resourceUrl: "SAM", order: 2, targetDay: 65, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-10c-review-kpi-dashboard", title: "Review Monthly KPI Dashboard", description: "Review # of schools, # of students, Revenue per location", resourceUrl: "FRANCHISEE ACCOUNT", order: 3, targetDay: 66, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-10d-data-driven-decisions", title: "Making Data Driven Decisions", description: "Learn how to read the Dashboard and act appropriately", resourceUrl: "ONE SHEET", order: 4, targetDay: 67, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
      ],
    },
    {
      phaseSlug: "w11-tutor-management",
      modules: [
        { slug: "ot-11a-weekly-checkins", title: "Setup Weekly Tutor Check-Ins", description: "Set weekly or bi-weekly meetings with tutors", resourceUrl: "JESSICA", order: 1, targetDay: 71, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-11b-tutor-culture-events", title: "Create and Push Tutor Culture Events", description: "Create monthly or quarterly tutor get togethers promoting culture", resourceUrl: "JESSICA", order: 2, targetDay: 72, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-11c-tutor-development", title: "Continue Training and Tutor Development", description: "Identify strong tutors and promote them to mentors", resourceUrl: "MENTOR PROGRAM", order: 3, targetDay: 73, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "ot-11d-review-org-chart", title: "Review Future Org Chart", description: "Learn what future hires will look like and their roles", resourceUrl: "GOOGLE DRIVE", order: 4, targetDay: 74, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
      ],
    },
    {
      phaseSlug: "w12-scale",
      modules: [
        { slug: "ot-12a-program-completion", title: "Program Completion: Take What You Have Learned and Grow!", description: "You have completed the 90-Day Plan. Continue applying what you have learned to scale your franchise.", resourceUrl: null, order: 1, targetDay: 78, points: 15, isMilestone: true, notifyFranchisor: true, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
      ],
    },
  ];
}

// ─── Super-Tutor Modules ────────────────────────────────────────────────────

function superTutorModules(): { phaseSlug: string; modules: ModuleInput[] }[] {
  return [
    {
      phaseSlug: "w01-setting-up-business",
      modules: [
        { slug: "st-1a-finalize-business-entity", title: "Finalize business entity", description: "Operating agreement, LLC Filing, EIN Filing", resourceUrl: "OPERATIONS MANUAL", order: 1, targetDay: 1, points: 15, isMilestone: true, notifyFranchisor: true, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-1b-open-bank-account", title: "Open Bank Account", description: "Need EIN and a bank to work with", resourceUrl: "OPERATIONS MANUAL", order: 2, targetDay: 2, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-1c-obtain-business-insurance", title: "Obtain Business Insurance", description: "Obtain insurance based on our suggested limits", resourceUrl: "OPERATIONS MANUAL", order: 3, targetDay: 3, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-1d-payroll", title: "Payroll", description: "Intro to third party vendor and set up time to talk", resourceUrl: "ADP INTRO", order: 4, targetDay: 4, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-1e-accounting", title: "Accounting", description: "Intro to third party vendor and set up — Sam can help with this", resourceUrl: "QUICKBOOKS", order: 5, targetDay: 5, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-1f-tour-territory", title: "Tour Territory", description: "Smappen Territory Data + Excel spreadsheet + any other resources", resourceUrl: "OBJECTIVE MAP", order: 6, targetDay: 6, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-1g-super-tutor-job-spec", title: "Put Out Job Spec, Doug Does Initial Screening", description: "Goal is to have STC team assist in identifying the potential Super Tutors in the pool of initial applicants. Schedule Harlan/Jessica's team to come on site.", resourceUrl: "SUPER TUTOR HIRING PROCESS", order: 7, targetDay: 7, points: 10, isMilestone: false, notifyFranchisor: false, owner: "COLLABORATIVE", verificationType: "FRANCHISOR_CONFIRMS", franchisorActionText: "Screen initial Super Tutor applicants" },
      ],
    },
    {
      phaseSlug: "w02-onboarding",
      modules: [
        { slug: "st-2a-super-tutor-interview", title: "Visit from Harlan/Jessica to Interview/Hire Super Tutor", description: "Goal is to have STC team assist in identifying the potential Super Tutors in the pool of initial applicants, have prospects shadow/train and then one is elevated to Super Tutor role", resourceUrl: "SUPER TUTOR HIRING PROCESS", order: 1, targetDay: 8, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISOR", verificationType: "FRANCHISOR_CONFIRMS", franchisorActionText: "Conduct Super Tutor interview visit" },
        { slug: "st-2b-onboarding-session", title: "Onboarding Session", description: "Complete the training in the Operations Manual — Story Time University", resourceUrl: "OPERATIONS MANUAL", order: 2, targetDay: 9, points: 10, isMilestone: false, notifyFranchisor: false, owner: "COLLABORATIVE", verificationType: "FRANCHISOR_CONFIRMS", franchisorActionText: "Conduct onboarding session with franchisee" },
        { slug: "st-2c-meeting-key-members", title: "Meeting Key Members", description: "Set up meetings to meet everyone all at once, and find individual time for more", resourceUrl: "ONE SHEET ON KEY MEMBERS", order: 3, targetDay: 10, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-2d-mission-vision-values", title: "Mission Vision Values", description: "Obtain a copy, ask them to print it out and hang it somewhere", resourceUrl: "OPERATIONS MANUAL", order: 4, targetDay: 11, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-2e-review-starter-kit", title: "Review Contents of Starter Kit", description: "What do you have, what is it used for", resourceUrl: "ONE SHEET EXPLAINING WHAT IT IS", order: 5, targetDay: 12, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-2f-review-school-plan", title: "Review Targeted Plan of Schools", description: "Start breaking down schools into easy digestible targets to approach. See Persona information", resourceUrl: "SAMPLE OF SCHOOL PERSONAS", order: 6, targetDay: 13, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
      ],
    },
    {
      phaseSlug: "w03-systems",
      modules: [
        { slug: "st-3a-complete-stc-modules", title: "Complete Story Time Modules", description: "Log on to Teach Story Time and review all of the modules", resourceUrl: "TST", order: 1, targetDay: 15, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-3b-setup-email", title: "Setup Email — G Suite", description: "Obtain log in from Admin User", resourceUrl: "ONE SHEET", order: 2, targetDay: 16, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-3c-tutor-cruncher", title: "Tutor Cruncher", description: "Watch Tutor Cruncher Videos and review", resourceUrl: "TUTOR CRUNCHER DOCS AND VIDEOS", order: 3, targetDay: 17, points: 10, isMilestone: false, notifyFranchisor: false, owner: "COLLABORATIVE", verificationType: "FRANCHISOR_CONFIRMS", franchisorActionText: "Set up franchisee in Tutor Cruncher" },
        { slug: "st-3d-canva", title: "Canva", description: "Create Canva Account, log in, and watch videos to review", resourceUrl: "ONE SHEET + VIDEOS", order: 4, targetDay: 18, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-3e-stripe", title: "Stripe", description: "Log on to Stripe and link Tutor Cruncher and Bank Accounts", resourceUrl: "ONE SHEET + VIDEOS", order: 5, targetDay: 19, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
      ],
    },
    {
      phaseSlug: "w04-pre-marketing",
      modules: [
        { slug: "st-4a-meta-logins", title: "Meta Logins (Facebook + Instagram)", description: "Log in to pages and start posting the developed schedule", resourceUrl: "ONE SHEET + SOCIAL MEDIA POSTS", order: 1, targetDay: 22, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-4b-google-business-profile", title: "Google Business Profile", description: "Log in to Google Business and fill in personal information", resourceUrl: "ONE SHEET + DOUG", order: 2, targetDay: 23, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-4c-branded-marketing-assets", title: "Fill in Branded Marketing Assets", description: "Log in to Canva and start manipulating pertinent marketing docs", resourceUrl: "CANVA FOLDER", order: 3, targetDay: 24, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-4d-receive-welcome-kit", title: "Receive Welcome Kit", description: "Receive Welcome Kit and review items inside", resourceUrl: "ONE SHEET EXPLAINER", order: 4, targetDay: 25, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-4e-finalize-school-list", title: "Finalize School Target List", description: "Have a ranked list of schools you want to target and start marketing to", resourceUrl: "FRANCHISEE DEVELOPED EXCEL", order: 5, targetDay: 26, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-4f-draft-email-plan", title: "Draft Email Marketing Plan", description: "Start preparing emails with local information and personal info from schools", resourceUrl: "GOOGLE DRIVE — EMAIL PLAN", order: 6, targetDay: 27, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-4g-print-materials", title: "Print Marketing Materials", description: "Find local printer (Alphagraphics is a vendor partner) and print documents", resourceUrl: "CANVA FOLDER", order: 7, targetDay: 28, points: 15, isMilestone: true, notifyFranchisor: true, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
      ],
    },
    {
      phaseSlug: "w05-social-media-marketing",
      modules: [
        { slug: "st-5a-launch-social-media", title: "Launch Facebook and Instagram Marketing", description: "Follow social plan posting at least 3 times a week", resourceUrl: "GOOGLE DRIVE", order: 1, targetDay: 29, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-5b-post-personal-socials", title: "Post on Personal Social Media Announcing Launch", description: "Post announcement on all personal social media", resourceUrl: "ONE SHEET", order: 2, targetDay: 30, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-5c-email-friends-family", title: "Email Family and Friends Asking for Introductions", description: "Email relevant friends and families asking for introductions to schools", resourceUrl: "ONE SHEET", order: 3, targetDay: 31, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
      ],
    },
    {
      phaseSlug: "w06-market-outreach",
      modules: [
        { slug: "st-6a-reach-out-schools", title: "Reach Out to 50-75 Schools from Your List", description: "Follow in-person, email, and phone scripts to contact schools", resourceUrl: "ONE SHEET", order: 1, targetDay: 36, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-6b-hand-out-packets", title: "Hand Out STC Packets Promoting Free Demo Days", description: "Use printed documents", resourceUrl: "MARKETING MATERIALS", order: 2, targetDay: 37, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-6c-five-demo-days", title: "Have 5 Demo Days Scheduled", description: "Have 5 confirmed calendar links with Demo Days scheduled", resourceUrl: "ONE SHEET", order: 3, targetDay: 38, points: 15, isMilestone: true, notifyFranchisor: true, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-6d-explain-elective-allplay", title: "Explain to Directors How Elective vs All Play Works", description: "Learn the difference between elective and all play and what works best", resourceUrl: "ONE SHEET", order: 4, targetDay: 39, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-6e-local-events-list", title: "Develop a List of Local Events to Participate In", description: "Search for local street fairs and other kids activities to participate in", resourceUrl: "ONE SHEET", order: 5, targetDay: 40, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
      ],
    },
    {
      phaseSlug: "w07-demo-classes",
      modules: [
        { slug: "st-7a-execute-demo-days", title: "Execute Demo Days", description: "Conduct in person demo for parents, students, and directors", resourceUrl: "ONE SHEET — GOOGLE DRIVE", order: 1, targetDay: 43, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-7b-gather-photos", title: "Gather Photos and Testimonials", description: "Obtain photos for socials and email use", resourceUrl: "ONE SHEET — GOOGLE DRIVE", order: 2, targetDay: 44, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-7c-setup-schedule", title: "Setup Schedule with Director", description: "Follow up with director for feedback and planning regular lessons", resourceUrl: "ONE SHEET — GOOGLE DRIVE", order: 3, targetDay: 45, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-7d-parent-enrollment", title: "Setup Parent Enrollment", description: "Setup school in Tutor Cruncher and send link to director or direct to parents", resourceUrl: "GOOGLE DOC", order: 4, targetDay: 46, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
      ],
    },
    {
      phaseSlug: "w08-selling-to-parents",
      modules: [
        { slug: "st-8a-follow-up-schools", title: "Follow Up with Schools and Directors to Enroll Parents", description: "Follow up with directors to push enrollment for students", resourceUrl: "EMAIL TEMPLATES", order: 1, targetDay: 50, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-8b-mark-lessons-complete", title: "Mark Lessons Complete for Parent Engagement", description: "Mark all completed lessons to start automated emails", resourceUrl: null, order: 2, targetDay: 51, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-8c-target-five-classes", title: "Target 5 Paid Classes by This Week", description: "Goal is 5 classes", resourceUrl: null, order: 3, targetDay: 52, points: 15, isMilestone: true, notifyFranchisor: true, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
      ],
    },
    {
      phaseSlug: "w09-tutor-hires",
      modules: [
        { slug: "st-9a-indeed-account", title: "Create an Indeed Account", description: "Create and Log in to Indeed", resourceUrl: "ONE SHEET — DOUG", order: 1, targetDay: 57, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-9b-post-job-description", title: "Post Job Description on Indeed", description: "Work with Doug or HR to post a job description", resourceUrl: "ONE SHEET — OPERATIONS MANUAL", order: 2, targetDay: 58, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-9c-screen-applicants", title: "Screen New Applicants", description: "Do initial calls with job applicants and follow screening guidelines", resourceUrl: "JESSICA GOOGLE DRIVE", order: 3, targetDay: 59, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-9d-hire-first-tutor", title: "Hire First Tutor", description: "Extend initial job offer to first batch of tutors or super tutor", resourceUrl: "JESSICA DOCUMENTS", order: 4, targetDay: 60, points: 15, isMilestone: true, notifyFranchisor: true, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
      ],
    },
    {
      phaseSlug: "w10-financial-review",
      modules: [
        { slug: "st-10a-setup-quickbooks", title: "Setup QuickBooks", description: "Create a QuickBooks Account", resourceUrl: "OPS MANUAL — SAM", order: 1, targetDay: 64, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-10b-start-bookkeeping", title: "Start Logging Bookkeeping", description: "Using our Charter of Accounts, start financial tracking", resourceUrl: "SAM", order: 2, targetDay: 65, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-10c-review-kpi-dashboard", title: "Review Monthly KPI Dashboard", description: "Review # of schools, # of students, Revenue per location", resourceUrl: "FRANCHISEE ACCOUNT", order: 3, targetDay: 66, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
      ],
    },
    {
      phaseSlug: "w11-tutor-management",
      modules: [
        { slug: "st-11a-weekly-checkins", title: "Setup Weekly Tutor Check-Ins", description: "Set weekly or bi-weekly meetings with tutors", resourceUrl: "JESSICA", order: 1, targetDay: 71, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-11b-tutor-culture-events", title: "Create and Push Tutor Culture Events", description: "Create monthly or quarterly tutor get togethers promoting culture", resourceUrl: "JESSICA", order: 2, targetDay: 72, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-11c-tutor-development", title: "Continue Training and Tutor Development", description: "Identify strong tutors and promote them to mentors", resourceUrl: "MENTOR PROGRAM", order: 3, targetDay: 73, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
        { slug: "st-11d-review-org-chart", title: "Review Future Org Chart", description: "Learn what future hires will look like and their roles", resourceUrl: "GOOGLE DRIVE", order: 4, targetDay: 74, points: 10, isMilestone: false, notifyFranchisor: false, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
      ],
    },
    {
      phaseSlug: "w12-scale",
      modules: [
        { slug: "st-12a-program-completion", title: "Program Completion: Take What You Have Learned and Grow!", description: "You have completed the 90-Day Plan. Continue applying what you have learned to scale your franchise.", resourceUrl: null, order: 1, targetDay: 78, points: 15, isMilestone: true, notifyFranchisor: true, owner: "FRANCHISEE", verificationType: "CHECKBOX", franchisorActionText: null },
      ],
    },
  ];
}

// ─── Future CE Program Stubs ─────────────────────────────────────────────────

const CE_PROGRAMS = [
  { slug: "ce-recruitment-hiring-retention", name: "Recruitment, Hiring & Retention" },
  { slug: "ce-customer-expansion-renewal", name: "Customer Expansion & Renewal" },
  { slug: "ce-build-business-within-business", name: "Build Business Within Business" },
  { slug: "ce-how-to-build-a-club", name: "How to Build a Club" },
  { slug: "ce-how-to-run-a-showcase", name: "How to Run a Showcase" },
  { slug: "ce-how-to-run-private-lessons", name: "How to Run Private Lessons" },
  { slug: "ce-ready-for-new-territory", name: "Ready for a New Territory?" },
  { slug: "ce-upselling-to-other-classes", name: "Upselling to Other Classes" },
  { slug: "ce-summer-camps", name: "Summer Camps" },
  { slug: "ce-school-age-group", name: "School Age Group" },
];

// ─── Main Seed Function ──────────────────────────────────────────────────────

async function main() {
  console.log("Seeding 90-Day Plans...\n");

  // ── Step 1: Clean up orphaned phases/modules (from old seed-academy.ts) ────
  console.log("Cleaning up orphaned phases/modules (programId: null)...");

  const orphanedPhases = await prisma.academyPhase.findMany({
    where: { programId: null },
    select: { id: true, slug: true },
  });

  if (orphanedPhases.length > 0) {
    // Delete modules in orphaned phases first (cascade doesn't apply to manual cleanup)
    const orphanedPhaseIds = orphanedPhases.map((p) => p.id);
    const deletedModules = await prisma.academyModule.deleteMany({
      where: { phaseId: { in: orphanedPhaseIds } },
    });
    console.log(`  Deleted ${deletedModules.count} orphaned modules`);

    const deletedPhases = await prisma.academyPhase.deleteMany({
      where: { id: { in: orphanedPhaseIds } },
    });
    console.log(`  Deleted ${deletedPhases.count} orphaned phases`);
  } else {
    console.log("  No orphaned phases found");
  }

  // ── Step 2: Create/upsert AcademyProgram records ───────────────────────────

  console.log("\nCreating 90-Day Plan programs...");

  const ownerTutorProgram = await prisma.academyProgram.upsert({
    where: { slug: "90-day-owner-tutor" },
    update: {
      name: "90-Day Plan: Owner-Tutor",
      description: "The complete 90-day onboarding plan for franchise owners who teach classes themselves.",
      programType: "ONBOARDING",
      isActive: true,
      isDefault: true,
      sequence: 1,
    },
    create: {
      slug: "90-day-owner-tutor",
      name: "90-Day Plan: Owner-Tutor",
      description: "The complete 90-day onboarding plan for franchise owners who teach classes themselves.",
      programType: "ONBOARDING",
      isActive: true,
      isDefault: true,
      sequence: 1,
    },
  });
  console.log(`  ✓ Owner-Tutor program: ${ownerTutorProgram.id}`);

  const superTutorProgram = await prisma.academyProgram.upsert({
    where: { slug: "90-day-owner-super-tutor" },
    update: {
      name: "90-Day Plan: Owner + Super Tutor",
      description: "The 90-day onboarding plan for franchise owners who hire a Super Tutor immediately.",
      programType: "ONBOARDING",
      isActive: true,
      isDefault: false,
      sequence: 2,
    },
    create: {
      slug: "90-day-owner-super-tutor",
      name: "90-Day Plan: Owner + Super Tutor",
      description: "The 90-day onboarding plan for franchise owners who hire a Super Tutor immediately.",
      programType: "ONBOARDING",
      isActive: true,
      isDefault: false,
      sequence: 2,
    },
  });
  console.log(`  ✓ Super-Tutor program: ${superTutorProgram.id}`);

  // ── Step 3: Seed phases and modules for each program ───────────────────────

  async function seedTrack(
    programId: string,
    prefix: string,
    trackModules: { phaseSlug: string; modules: ModuleInput[] }[],
    label: string
  ) {
    console.log(`\nSeeding ${label}...`);
    let phaseCount = 0;
    let moduleCount = 0;

    for (const phaseDef of PHASES) {
      const phaseSlug = `${prefix}-${phaseDef.slug}`;

      const phase = await prisma.academyPhase.upsert({
        where: { slug: phaseSlug },
        update: {
          title: phaseDef.title,
          description: phaseDef.description,
          order: phaseDef.order,
          dayStart: phaseDef.dayStart,
          dayEnd: phaseDef.dayEnd,
          programId,
        },
        create: {
          slug: phaseSlug,
          title: phaseDef.title,
          description: phaseDef.description,
          order: phaseDef.order,
          dayStart: phaseDef.dayStart,
          dayEnd: phaseDef.dayEnd,
          programId,
        },
      });
      phaseCount++;

      // Find modules for this phase
      const phaseModules = trackModules.find(
        (tm) => tm.phaseSlug === phaseDef.slug
      );
      if (!phaseModules) continue;

      for (const mod of phaseModules.modules) {
        await prisma.academyModule.upsert({
          where: { slug: mod.slug },
          update: {
            title: mod.title,
            description: mod.description,
            order: mod.order,
            moduleType: "CHECKLIST",
            points: mod.points,
            resourceUrl: mod.resourceUrl,
            targetDay: mod.targetDay,
            isMilestone: mod.isMilestone,
            notifyFranchisor: mod.notifyFranchisor,
            owner: mod.owner,
            verificationType: mod.verificationType,
            franchisorActionText: mod.franchisorActionText,
            phaseId: phase.id,
          },
          create: {
            slug: mod.slug,
            title: mod.title,
            description: mod.description,
            order: mod.order,
            moduleType: "CHECKLIST",
            points: mod.points,
            resourceUrl: mod.resourceUrl,
            targetDay: mod.targetDay,
            isMilestone: mod.isMilestone,
            notifyFranchisor: mod.notifyFranchisor,
            owner: mod.owner,
            verificationType: mod.verificationType,
            franchisorActionText: mod.franchisorActionText,
            phaseId: phase.id,
          },
        });
        moduleCount++;
      }
    }

    console.log(`  ✓ ${phaseCount} phases, ${moduleCount} modules`);
  }

  await seedTrack(ownerTutorProgram.id, "ot", ownerTutorModules(), "Owner-Tutor track");
  await seedTrack(superTutorProgram.id, "st", superTutorModules(), "Super-Tutor track");

  // ── Step 4: Seed future CE program stubs ───────────────────────────────────

  console.log("\nCreating future Continuing Education program stubs...");

  for (let i = 0; i < CE_PROGRAMS.length; i++) {
    const ce = CE_PROGRAMS[i];
    await prisma.academyProgram.upsert({
      where: { slug: ce.slug },
      update: {
        name: ce.name,
        description: `Future continuing education program: ${ce.name}`,
        programType: "CONTINUING_EDUCATION",
        isActive: false,
        isDefault: false,
        sequence: 10 + i,
      },
      create: {
        slug: ce.slug,
        name: ce.name,
        description: `Future continuing education program: ${ce.name}`,
        programType: "CONTINUING_EDUCATION",
        isActive: false,
        isDefault: false,
        sequence: 10 + i,
      },
    });
  }
  console.log(`  ✓ ${CE_PROGRAMS.length} CE program stubs created`);

  console.log("\n✅ 90-Day Plan seeding complete!");
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
