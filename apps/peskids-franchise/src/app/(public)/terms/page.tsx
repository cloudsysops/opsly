import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Terms of Use for the Acme Franchise Franchising website.",
  alternates: {
    canonical: "https://franchising.acmefranchise.com/terms",
  },
};

export default function TermsOfUsePage() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
          Terms of Use
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Last updated: March 10, 2026
        </p>

        <div className="mt-8 space-y-8 text-sm sm:text-base text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing and using this website (franchising.acmefranchise.com), you accept
              and agree to be bound by these Terms of Use. If you do not agree to these terms,
              please do not use this website.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              2. Franchise Disclosure Notice
            </h2>
            <div className="bg-brand-light rounded-xl p-4 border border-brand-cyan/20">
              <p className="font-medium text-brand-navy mb-2">Important Legal Notice</p>
              <p>
                This website and the information contained herein do not constitute the offer
                or sale of a franchise. The offer of a franchise can only be made through the
                delivery of a Franchise Disclosure Document (FDD). Certain states require that
                we register the FDD before we offer or sell franchises in those states. We will
                not offer or sell franchises in those states until we have registered the franchise
                (or obtained an applicable exemption) and delivered the FDD to the prospective
                franchisee in compliance with applicable law.
              </p>
              <p className="mt-3">
                Currently, the following states regulate the offer and sale of franchises:
                California, Hawaii, Illinois, Indiana, Maryland, Michigan, Minnesota, New York,
                North Dakota, Rhode Island, South Dakota, Virginia, Washington, and Wisconsin.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              3. No Financial Performance Representations
            </h2>
            <p>
              Unless expressly stated in Item 19 of our Franchise Disclosure Document, we do
              not make any representations about a franchisee&apos;s future financial performance
              or the past financial performance of company-owned or franchised outlets. All
              information on this website, including testimonials, statistics, and descriptions
              of the business model, should not be interpreted as a representation or guarantee
              of financial results.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              4. Informational Purposes Only
            </h2>
            <p>
              The content on this website is provided for informational purposes only. While
              we strive to ensure the accuracy of the information presented, we make no
              warranties or representations regarding its completeness or accuracy. In the
              event of any conflict between the information on this website and the information
              in our FDD, the FDD shall control.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              5. Intellectual Property
            </h2>
            <p>
              All content on this website, including text, graphics, logos, images, and
              software, is the property of Acme Franchise Franchising LLC or its licensors
              and is protected by copyright and trademark laws. You may not reproduce,
              distribute, or create derivative works from this content without our prior
              written consent.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              6. User Submissions
            </h2>
            <p>
              By submitting information through our contact forms, chat features, or other
              communication channels, you grant us the right to use that information for the
              purpose of evaluating and communicating with you about franchise opportunities.
              We will handle your information in accordance with our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              7. AI Chat Assistant
            </h2>
            <p>
              Our website includes an AI-powered chat assistant. The information provided by
              the chat assistant is for general informational purposes only and should not be
              relied upon as legal, financial, or professional advice. The chat assistant
              cannot make franchise offers, provide financial performance representations, or
              bind Acme Franchise Franchising LLC to any commitment.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              8. Third-Party Links
            </h2>
            <p>
              This website may contain links to third-party websites (such as financing
              partners). We are not responsible for the content, privacy practices, or
              availability of these external sites. Links to third-party sites do not
              constitute an endorsement of their content.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              9. Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by law, Acme Franchise Franchising LLC shall
              not be liable for any indirect, incidental, special, or consequential damages
              arising out of or in connection with your use of this website. Our total liability
              shall not exceed the amount you paid to access the website (which is zero).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              10. Governing Law
            </h2>
            <p>
              These Terms of Use shall be governed by and construed in accordance with the
              laws of the State of Tennessee, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              11. Changes to Terms
            </h2>
            <p>
              We reserve the right to modify these Terms of Use at any time. Changes will be
              effective immediately upon posting to this website. Your continued use of the
              website after changes are posted constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              12. Contact
            </h2>
            <p>
              Questions about these Terms of Use should be directed to:
            </p>
            <div className="mt-3 bg-brand-light rounded-xl p-4">
              <p className="font-medium text-brand-navy">Acme Franchise Franchising LLC</p>
              <p>Westside, TN</p>
              <p>
                <a href="mailto:franchising@acmefranchise.com" className="text-brand-purple hover:underline">
                  franchising@acmefranchise.com
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
