import { Metadata } from "next";
import { LinkButton } from "@/components/shared/Button";

export const metadata: Metadata = {
  title: "Support & Training",
  description:
    "Comprehensive training and ongoing support for Acme Franchisees.",
  alternates: {
    canonical: "https://franchising.acmefranchise.com/support",
  },
  openGraph: {
    url: "https://franchising.acmefranchise.com/support",
  },
};

const trainingPhases = [
  {
    phase: "Foundation & Setup",
    duration: "Days 1-30",
    items: [
      "Franchisor onboarding and curriculum certification",
      "Business entity and legal setup",
      "Systems and tools training",
      "Territory mapping and school targeting",
      "Marketing and brand presence setup",
      "Outreach preparation",
    ],
  },
  {
    phase: "Market Activation",
    duration: "Days 31-60",
    items: [
      "School outreach campaign",
      "Demo classes at partner locations",
      "Social media launch and local marketing",
      "First enrollments and conversions",
      "Weekly franchisor check-ins",
      "Billing and scheduling setup",
    ],
  },
  {
    phase: "Growth & Refinement",
    duration: "Days 61-90",
    items: [
      "Expand to recurring weekly classes",
      "Tutor hiring and training",
      "Financial review and KPIs",
      "Marketing scale-up campaigns",
      "Stabilization and reporting",
    ],
  },
];

const supportTypes = [
  {
    title: "Curriculum Support",
    description:
      "Access to our complete Acme Franchise curriculum, including lesson plans, materials, and ongoing updates.",
    icon: "📚",
  },
  {
    title: "Marketing Resources",
    description:
      "Professional marketing materials, social media content, and effective campaign templates.",
    icon: "📣",
  },
  {
    title: "Technology Platform",
    description:
      "Custom operations hub for scheduling, billing, parent communication, and business analytics.",
    icon: "💻",
  },
  {
    title: "Franchise Community",
    description:
      "Connect with other franchisees, share best practices, and learn from each other's experiences.",
    icon: "🤝",
  },
  {
    title: "Dedicated Coach",
    description:
      "Your personal franchise success coach provides guidance, accountability, and strategic support.",
    icon: "🎯",
  },
  {
    title: "Earl AI Assistant",
    description:
      "Our AI-powered assistant helps with parent questions, scheduling, and operational tasks.",
    icon: "🐿️",
  },
];

export default function SupportPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-brand-light to-white py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-5xl">
              Support & Training
            </h1>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-600">
              We invest in your success with comprehensive training and ongoing
              support at every stage of your franchise journey.
            </p>
          </div>
        </div>
      </div>

      {/* Training Timeline */}
      <div className="py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              Your Training Journey
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-600">
              A structured path from signing to success.
            </p>
          </div>
          <div className="mx-auto mt-8 sm:mt-10 max-w-4xl">
            <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3">
              {trainingPhases.map((phase, index) => (
                <div
                  key={phase.phase}
                  className="relative rounded-xl sm:rounded-2xl bg-white border border-gray-100 p-5 sm:p-8 shadow-sm"
                >
                  <div className="absolute -top-3 sm:-top-4 left-5 sm:left-8 px-2 sm:px-3 py-0.5 sm:py-1 bg-brand-navy text-white text-xs sm:text-sm font-semibold rounded-full">
                    Phase {index + 1}
                  </div>
                  <h3 className="mt-3 sm:mt-4 text-lg sm:text-xl font-bold text-brand-navy">
                    {phase.phase}
                  </h3>
                  <p className="text-xs sm:text-sm text-brand-purple">{phase.duration}</p>
                  <ul className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
                    {phase.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-xs sm:text-sm text-gray-600"
                      >
                        <span className="text-brand-green mt-0.5">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Support Types */}
      <div className="bg-brand-light py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              Ongoing Support
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-600">
              Resources and guidance whenever you need it.
            </p>
          </div>
          <div className="mx-auto mt-8 sm:mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {supportTypes.map((support) => (
              <div
                key={support.title}
                className="rounded-xl sm:rounded-2xl bg-white p-5 sm:p-8 shadow-sm"
              >
                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">{support.icon}</div>
                <h3 className="text-base sm:text-lg font-semibold text-brand-navy">
                  {support.title}
                </h3>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">
                  {support.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Curriculum Certification */}
      <div className="py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              Curriculum Certification
            </h2>
            <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4 text-base sm:text-lg text-gray-600">
              <p>
                Every Acme Franchisee completes our comprehensive
                curriculum certification program. You&apos;ll learn:
              </p>
              <ul className="space-y-3 sm:space-y-4">
                <li className="flex items-start gap-2 sm:gap-3">
                  <span className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-brand-cyan/20 rounded-full flex items-center justify-center text-brand-navy font-bold text-sm sm:text-base">
                    1
                  </span>
                  <div>
                    <strong className="text-brand-navy text-sm sm:text-base">
                      The Acme Franchise Method
                    </strong>
                    <p className="text-sm sm:text-base">
                      Our unique approach to teaching chess through storytelling
                      and character-based instruction.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <span className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-brand-cyan/20 rounded-full flex items-center justify-center text-brand-navy font-bold text-sm sm:text-base">
                    2
                  </span>
                  <div>
                    <strong className="text-brand-navy text-sm sm:text-base">
                      Classroom Management
                    </strong>
                    <p className="text-sm sm:text-base">
                      Techniques for engaging young learners and managing group
                      dynamics.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <span className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-brand-cyan/20 rounded-full flex items-center justify-center text-brand-navy font-bold text-sm sm:text-base">
                    3
                  </span>
                  <div>
                    <strong className="text-brand-navy text-sm sm:text-base">
                      Progressive Skill Building
                    </strong>
                    <p className="text-sm sm:text-base">
                      How to advance students through our leveled curriculum
                      system.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2 sm:gap-3">
                  <span className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-brand-cyan/20 rounded-full flex items-center justify-center text-brand-navy font-bold text-sm sm:text-base">
                    4
                  </span>
                  <div>
                    <strong className="text-brand-navy text-sm sm:text-base">
                      Parent Communication
                    </strong>
                    <p className="text-sm sm:text-base">
                      How to keep parents engaged and demonstrate student
                      progress.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-brand-navy py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Ready to learn more about our support system?
          </h2>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <LinkButton href="/contact" variant="secondary" size="lg" className="w-full sm:w-auto">
              Talk to Our Team
            </LinkButton>
            <LinkButton
              href="/steps"
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-white text-white hover:bg-white/10"
            >
              See the Process
            </LinkButton>
          </div>
        </div>
      </div>
    </div>
  );
}
