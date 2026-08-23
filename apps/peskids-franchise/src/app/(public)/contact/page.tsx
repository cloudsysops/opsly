import { Metadata } from "next";
import { ContactForm } from "@/components/marketing/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch to learn more about the Acme Franchise opportunity.",
  alternates: {
    canonical: "https://franchising.acmefranchise.com/contact",
  },
  openGraph: {
    url: "https://franchising.acmefranchise.com/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-brand-light to-white py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-5xl">
              Start Your Journey
            </h1>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-600">
              Ready to explore the Acme Franchise opportunity? Fill
              out the form below and we&apos;ll be in touch within 24-48 hours.
            </p>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 sm:gap-12 lg:grid-cols-2">
            {/* Form */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-brand-navy mb-4 sm:mb-6">
                Franchise Inquiry Form
              </h2>
              <ContactForm />
            </div>

            {/* Info */}
            <div className="lg:pl-8">
              <h2 className="text-xl sm:text-2xl font-bold text-brand-navy mb-4 sm:mb-6">
                What Happens Next?
              </h2>

              <div className="space-y-4 sm:space-y-6">
                <div className="flex gap-3 sm:gap-4">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-brand-cyan/20 rounded-full flex items-center justify-center">
                    <span className="font-bold text-brand-navy text-sm sm:text-base">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-navy text-sm sm:text-base">
                      We Review Your Inquiry
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-gray-600">
                      Our franchise team reviews your submission and prepares
                      for an initial conversation.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 sm:gap-4">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-brand-cyan/20 rounded-full flex items-center justify-center">
                    <span className="font-bold text-brand-navy text-sm sm:text-base">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-navy text-sm sm:text-base">
                      Discovery Call
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-gray-600">
                      We&apos;ll schedule a 30-minute call to learn more about
                      you and answer your questions.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 sm:gap-4">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-brand-cyan/20 rounded-full flex items-center justify-center">
                    <span className="font-bold text-brand-navy text-sm sm:text-base">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-navy text-sm sm:text-base">
                      FDD & Pre-Work
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-gray-600">
                      If it&apos;s a good fit, you&apos;ll receive our Franchise
                      Disclosure Document and begin the pre-work phase.
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="mt-8 sm:mt-12 p-4 sm:p-6 bg-brand-light rounded-xl sm:rounded-2xl">
                <h3 className="font-semibold text-brand-navy mb-3 sm:mb-4 text-sm sm:text-base">
                  Other Ways to Reach Us
                </h3>
                <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                  <div className="flex items-center gap-3">
                    <svg
                      className="h-5 w-5 text-brand-purple"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      />
                    </svg>
                    <a
                      href="mailto:franchising@acmefranchise.com"
                      className="text-brand-navy hover:text-brand-purple"
                    >
                      franchising@acmefranchise.com
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg
                      className="h-5 w-5 text-brand-purple"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                      />
                    </svg>
                    <span className="text-gray-600">Westside, TN</span>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <p className="mt-6 sm:mt-8 text-[10px] sm:text-xs text-gray-500">
                This website is not a franchise offering. A franchise offering
                can be made by us only in a state if we are first registered,
                excluded, exempted or otherwise qualified to offer franchises in
                that state, and only if we provide you with an appropriate
                franchise disclosure document.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
