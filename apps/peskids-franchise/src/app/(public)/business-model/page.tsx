import { Metadata } from "next";
import { LinkButton } from "@/components/shared/Button";

export const metadata: Metadata = {
  title: "Business Model",
  description:
    "Learn how the Acme Franchise business model works and what to expect as a franchisee.",
  alternates: {
    canonical: "https://franchising.acmefranchise.com/business-model",
  },
  openGraph: {
    url: "https://franchising.acmefranchise.com/business-model",
  },
};

const revenueStreams = [
  {
    title: "After-School Programs",
    description:
      "Partner with schools to offer after-school chess enrichment programs. High-volume, recurring revenue with minimal overhead.",
    icon: "🏫",
  },
  {
    title: "Private Lessons",
    description:
      "Premium one-on-one or small group instruction for families seeking personalized attention.",
    icon: "👨‍🏫",
  },
  {
    title: "Summer Camps",
    description:
      "Week-long intensive chess camps during school breaks. Great for building community and word-of-mouth.",
    icon: "☀️",
  },
  {
    title: "Birthday Parties",
    description:
      "Unique chess-themed birthday party experiences that parents love and kids remember.",
    icon: "🎂",
  },
  {
    title: "Library & Community Programs",
    description:
      "Partner with libraries and community centers to expand your reach and build brand awareness.",
    icon: "📚",
  },
  {
    title: "Tournament Hosting",
    description:
      "Organize local tournaments to engage your student community and attract new families.",
    icon: "🏆",
  },
];

export default function BusinessModelPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-brand-light to-white py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-5xl">
              How the Business Works
            </h1>
            <p className="mt-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-600">
              Our franchise model is designed with multiple revenue
              streams and a comprehensive operational framework.
            </p>
          </div>
        </div>
      </div>

      {/* Revenue Streams */}
      <div className="py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              Multiple Revenue Streams
            </h2>
            <p className="mt-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-600">
              Diversify your income with these established program types.
            </p>
          </div>
          <div className="mx-auto mt-8 sm:mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {revenueStreams.map((stream) => (
              <div
                key={stream.title}
                className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-5 sm:p-8 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">{stream.icon}</div>
                <h3 className="text-base sm:text-lg font-semibold text-brand-navy">
                  {stream.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-gray-600">
                  {stream.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Role of Franchisee */}
      <div className="py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              Your Role as a Franchisee
            </h2>
            <div className="mt-6 space-y-6">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-brand-navy">
                  Owner-Operator Model
                </h3>
                <p className="mt-2 text-sm sm:text-base text-gray-600">
                  Most franchisees start as the primary instructor, building
                  relationships with schools and families firsthand. As your
                  business grows, you can hire and train additional instructors.
                </p>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-brand-navy">
                  Key Responsibilities
                </h3>
                <ul className="mt-4 space-y-2 text-sm sm:text-base text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-brand-green flex-shrink-0">✓</span>
                    Building relationships with schools and community partners
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-green flex-shrink-0">✓</span>
                    Teaching classes using the Acme Franchise curriculum
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-green flex-shrink-0">✓</span>
                    Managing scheduling, billing, and parent communication
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-green flex-shrink-0">✓</span>
                    Local marketing and community engagement
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-green flex-shrink-0">✓</span>
                    Hiring and training staff as you scale
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-brand-navy">
                  What We Handle
                </h3>
                <ul className="mt-4 space-y-2 text-sm sm:text-base text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-brand-cyan flex-shrink-0">→</span>
                    Curriculum development and updates
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-cyan flex-shrink-0">→</span>
                    Brand marketing and national awareness
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-cyan flex-shrink-0">→</span>
                    Technology and operational systems
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-cyan flex-shrink-0">→</span>
                    Ongoing training and support
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-cyan flex-shrink-0">→</span>
                    Best practices and benchmarking
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-brand-navy py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Ready to learn more about the opportunity?
          </h2>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <LinkButton href="/investment" variant="secondary" size="lg" className="w-full sm:w-auto">
              See Investment Details
            </LinkButton>
            <LinkButton
              href="/contact"
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white/10 w-full sm:w-auto"
            >
              Contact Us
            </LinkButton>
          </div>
        </div>
      </div>
    </div>
  );
}
