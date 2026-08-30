import { Metadata } from "next";
import Image from "next/image";
import { LinkButton } from "@/components/shared/Button";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Acme Franchise and our mission to transform children's education through the magic of chess.",
  alternates: {
    canonical: "https://franchising.acmefranchise.com/about",
  },
  openGraph: {
    url: "https://franchising.acmefranchise.com/about",
  },
};

const team = [
  {
    name: "Paul Levy",
    role: "CEO",
    bio: "Leading Acme Franchise with a vision to bring chess education to every child.",
    image: "/images/team/paul-levy.png",
    bgColor: "bg-brand-green",
  },
  {
    name: "Jon Sieber",
    role: "Co-Founder",
    bio: "Passionate about his family, his business, and his bicycle.",
    image: "/images/team/jon-sieber.png",
    bgColor: "bg-brand-yellow",
  },
  {
    name: "Sam Williams",
    role: "Co-Founder",
    bio: "Chess enthusiast, storyteller, co-founder — in that order.",
    image: "/images/team/harlan-alford.png",
    bgColor: "bg-brand-purple",
  },
];

const milestones = [
  {
    year: "2011",
    title: "The Beginning",
    event: "Founded as Chess at Three in New York City. What started as a single tutor with a dream became a movement to make chess accessible to young children through storytelling."
  },
  {
    year: "2015",
    title: "Growing Roots",
    event: "Expanded from private tutoring into school partnerships. Our story-based curriculum proved so effective that schools began requesting dedicated programs."
  },
  {
    year: "2020",
    title: "Scaling Impact",
    event: "Reached 400+ tutors and 50,000 students. Partnered with over 600 schools nationwide, demonstrating the model could scale while maintaining quality."
  },
  {
    year: "2023",
    title: "A New Chapter",
    event: "Rebranded to Acme Franchise to reflect our expanded curriculum and vision. Began developing the franchise model to bring our system to entrepreneurs nationwide."
  },
  {
    year: "2025",
    title: "Franchise Launch",
    event: "Acme Franchise Franchising officially launched. Welcomed our first franchise partners in Westside and Eastside, marking the start of nationwide expansion."
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
              Acme Franchise began with a simple idea: what if we could teach
              chess to children as young as 3 years old using the power of
              storytelling?
            </p>
          </div>

          {/* Vimeo Video Embed */}
          <div className="mx-auto max-w-4xl">
            <div className="relative aspect-video rounded-xl sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl">
              <iframe
                src="https://player.vimeo.com/video/1142207977?h=0&title=0&byline=0&portrait=0"
                className="absolute inset-0 w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title="Acme Franchise Overview Video"
              />
            </div>
          </div>
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
                  Since 2011, Acme Franchise has made it possible for young kids
                  to master tricky subjects like chess, all through the power of
                  storytelling.
                </p>
                <p>
                  Founded and headquartered in New York City, Acme Franchise&apos;s
                  team of 400+ tutors has taught over 50,000 students to date and partnered
                  with more than 600 schools across the U.S.
                </p>
                <p>
                  Today, Acme Franchise offers a range of programs, all based on
                  the unifying principle that children can learn anything through
                  fun, well-crafted stories. In Singapore, these include chess for
                  ages three and up, playgroups for infants as young as six months
                  old, and role-playing games for children of school-going age.
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
                  <h3 className="text-base sm:text-lg font-bold text-brand-navy">We Set Up the Board Correctly.</h3>
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
              At Acme Franchise, we&apos;re more than just chess tutors—
              <span className="hidden sm:inline"><br /></span>
              we&apos;re storytellers, educators, and your child&apos;s biggest cheerleaders.
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
      <div className="relative h-64 sm:h-96 overflow-hidden">
        <Image
          src="/images/kids/child-playing-chess.png"
          alt="Child learning chess"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-brand-navy/60 flex items-center justify-center">
          <div className="text-center text-white px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-bold">Read a Story. Learn Chess.</h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-white/80">
              Join us in transforming children&apos;s education through the magic of chess.
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
