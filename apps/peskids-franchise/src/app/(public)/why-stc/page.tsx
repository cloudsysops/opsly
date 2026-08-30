import { Metadata } from "next";
import Image from "next/image";
import { LinkButton } from "@/components/shared/Button";
import { TrackedDownloadLink } from "@/components/shared/TrackedDownloadLink";

export const metadata: Metadata = {
  title: "Why Acme Franchise",
  description:
    "Discover why Acme Franchise is the premier children's chess education franchise opportunity.",
  alternates: {
    canonical: "https://franchising.acmefranchise.com/why-stc",
  },
  openGraph: {
    url: "https://franchising.acmefranchise.com/why-stc",
  },
};

const differentiators = [
  {
    title: "Unique Curriculum",
    description:
      "Our story-based approach is unlike anything else in the market. Children learn through engaging characters and narratives, not dry instruction.",
    stats: "Ages 3-9",
    footnote: null,
  },
  {
    title: "Growing Industry",
    description:
      "The children's enrichment market is booming as parents seek activities that develop critical thinking skills.",
    stats: "Growing Market",
    footnote: "Based on industry research on children's enrichment programs",
  },
  {
    title: "Proven Results",
    description:
      "Children in our program show measurable improvements in problem-solving, focus, and academic performance.",
    stats: "Research-Backed",
    footnote: "See our Research Whitepaper for study citations",
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

export default function WhySTCPage() {
  return (
    <div className="bg-white">
      {/* Hero with Image */}
      <div className="relative isolate overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-16 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-brand-navy sm:text-5xl">
                Why Acme Franchise?
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
              <Image
                src="/images/kids/child-playing-chess.png"
                alt="Child learning chess"
                width={600}
                height={500}
                className="rounded-xl sm:rounded-2xl shadow-xl mx-auto"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Featured Partnership - Blippi */}
      <div className="bg-brand-light py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2 items-center">
            <Image
              src="/images/characters/team-illustration.svg"
              alt="Acme Franchise Partnership"
              width={500}
              height={400}
              className="mx-auto h-48 sm:h-64 w-auto object-contain"
            />
            <div className="text-center lg:text-left">
              <h2 className="text-xl sm:text-2xl font-bold text-brand-navy">
                Trusted by Industry Leaders
              </h2>
              <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600">
                Acme Franchise has partnered with Blippi, one of the world&apos;s
                most popular children&apos;s entertainment brands, bringing our
                curriculum to millions of families worldwide.
              </p>
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

      {/* The Chess Advantage */}
      <div className="bg-brand-navy py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center text-white">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight sm:text-4xl">
              The Chess Advantage
            </h2>
            <p className="mt-4 text-base sm:text-lg leading-7 sm:leading-8 text-brand-light/80 px-2 sm:px-0">
              Chess isn&apos;t just a game—it&apos;s a tool for developing young
              minds. Research shows chess education can improve:
            </p>
            <div className="mt-6 sm:mt-8 grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-4">
              {[
                { label: "Critical Thinking", value: "Enhanced" },
                { label: "Math Skills", value: "Improved" },
                { label: "Focus & Attention", value: "Better" },
                { label: "Problem Solving", value: "Stronger" },
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
            <p className="mt-6 text-xs text-brand-light/40">
              Based on published research on chess education. See our{" "}
              <TrackedDownloadLink
                href="/Story-Time-Chess-Research-Whitepaper.pdf"
                documentName="Acme Franchise Research Whitepaper"
                fileName="Story-Time-Chess-Research-Whitepaper.pdf"
                source="/why-stc"
                className="underline hover:text-brand-light/60"
              >
                Research Whitepaper
              </TrackedDownloadLink>{" "}
              for study citations.
            </p>
          </div>
        </div>
      </div>

      {/* Research Whitepaper Section */}
      <div className="py-10 sm:py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2 items-center">
            <div>
              <div className="inline-flex items-center rounded-full bg-brand-purple/10 px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-medium text-brand-purple mb-3 sm:mb-4">
                Research-Backed Approach
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
                The Science Behind Acme Franchise
              </h2>
              <p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-600">
                Our approach isn&apos;t just creative—it&apos;s backed by extensive research on how children learn best through gameplay and storytelling.
              </p>
              <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <span className="text-brand-green text-lg sm:text-xl">✓</span>
                  <div>
                    <p className="font-semibold text-brand-navy text-sm sm:text-base">19 Studies Reviewed</p>
                    <p className="text-xs sm:text-sm text-gray-600">Systematic review shows board games benefit early math skills</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 sm:gap-3">
                  <span className="text-brand-green text-lg sm:text-xl">✓</span>
                  <div>
                    <p className="font-semibold text-brand-navy text-sm sm:text-base">Early Learner Impact</p>
                    <p className="text-xs sm:text-sm text-gray-600">Chess has more significant impact on young children than older students</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 sm:gap-3">
                  <span className="text-brand-green text-lg sm:text-xl">✓</span>
                  <div>
                    <p className="font-semibold text-brand-navy text-sm sm:text-base">Executive Function Development</p>
                    <p className="text-xs sm:text-sm text-gray-600">Games build flexible thinking, working memory, and self-regulation</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 sm:mt-8">
                <TrackedDownloadLink
                  href="/Story-Time-Chess-Research-Whitepaper.pdf"
                  documentName="Acme Franchise Research Whitepaper"
                  fileName="Story-Time-Chess-Research-Whitepaper.pdf"
                  source="/why-stc"
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-navy px-4 sm:px-6 py-2.5 sm:py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-purple transition-colors w-full sm:w-auto justify-center"
                >
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download Research Whitepaper
                </TrackedDownloadLink>
                <p className="mt-2 text-[10px] sm:text-xs text-gray-500 text-center sm:text-left">
                  45-page PDF • Authored by Lee A. Scott, M.A. & Jennifer Jipson, Ph.D.
                </p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-brand-light to-brand-cyan/20 rounded-xl sm:rounded-2xl p-5 sm:p-8">
              <h3 className="text-lg sm:text-xl font-bold text-brand-navy mb-4 sm:mb-6">Key Research Highlights</h3>
              <div className="space-y-3 sm:space-y-4">
                <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
                  <p className="text-xs sm:text-sm text-gray-600">&ldquo;Children who frequently play board games perform better in math than those who play card or video games.&rdquo;</p>
                  <p className="text-[10px] sm:text-xs text-brand-purple mt-1.5 sm:mt-2">— Balladares et al., 2023</p>
                </div>
                <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
                  <p className="text-xs sm:text-sm text-gray-600">&ldquo;Chess is seen as having more significant impact on early learners than on older children.&rdquo;</p>
                  <p className="text-[10px] sm:text-xs text-brand-purple mt-1.5 sm:mt-2">— Chitiyo et al., 2023</p>
                </div>
                <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
                  <p className="text-xs sm:text-sm text-gray-600">&ldquo;Board games can be an effective tool in supporting positive mental health and fostering effective interpersonal interactions.&rdquo;</p>
                  <p className="text-[10px] sm:text-xs text-brand-purple mt-1.5 sm:mt-2">— Noda et al., 2019</p>
                </div>
              </div>
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
            alt="Acme Franchise Characters"
            width={800}
            height={150}
            className="mx-auto h-16 sm:h-24 w-auto"
          />
          <h3 className="mt-5 sm:mt-8 text-xl sm:text-2xl font-bold text-brand-navy">
            Meet Our Character Family
          </h3>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2 sm:px-0">
            Each chess piece comes to life as a memorable character with their own
            personality and special way of moving. Children learn through stories,
            not abstract rules.
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
                  Chess is experiencing a renaissance. Thanks to popular media and
                  growing awareness of cognitive benefits, more families than ever
                  want their children to learn chess.
                </p>
                <p>
                  But there&apos;s a problem: most chess instruction isn&apos;t
                  designed for young children. That&apos;s where Acme Franchise
                  comes in—and that&apos;s your opportunity.
                </p>
              </div>
            </div>
            <div className="order-first lg:order-last">
              <Image
                src="/images/kids/method-1.jpg"
                alt="Acme Franchise in action"
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
