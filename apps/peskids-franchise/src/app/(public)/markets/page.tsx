import { Metadata } from "next";
import { LinkButton } from "@/components/shared/Button";
import { StateAvailabilityMap } from "@/components/marketing/StateAvailabilityMap";

export const metadata: Metadata = {
  title: "Available Markets",
  description:
    "Explore available Peskids Franchise territories across the country. See which states are open for franchising.",
  alternates: {
    canonical: "https://franchise.peskids.com/markets",
  },
  openGraph: {
    url: "https://franchise.peskids.com/markets",
  },
};

export default function MarketsPage() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-navy via-brand-purple to-brand-navy">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-cyan/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-purple/30 rounded-full blur-3xl" />
          {/* Decorative pattern overlay */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-20 lg:py-28 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 mb-6 sm:mb-8">
              <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
              <span className="text-xs sm:text-sm font-medium text-white/90">36 States Available</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
              Find Your
              <span className="block mt-2 bg-gradient-to-r from-brand-cyan via-brand-light to-brand-cyan bg-clip-text text-transparent">
                Perfect Territory
              </span>
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-xl leading-7 sm:leading-8 text-white/80 max-w-2xl mx-auto">
              Peskids Franchise is actively expanding across the United States.
              Click on your state to check availability and start your franchise journey.
            </p>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#F9FAFB"/>
          </svg>
        </div>
      </div>

      {/* Map Section */}
      <div className="bg-gray-50 pt-4 pb-12 sm:pt-8 sm:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-6 sm:mb-12">
            <h2 className="text-2xl font-bold text-brand-navy sm:text-4xl">
              State Licensing Map
            </h2>
          </div>

          <StateAvailabilityMap />
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white pt-8 pb-12 sm:pt-12 sm:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-6 sm:mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              How Territories Work
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-600">
              We&apos;re committed to your success with protected territories and growth opportunities.
            </p>
          </div>

          <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
            {/* Flip Card 1 - Exclusive Rights */}
            <div className="group h-72 sm:h-80 [perspective:1000px]">
              <div className="relative h-full w-full transition-all duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                {/* Front */}
                <div className="absolute inset-0 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-lg border border-gray-100 [backface-visibility:hidden] flex flex-col items-center text-center">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center mb-4 sm:mb-6">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-brand-navy mb-2 sm:mb-3">Exclusive Rights</h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    Each franchisee receives exclusive rights to operate in their defined territory.
                    No other Peskids Franchisee can offer programs in your area.
                  </p>
                </div>
                {/* Back */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan to-brand-purple rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">What&apos;s Protected</h3>
                  <ul className="text-white/90 space-y-2 sm:space-y-3 text-xs sm:text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-white mt-0.5">✓</span>
                      <span>Defined by zip codes or geographic boundaries</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white mt-0.5">✓</span>
                      <span>Exclusive rights to schools, libraries, and community centers in your zone</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white mt-0.5">✓</span>
                      <span>No competing franchisees in your territory</span>
                    </li>
                  </ul>
                  <p className="text-white/80 text-xs sm:text-sm mt-4 sm:mt-6 italic">Territory rights and protections are as described in the Franchise Disclosure Document.</p>
                </div>
              </div>
            </div>

            {/* Flip Card 2 - Ideal Markets */}
            <div className="group h-72 sm:h-80 [perspective:1000px]">
              <div className="relative h-full w-full transition-all duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                {/* Front */}
                <div className="absolute inset-0 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-lg border border-gray-100 [backface-visibility:hidden] flex flex-col items-center text-center">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-brand-green to-brand-cyan flex items-center justify-center mb-4 sm:mb-6">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-brand-navy mb-2 sm:mb-3">Ideal Markets</h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    We target thriving family communities where demand for enrichment programs is high.
                    Our data-driven approach helps you find the perfect territory.
                  </p>
                </div>
                {/* Back */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-green to-brand-cyan rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">What We Look For</h3>
                  <ul className="text-white/90 space-y-2 sm:space-y-3 text-xs sm:text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-white mt-0.5">✓</span>
                      <span>Metro areas with 350K–500K population</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white mt-0.5">✓</span>
                      <span>At least 10% children ages 0–9</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white mt-0.5">✓</span>
                      <span>Above-average household income</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white mt-0.5">✓</span>
                      <span>Strong school and library density</span>
                    </li>
                  </ul>
                  <p className="text-white/80 text-xs sm:text-sm mt-3 sm:mt-4 italic">We&apos;ll analyze your preferred area together.</p>
                </div>
              </div>
            </div>

            {/* Flip Card 3 - Growth Opportunities */}
            <div className="group h-72 sm:h-80 [perspective:1000px]">
              <div className="relative h-full w-full transition-all duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                {/* Front */}
                <div className="absolute inset-0 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-lg border border-gray-100 [backface-visibility:hidden] flex flex-col items-center text-center">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-brand-yellow to-brand-orange flex items-center justify-center mb-4 sm:mb-6">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-brand-navy mb-2 sm:mb-3">Growth Opportunities</h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    High-performing franchisees may expand into adjacent territories or develop
                    multi-unit operations as you grow your business.
                  </p>
                </div>
                {/* Back */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-yellow to-brand-orange rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">How Expansion Works</h3>
                  <ul className="text-white/90 space-y-2 sm:space-y-3 text-xs sm:text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-white mt-0.5">✓</span>
                      <span>First right of refusal on adjacent territories</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white mt-0.5">✓</span>
                      <span>Multi-unit discounts available</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white mt-0.5">✓</span>
                      <span>Typical expansion timeline: 12–18 months</span>
                    </li>
                  </ul>
                  <p className="text-white/80 text-xs sm:text-sm mt-4 sm:mt-6 italic">Expansion opportunities are subject to availability and FDD terms.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-navy via-brand-purple to-brand-navy py-16 sm:py-24 lg:py-32">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-cyan/10 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-4xl">
              Don&apos;t See Your State?
            </h2>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-white/80">
              We&apos;re actively working to expand our licensing to additional states.
              Contact us to express your interest and be the first to know when we expand to your area.
            </p>
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <LinkButton href="/contact" variant="secondary" size="lg" className="w-full sm:w-auto">
                Contact Us Today
              </LinkButton>
              <LinkButton
                href="/steps"
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-white text-white hover:bg-white/10"
              >
                Learn the Process
              </LinkButton>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
