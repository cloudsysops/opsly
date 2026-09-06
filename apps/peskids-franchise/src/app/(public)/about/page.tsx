import { Metadata } from "next";
import Image from "next/image";
import { LinkButton } from "@/components/shared/Button";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Peskids Franchise and our mission to bring quality after-school enrichment to every child.",
  alternates: {
    canonical: "https://franchise.peskids.com/about",
  },
  openGraph: {
    url: "https://franchise.peskids.com/about",
  },
};

// TODO(content): replace with real Peskids leadership team names/bios/photos.
const team = [
  {
    name: "[Founder name]",
    role: "CEO",
    bio: "[Add a short bio for this leader.]",
    image: "/images/team/placeholder-1.png",
    bgColor: "bg-brand-green",
  },
  {
    name: "[Co-Founder name]",
    role: "Co-Founder",
    bio: "[Add a short bio for this leader.]",
    image: "/images/team/placeholder-2.png",
    bgColor: "bg-brand-yellow",
  },
  {
    name: "[Co-Founder name]",
    role: "Co-Founder",
    bio: "[Add a short bio for this leader.]",
    image: "/images/team/placeholder-3.png",
    bgColor: "bg-brand-purple",
  },
];

// TODO(content): replace with Peskids' real founding story and milestones.
const milestones = [
  {
    year: "[Year]",
    title: "[Milestone title]",
    event: "[Add a real milestone from Peskids' history here.]"
  },
  {
    year: "[Year]",
    title: "[Milestone title]",
    event: "[Add a real milestone from Peskids' history here.]"
  },
  {
    year: "2026",
    title: "Franchise Launch",
    event: "Peskids Franchise officially launched, bringing our proven after-school enrichment model to entrepreneurs."
  },
];

export default function AboutPage() {
  return (
    <div className="bg-white">
      {/* Hero with Video */}
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-brand-light to-white py-8 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-6 sm:mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-5xl">
              Our Story
            </h1>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-600">
              Peskids Franchise began with a simple idea: give every child access
              to a quality after-school program, close to home.
            </p>
          </div>

          {/* TODO(content): embed a real Peskids overview video here. */}
        </div>
      </div>

      {/* Our Story Section */}
      <div className="py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:gap-12 lg:grid-cols-2">
            {/* Left Column - Story Text */}
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-brand-green sm:text-5xl italic">
                Our Story
              </h2>
              <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6 text-base sm:text-lg leading-7 sm:leading-8 text-gray-600">
                <p>
                  Peskids has helped families give their children a safe, engaging
                  place to learn and grow after school.
                </p>
                {/* TODO(content): replace with Peskids' real founding story, locations served, and growth to date. */}
                <p>
                  Today, Peskids Franchise brings that same proven after-school
                  enrichment model to entrepreneurs who want to build a business
                  that makes a difference for families in their community.
                </p>
              </div>
            </div>

            {/* Right Column - Values */}
            <div className="space-y-6 sm:space-y-8">
              {/* Value 1 */}
              <div className="flex gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-brand-cyan/20 flex items-center justify-center">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-brand-navy">We Believe in Children.</h3>
                  <p className="mt-1 text-sm sm:text-base text-gray-600">
                    We never underestimate the power of a child&apos;s mind, imagination,
                    and capacity to learn.
                  </p>
                </div>
              </div>

              {/* Value 2 */}
              <div className="flex gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-brand-yellow/20 flex items-center justify-center">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-brand-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-brand-navy">Stories are Magic.</h3>
                  <p className="mt-1 text-sm sm:text-base text-gray-600">
                    Storytelling is an underrated tool in contemporary education,
                    despite being humanity&apos;s oldest method of transmitting knowledge.
                  </p>
                </div>
              </div>

              {/* Value 3 */}
              <div className="flex gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-brand-green/20 flex items-center justify-center">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-brand-navy">We Do Things Right.</h3>
                  <p className="mt-1 text-sm sm:text-base text-gray-600">
                    Having fun never comes at the expense of excellence.
                  </p>
                </div>
              </div>

              {/* Value 4 */}
              <div className="flex gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-brand-purple/20 flex items-center justify-center">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-brand-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-brand-navy">We Shake Hands Even When We Lose.</h3>
                  <p className="mt-1 text-sm sm:text-base text-gray-600">
                    Soft skills like emotional intelligence are just as important
                    as learning a game.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-brand-purple py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Our Journey
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-white/80">
              From a single tutor to a nationwide franchise opportunity
            </p>
          </div>
          <div className="mx-auto mt-8 sm:mt-10 max-w-4xl">
            <div className="space-y-6 sm:space-y-8">
              {milestones.map((milestone, index) => (
                <div key={index} className="flex gap-4 sm:gap-6">
                  <div className="flex flex-col items-center">
                    <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-white text-brand-navy font-bold text-sm sm:text-lg shadow-lg">
                      {milestone.year}
                    </div>
                    {index < milestones.length - 1 && (
                      <div className="flex-1 w-1 bg-white/30 my-2" />
                    )}
                  </div>
                  <div className="pb-6 sm:pb-8 pt-1 sm:pt-2">
                    <div className="text-lg sm:text-xl font-bold text-white">
                      {milestone.title}
                    </div>
                    <div className="mt-1 sm:mt-2 text-sm sm:text-base text-white/90 leading-relaxed">
                      {milestone.event}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="bg-brand-light py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-brand-orange sm:text-5xl">
              Meet the Team
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-600">
              At Peskids Franchise, we&apos;re more than just instructors—
              <span className="hidden sm:inline"><br /></span>
              we&apos;re educators and your child&apos;s biggest cheerleaders.
            </p>
          </div>
          <div className="mx-auto mt-8 sm:mt-10 grid max-w-5xl grid-cols-1 gap-6 sm:gap-8 sm:grid-cols-3">
            {team.map((member) => (
              <div
                key={member.name}
                className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
              >
                {/* Colored background with cartoon image */}
                <div className={`${member.bgColor} h-48 sm:h-64 relative`}>
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover object-top"
                  />
                </div>
                {/* Info */}
                <div className="p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-brand-navy">
                    {member.name}
                  </h3>
                  <p className="text-sm text-gray-500 italic">{member.role}</p>
                  <p className="mt-2 sm:mt-3 text-sm text-gray-600">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full width image */}
      {/* TODO(content): replace with a real Peskids photo. */}
      <div className="relative h-64 sm:h-96 overflow-hidden">
        <Image
          src="/images/kids/child-learning.png"
          alt="Child at a Peskids after-school program"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-brand-navy/60 flex items-center justify-center">
          <div className="text-center text-white px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-bold">Learn. Play. Grow.</h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-white/80">
              Join us in giving children a place to thrive after school.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-brand-navy py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Ready to join our story?
          </h2>
          <div className="mt-6">
            <LinkButton href="/contact" variant="secondary" size="lg" className="w-full sm:w-auto">
              Get Started
            </LinkButton>
          </div>
        </div>
      </div>
    </div>
  );
}
