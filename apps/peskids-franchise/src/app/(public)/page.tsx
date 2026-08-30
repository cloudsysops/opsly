import { Metadata } from "next";
import { Hero } from "@/components/marketing/Hero";
import { Features } from "@/components/marketing/Features";
import { TestimonialCarousel } from "@/components/marketing/TestimonialCarousel";
import { LinkButton } from "@/components/shared/Button";

export const metadata: Metadata = {
  title: "Own an Acme Franchise",
  description:
    "Build a rewarding business teaching chess to young children. Acme Franchise combines education and play with a structured franchise model. Explore available territories today.",
  alternates: {
    canonical: "https://franchising.acmefranchise.com",
  },
  openGraph: {
    url: "https://franchising.acmefranchise.com",
  },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <TestimonialCarousel />

      {/* CTA Section */}
      <div className="bg-brand-navy py-12 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to Make a Difference?
            </h2>
            <p className="mx-auto mt-4 sm:mt-6 max-w-xl text-base sm:text-lg leading-7 sm:leading-8 text-brand-light/80 px-2 sm:px-0">
              Join the Acme Franchise family and build a business that
              transforms children&apos;s lives through the magic of chess.
            </p>
            <div className="mt-6 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-x-6">
              <LinkButton
                href="/contact"
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
              >
                Start Your Journey
              </LinkButton>
              <LinkButton
                href="/steps"
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white/10 w-full sm:w-auto"
              >
                See the Process
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
