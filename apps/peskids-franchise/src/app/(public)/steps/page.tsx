import { Metadata } from "next";
import { LinkButton } from "@/components/shared/Button";

export const metadata: Metadata = {
  title: "Steps to Ownership",
  description:
    "Learn about the steps to becoming an Peskids Franchisee.",
  alternates: {
    canonical: "https://franchise.peskids.com/steps",
  },
  openGraph: {
    url: "https://franchise.peskids.com/steps",
  },
};

const steps = [
  {
    phase: "0",
    title: "Application Submission",
    description:
      "Complete our online application to express your interest in the Peskids Franchise opportunity. This is your first step toward building something meaningful.",
    details: [],
    highlight: false,
  },
  {
    phase: "1",
    title: "Initial Screening",
    description:
      "We'll introduce you to Peskids Franchise and franchising, covering how we hire, market, and sell. We'll also learn about your goals, motivations, and ability to follow our established system.",
    details: [
      "What is Peskids Franchise?",
      "What is franchising?",
      "Your goals and motivations",
      "Can you follow a system and protect our brand?",
    ],
    highlight: false,
  },
  {
    phase: "2",
    title: "Candidate Assessment",
    description:
      "Complete a written questionnaire and personality assessment to help us understand your strengths, working style, and fit with our culture.",
    details: [
      "10-15 question questionnaire",
      "Personality assessment",
      "Skills and experience evaluation",
    ],
    highlight: false,
  },
  {
    phase: "3",
    title: "Operator Interview",
    description:
      "A deeper conversation to discuss your assessment results and ensure alignment between what you've shared and what we've observed. This is where we get to know you better.",
    details: [
      "Review questionnaire and assessment results",
      "Discuss your vision for the business",
      "Evaluate cultural fit and communication style",
    ],
    highlight: false,
  },
  {
    phase: "4",
    title: "Pre-Work Submission",
    description:
      "Demonstrate your commitment by completing strategic planning work. This shows us you're serious and helps you deeply understand your potential market.",
    details: [
      "Define your target territory",
      "Develop your recruiting plan",
      "Analyze the competitive landscape",
      "Identify opportunities in your market",
      "Create your 30/60/90 day sales plan",
    ],
    highlight: true,
  },
  {
    phase: "5",
    title: "References & Background Check",
    description:
      "We'll verify your professional references and conduct a background check. This step ensures we're building a network of trusted franchise partners.",
    details: [
      "Professional reference checks",
      "Background verification",
      "Final qualification review",
    ],
    highlight: false,
  },
  {
    phase: "6",
    title: "Family Connection Call",
    description:
      "Running a franchise is a family decision. We want to meet your support system and ensure everyone is aligned on the commitment and opportunity ahead.",
    details: [
      "Meet your family or key supporters",
      "Discuss time and lifestyle expectations",
      "Answer questions from your support network",
    ],
    highlight: false,
  },
  {
    phase: "7",
    title: "Discovery Day",
    description:
      "Visit us in person to meet the team, observe classes in action, and experience Peskids Franchise firsthand. This is your chance to ask detailed questions and see the magic happen.",
    details: [
      "Meet the leadership team",
      "Observe live classes",
      "Tour operations and systems",
      "Final Q&A session",
    ],
    highlight: false,
  },
  {
    phase: "8",
    title: "Territory Awarded",
    description:
      "Congratulations! If it's a mutual fit, we'll award your territory and welcome you to the Peskids Franchise family. Your journey as a franchise owner officially begins.",
    details: [
      "Franchise agreement signing",
      "Territory confirmation",
      "Onboarding and training begins",
    ],
    highlight: false,
  },
];

const preWorkModules = [
  {
    title: "Territory Definition",
    description:
      "Define your target territory with specific zip codes, demographics, and school counts.",
  },
  {
    title: "Recruiting Plan",
    description:
      "Outline your strategy for hiring and building a team of exceptional tutors.",
  },
  {
    title: "Competitive Analysis",
    description:
      "Research the competitive landscape and identify what sets you apart in your market.",
  },
  {
    title: "Market Opportunities",
    description:
      "Identify key opportunities including schools, libraries, community centers, and partnerships.",
  },
  {
    title: "30/60/90 Day Sales Plan",
    description:
      "Create a detailed roadmap for your first 90 days of business development and sales.",
  },
];

