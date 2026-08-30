import { Metadata } from "next";
import Image from "next/image";
import { LinkButton } from "@/components/shared/Button";

export const metadata: Metadata = {
  title: "Community Experiences",
  description:
    "Hear from Acme Franchise partners, school partners, and families about their experiences.",
  alternates: {
    canonical: "https://franchising.acmefranchise.com/testimonials",
  },
  openGraph: {
    url: "https://franchising.acmefranchise.com/testimonials",
  },
};

const celebrityTestimonials = [
  {
    quote:
      "Acme Franchise is a phenomenal teaching tool. My kids absolutely love learning chess through these stories!",
    author: "Jordan Ellis",
    role: "Denver, CO Parent",
    image: "https://i.pravatar.cc/300?img=53",
  },
  {
    quote:
      "This is how you teach kids chess. The stories make it so engaging that they don't even realize they're learning.",
    author: "Marcus Bennett",
    role: "Austin, TX Parent",
    image: "https://i.pravatar.cc/300?img=12",
  },
];

const franchiseeTestimonials = [
  {
    quote:
      "The curriculum is unlike anything else out there. Kids are engaged from the first lesson, and parents see real cognitive benefits. The support from the team has been exceptional.",
    author: "Raj Kapoor",
    role: "Franchise Partner",
    image: "https://i.pravatar.cc/300?img=68",
    highlight: "A dedicated franchise partner",
  },
  {
    quote:
      "I was looking for something that would let me be my own boss while making a real difference. Acme Franchise checked both boxes. The pre-work process really prepared me for success.",
    author: "Danielle Okafor",
    role: "Franchise Partner",
    image: "https://i.pravatar.cc/300?img=44",
    highlight: "From prospect to partner",
  },
];

const partnerTestimonials = [
  {
    quote:
      "Acme Franchise has been one of our most popular after-school programs. Parents love it, kids love it, and it practically runs itself. The instructors are professional and the communication is excellent.",
    author: "Principal",
    role: "Westside Elementary School",
    type: "School Partner",
  },
  {
    quote:
      "We've tried other enrichment programs, but nothing gets the engagement that chess does. And this curriculum makes it accessible even for our youngest students.",
    author: "Program Director",
    role: "Community Center",
    type: "Community Partner",
  },
  {
    quote:
      "The progress reports and parent communication are outstanding. We always know what our son is learning and how he's improving. He actually asks to practice chess at home!",
    author: "Sarah M.",
    role: "Parent",
    type: "Parent",
  },
];

const impactStats = [
  { label: "Students Taught", value: "50,000+" },
  { label: "Partner Schools", value: "600+" },
  { label: "Parent Satisfaction", value: "98%" },
  { label: "Student Retention", value: "85%" },
];

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
                their Acme Franchise experience.
              </p>
            </div>
            <Image
              src="/images/kids/tutor-student.jpg"
              alt="Acme Franchise in action"
              width={500}
              height={400}
              className="rounded-xl sm:rounded-2xl shadow-xl"
            />
          </div>
        </div>
      </div>

      {/* Impact Stats */}
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
            Figures represent Acme Franchise corporate programs and are not a representation of individual franchise performance. Based on 2024 parent survey results and internal program data.
          </p>
        </div>
      </div>

      {/* Celebrity Endorsements */}
      <div className="py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              Loved by Parents Everywhere
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-600">
              Including some famous ones.
            </p>
          </div>

          <div className="mx-auto mt-8 sm:mt-10 grid max-w-4xl gap-6 sm:gap-8 lg:grid-cols-2">
            {celebrityTestimonials.map((testimonial) => (
              <div
                key={testimonial.author}
                className="text-center"
              >
                <Image
                  src={testimonial.image}
                  alt={testimonial.author}
                  width={150}
                  height={150}
                  className="mx-auto h-24 w-24 sm:h-32 sm:w-32 rounded-full object-cover ring-4 ring-brand-purple/20"
                />
                <blockquote className="mt-4 sm:mt-6 text-base sm:text-lg text-gray-700">
                  &quot;{testimonial.quote}&quot;
                </blockquote>
                <div className="mt-3 sm:mt-4">
                  <div className="font-semibold text-brand-navy">
                    {testimonial.author}
                  </div>
                  <div className="text-sm text-gray-600">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Franchisee Stories */}
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

      {/* Video Section */}
      <div className="py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              See It In Action
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-600">
              Watch our instructors bringing chess to life.
            </p>
          </div>

          <div className="mx-auto mt-6 sm:mt-8 max-w-3xl">
            <video
              controls
              className="w-full rounded-xl sm:rounded-2xl shadow-xl"
              poster="/images/kids/child-playing-chess.png"
            >
              <source src="/videos/hero-video.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </div>

      {/* Partner & Parent Testimonials */}
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
