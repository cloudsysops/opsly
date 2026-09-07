import { Metadata } from "next";
import { Hero } from "@/components/marketing/Hero";
import { Features } from "@/components/marketing/Features";
import { TestimonialCarousel } from "@/components/marketing/TestimonialCarousel";
import { LinkButton } from "@/components/shared/Button";

export const metadata: Metadata = {
  title: "Own a Peskids Franchise",
  description:
    "Build a rewarding business bringing after-school enrichment to young children. Peskids Franchise combines education and play with a structured franchise model. Explore available territories today.",
  alternates: {
    canonical: "https://franchise.peskids.com",
  },
  openGraph: {
    url: "https://franchise.peskids.com",
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
              Join the Peskids Franchise family and build a business that
              transforms children&apos;s lives after school.
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
