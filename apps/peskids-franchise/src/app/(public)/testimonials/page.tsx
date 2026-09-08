import { Metadata } from "next";
import Image from "next/image";
import { LinkButton } from "@/components/shared/Button";

export const metadata: Metadata = {
  title: "Community Experiences",
  description:
    "Hear from Peskids Franchise partners, school partners, and families about their experiences.",
  alternates: {
    canonical: "https://franchise.peskids.com/testimonials",
  },
  openGraph: {
    url: "https://franchise.peskids.com/testimonials",
  },
};

// TODO(content): every array below needs real, consented testimonials/stats
// from real Peskids partners and families before this page goes live. Do not
// publish fabricated quotes, stock avatar photos attributed to named people,
// or invented survey/usage figures - that's a real legal risk (FTC
// endorsement rules, false advertising), not just a copy issue. A "Celebrity
// Endorsements" section especially must never be fabricated.
type Testimonial = { quote: string; author: string; role: string; image: string };
type PartnerTestimonial = { quote: string; author: string; role: string; type: string };

const franchiseeTestimonials: Array<Testimonial & { highlight: string }> = [];

const partnerTestimonials: PartnerTestimonial[] = [];

const impactStats: Array<{ label: string; value: string }> = [];

export default function TestimonialsPage() {
  return (
    <div className="bg-white">
      {/* Hero with action image */}
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-brand-light to-white py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2 items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-5xl">
                Hear From Our Community
              </h1>
              <p className="mt-4 sm:mt-6 text-base sm:text-lg leading-7 sm:leading-8 text-gray-600">
                Hear from our franchisees, school partners, and families about
                their Peskids Franchise experience.
              </p>
            </div>
            <Image
              src="/images/kids/tutor-student.jpg"
              alt="Peskids Franchise in action"
              width={500}
              height={400}
              className="rounded-xl sm:rounded-2xl shadow-xl"
            />
          </div>
        </div>
      </div>

      {/* Impact Stats */}
      {impactStats.length > 0 && (
        <div className="bg-brand-navy py-10 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-4 sm:gap-8 sm:grid-cols-4">
              {impactStats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-brand-cyan">
                    {stat.value}
                  </div>
                  <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-white/80">{stat.label}</div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-white/50">
              Figures represent Peskids Franchise corporate programs and are not a representation of individual franchise performance.
            </p>
          </div>
        </div>
      )}

      {/* Franchisee Stories */}
      {franchiseeTestimonials.length > 0 && (
        <div className="bg-brand-light py-10 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-4xl">
                From Our Franchise Partners
              </h2>
              <p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-600">
                Hear directly from partners about their experience. Individual results may vary.
              </p>
            </div>

            <div className="mx-auto mt-8 sm:mt-10 grid max-w-4xl gap-4 sm:gap-6 lg:grid-cols-2">
              {franchiseeTestimonials.map((testimonial) => (
                <div
                  key={testimonial.author}
                  className="rounded-xl sm:rounded-2xl bg-white p-5 sm:p-8 shadow-sm"
                >
                  <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.author}
                      width={80}
                      height={80}
                      className="h-12 w-12 sm:h-16 sm:w-16 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-semibold text-brand-navy text-sm sm:text-base">
                        {testimonial.author}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-brand-purple mb-3 sm:mb-4">
                    {testimonial.highlight}
                  </div>
                  <blockquote className="text-sm sm:text-base text-gray-700">
                    &quot;{testimonial.quote}&quot;
                  </blockquote>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Video Section */}
      {/* TODO(content): replace with a real Peskids overview video/poster image. */}
      <div className="py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              See It In Action
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-600">
              Watch our program come to life.
            </p>
          </div>

          <div className="mx-auto mt-6 sm:mt-8 max-w-3xl">
            <video
              controls
              className="w-full rounded-xl sm:rounded-2xl shadow-xl"
              poster="/images/kids/child-learning.png"
            >
              <source src="/videos/hero-video.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </div>

      {/* Partner & Parent Testimonials */}
      {partnerTestimonials.length > 0 && (
        <div className="bg-gray-50 py-10 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-4xl">
                From Our Partners & Families
              </h2>
              <p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-600">
                Schools, community centers, and parents share their experiences.
              </p>
            </div>

            <div className="mx-auto mt-8 sm:mt-10 grid max-w-5xl gap-4 sm:gap-6 lg:grid-cols-3">
              {partnerTestimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm"
                >
                  <div className="text-xs font-semibold text-brand-purple uppercase tracking-wide mb-3 sm:mb-4">
                    {testimonial.type}
                  </div>
                  <blockquote className="text-sm sm:text-base text-gray-700">
                    &quot;{testimonial.quote}&quot;
                  </blockquote>
                  <div className="mt-4 sm:mt-6">
                    <div className="font-semibold text-brand-navy text-sm sm:text-base">
                      {testimonial.author}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="bg-brand-navy py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Ready to start your journey?
          </h2>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <LinkButton href="/contact" variant="secondary" size="lg" className="w-full sm:w-auto">
              Start Your Journey
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