export default function StepsPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-brand-light to-white py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-5xl">
              Steps to Ownership
            </h1>
            <p className="mt-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-600">
              Our thorough process ensures both you and Peskids Franchise are
              set up for success. Here&apos;s what to expect.
            </p>
          </div>
        </div>
      </div>

      {/* Process Timeline */}
      <div className="py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="space-y-0">
              {steps.map((step, index) => (
                <div key={step.phase} className="relative pl-12 sm:pl-14 pb-6 sm:pb-8">
                  {/* Connector line */}
                  {index < steps.length - 1 && (
                    <div className="absolute left-4 sm:left-5 top-10 sm:top-12 bottom-0 w-0.5 bg-gray-200" />
                  )}

                  {/* Phase number */}
                  <div
                    className={`absolute left-0 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full text-xs sm:text-sm font-bold ${
                      step.highlight
                        ? "bg-brand-orange text-white"
                        : "bg-brand-navy text-white"
                    }`}
                  >
                    {step.phase}
                  </div>

                  {/* Content */}
                  <div
                    className={`rounded-xl sm:rounded-2xl p-4 sm:p-6 ${
                      step.highlight
                        ? "bg-brand-orange/10 border-2 border-brand-orange"
                        : "bg-gray-50"
                    }`}
                  >
                    <h3 className="text-base sm:text-xl font-bold text-brand-navy">
                      Phase {step.phase}: {step.title}
                    </h3>
                    <p className="mt-2 text-sm sm:text-base text-gray-600">{step.description}</p>
                    {step.details.length > 0 && (
                      <ul className="mt-4 space-y-2">
                        {step.details.map((detail, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className={step.highlight ? "text-brand-orange" : "text-brand-purple"}>•</span>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    )}
                    {step.highlight && (
                      <div className="mt-4 p-4 bg-white rounded-lg">
                        <p className="text-sm font-semibold text-brand-orange">
                          Why Pre-Work Matters
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          The pre-work phase demonstrates your commitment and strategic thinking.
                          It helps you understand your market and ensures you&apos;re making an informed decision.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pre-Work Detail */}
      <div className="bg-brand-light py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              Phase 4: Pre-Work Deep Dive
            </h2>
            <p className="mt-4 text-base sm:text-lg text-gray-600">
              The pre-work phase is where you demonstrate your commitment and strategic thinking.
              Complete these 5 deliverables to show us you&apos;re ready:
            </p>

            <div className="mt-6 sm:mt-8 grid gap-3 sm:gap-4">
              {preWorkModules.map((module, index) => (
                <div
                  key={module.title}
                  className="flex gap-3 sm:gap-4 rounded-xl sm:rounded-2xl bg-white p-4 sm:p-6 shadow-sm"
                >
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-brand-navy/10 rounded-full flex items-center justify-center">
                    <span className="text-brand-navy font-bold text-sm sm:text-base">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-navy text-sm sm:text-base">
                      {module.title}
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-gray-600">
                      {module.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-brand-navy rounded-xl sm:rounded-2xl text-white">
              <h3 className="font-semibold text-sm sm:text-base">
                What We&apos;re Looking For
              </h3>
              <ul className="mt-3 sm:mt-4 space-y-2 text-xs sm:text-sm text-brand-light/90">
                <li>• Strategic thinking and market awareness</li>
                <li>• Ability to follow a system and protect our brand</li>
                <li>• Strong communication and leadership skills</li>
                <li>• Genuine enthusiasm for children&apos;s education</li>
                <li>• Commitment to excellence and continuous improvement</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Summary */}
      <div className="py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              Typical Timeline
            </h2>
            <p className="mt-4 text-base sm:text-lg text-gray-600">
              From initial inquiry to launching your first classes.
            </p>

            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4">
              <div className="rounded-xl sm:rounded-2xl bg-brand-light p-4 sm:p-6 text-center w-full sm:w-auto">
                <div className="text-2xl sm:text-3xl font-bold text-brand-navy">
                  6-10 weeks
                </div>
                <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">
                  Inquiry to Agreement
                </div>
              </div>
              <div className="text-xl sm:text-2xl text-gray-300 hidden sm:block">+</div>
              <div className="text-lg text-gray-300 sm:hidden">+</div>
              <div className="rounded-xl sm:rounded-2xl bg-brand-light p-4 sm:p-6 text-center w-full sm:w-auto">
                <div className="text-2xl sm:text-3xl font-bold text-brand-navy">
                  4-8 weeks
                </div>
                <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">
                  Training to Launch
                </div>
              </div>
              <div className="text-xl sm:text-2xl text-gray-300 hidden sm:block">=</div>
              <div className="text-lg text-gray-300 sm:hidden">=</div>
              <div className="rounded-xl sm:rounded-2xl bg-brand-navy p-4 sm:p-6 text-center text-white w-full sm:w-auto">
                <div className="text-2xl sm:text-3xl font-bold">10-18 weeks</div>
                <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-brand-light/80">
                  Total Timeline
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-brand-navy py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Ready to take the first step?
          </h2>
          <div className="mt-6">
            <LinkButton href="/contact" variant="secondary" size="lg" className="w-full sm:w-auto">
              Submit Your Inquiry
            </LinkButton>
          </div>
        </div>
      </div>
    </div>
  );
}
