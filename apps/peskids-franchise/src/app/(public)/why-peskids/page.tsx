import { Metadata } from "next";
import Image from "next/image";
import { LinkButton } from "@/components/shared/Button";

export const metadata: Metadata = {
  title: "Why Peskids Franchise",
  description:
    "Discover why Peskids Franchise is a premier children's after-school enrichment franchise opportunity.",
  alternates: {
    canonical: "https://franchise.peskids.com/why-peskids",
  },
  openGraph: {
    url: "https://franchise.peskids.com/why-peskids",
  },
};

// TODO(content): replace stats/footnotes with real Peskids figures and sources.
const differentiators = [
  {
    title: "Proven Curriculum",
    description:
      "Our program is unlike anything else in the market. Children learn through engaging, structured activities, not dry instruction.",
    stats: "[Age range]",
    footnote: null,
  },
  {
    title: "Growing Industry",
    description:
      "The children's enrichment market is booming as parents seek activities that develop skills beyond the classroom.",
    stats: "Growing Market",
    footnote: null,
  },
  {
    title: "Proven Results",
    description:
      "Children in our program show measurable improvements in confidence, social skills, and academic performance.",
    stats: "[Add a real metric]",
    footnote: null,
  },
  {
    title: "Low Overhead",
    description:
      "No expensive real estate required. Programs run in schools, community centers, and homes.",
    stats: "Flexible Model",
    footnote: null,
  },
];

const benefits = [
  {
    category: "For Children",
    items: [
      "Critical thinking and problem-solving skills",
      "Improved focus and concentration",
      "Pattern recognition abilities",
      "Confidence through achievement",
      "Social skills and sportsmanship",
    ],
  },
  {
    category: "For Parents",
    items: [
      "Screen-free enrichment activity",
      "Cognitive development support",
      "Convenient after-school programming",
      "Visible skill progression",
      "Community and social connections",
    ],
  },
  {
    category: "For Schools",
    items: [
      "Ready-made enrichment program",
      "No teacher training required",
      "Supports academic goals",
      "Parent satisfaction driver",
      "Differentiation in the market",
    ],
  },
];

export default function WhyPeskidsPage() {
  return (
    <div className="bg-white">
      {/* Hero with Image */}
      <div className="relative isolate overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-16 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-brand-navy sm:text-5xl">
                Why Peskids Franchise?
              </h1>
              <p className="mt-4 sm:mt-6 text-base sm:text-lg leading-7 sm:leading-8 text-gray-600">
                We&apos;ve built something special: a children&apos;s education
                business that makes a real difference while building a meaningful
                business in your community.
              </p>
              <div className="mt-6 sm:mt-8">
                <LinkButton href="/contact" size="lg" className="w-full sm:w-auto">
                  Learn More
                </LinkButton>
              </div>
            </div>
            <div className="relative order-first lg:order-last">
              {/* TODO(content): replace with a real Peskids photo. */}
              <Image
                src="/images/kids/child-learning.png"
                alt="Child at a Peskids after-school program"
                width={600}
                height={500}
                className="rounded-xl sm:rounded-2xl shadow-xl mx-auto"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Differentiators */}
      <div className="py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              What Sets Us Apart
            </h2>
          </div>
          <div className="mx-auto mt-6 sm:mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
            {differentiators.map((item) => (
              <div
                key={item.title}
                className="rounded-xl sm:rounded-2xl bg-brand-light p-5 sm:p-8"
              >
                <div className="text-xs sm:text-sm font-semibold text-brand-purple">
                  {item.stats}
                </div>
                <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-xl font-bold text-brand-navy">
                  {item.title}
                </h3>
                <p className="mt-2.5 sm:mt-4 text-sm sm:text-base text-gray-600">{item.description}</p>
                {item.footnote && (
                  <p className="mt-2 text-[10px] sm:text-xs text-gray-400 italic">{item.footnote}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* The Peskids Advantage */}
      {/* TODO(content): if Peskids has real outcome data or third-party research to cite, add it here with a real, downloadable source document. Do not cite studies or name authors we can't verify or didn't commission. */}
      <div className="bg-brand-navy py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center text-white">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight sm:text-4xl">
              The Peskids Advantage
            </h2>
            <p className="mt-4 text-base sm:text-lg leading-7 sm:leading-8 text-brand-light/80 px-2 sm:px-0">
              Structured after-school time is more than childcare—it&apos;s a tool
              for developing young minds.
            </p>
            <div className="mt-6 sm:mt-8 grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-4">
              {[
                { label: "Critical Thinking", value: "[Add outcome]" },
                { label: "Focus & Attention", value: "[Add outcome]" },
                { label: "Social Skills", value: "[Add outcome]" },
                { label: "Confidence", value: "[Add outcome]" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-xl sm:text-3xl font-bold text-brand-cyan">
                    {stat.value}
                  </div>
                  <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-brand-light/60">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Grid */}
      <div className="py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              Benefits for Everyone
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-600">
              Our programs create value for children, parents, and partner
              schools.
            </p>
          </div>
          <div className="mx-auto mt-6 sm:mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
            {benefits.map((group) => (
              <div key={group.category} className="rounded-xl sm:rounded-2xl border border-gray-100 p-5 sm:p-8">
                <h3 className="text-base sm:text-lg font-bold text-brand-navy">
                  {group.category}
                </h3>
                <ul className="mt-4 sm:mt-6 space-y-2.5 sm:space-y-3">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs sm:text-sm text-gray-600">
                      <span className="text-brand-green mt-0.5 sm:mt-1">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full width image with characters */}
      <div className="bg-brand-light py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <Image
            src="/images/characters/team-illustration.svg"
            alt="Peskids Franchise Characters"
            width={800}
            height={150}
            className="mx-auto h-16 sm:h-24 w-auto"
          />
          <h3 className="mt-5 sm:mt-8 text-xl sm:text-2xl font-bold text-brand-navy">
            Meet Our Character Family
          </h3>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2 sm:px-0">
            {/* TODO(content): describe Peskids' real program characters/mascots, if any. */}
            Children learn through engaging activities and stories, not abstract
            rules.
          </p>
        </div>
      </div>

      {/* Market Opportunity */}
      <div className="py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
                The Market Opportunity
              </h2>
              <div className="mt-5 sm:mt-8 space-y-4 sm:space-y-6 text-base sm:text-lg text-gray-600">
                <p>
                  Parents are increasingly seeking meaningful enrichment
                  activities for their children. The days of passive screen time
                  are giving way to programs that build real skills.
                </p>
                <p>
                  Working families need reliable, high-quality after-school
                  options more than ever. That&apos;s where Peskids Franchise
                  comes in—and that&apos;s your opportunity.
                </p>
              </div>
            </div>
            <div className="order-first lg:order-last">
              {/* TODO(content): replace with a real Peskids photo. */}
              <Image
                src="/images/kids/method-1.jpg"
                alt="Peskids Franchise in action"
                width={600}
                height={400}
                className="rounded-xl sm:rounded-2xl shadow-xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-brand-navy py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Ready to explore the opportunity?
          </h2>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <LinkButton href="/contact" variant="secondary" size="lg" className="w-full sm:w-auto">
              Start the Conversation
            </LinkButton>
            <LinkButton
              href="/business-model"
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white/10 w-full sm:w-auto"
            >
              See the Business Model
            </LinkButton>
          </div>
        </div>
      </div>
    </div>
  );
}
