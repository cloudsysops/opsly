import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Acme Franchise Franchising — how we collect, use, and protect your personal information.",
  alternates: {
    canonical: "https://franchising.acmefranchise.com/privacy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Last updated: March 10, 2026
        </p>

        <div className="mt-8 space-y-8 text-sm sm:text-base text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              1. Introduction
            </h2>
            <p>
              Acme Franchise Franchising LLC (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates
              the website at franchising.acmefranchise.com. This Privacy Policy describes how we
              collect, use, disclose, and protect your personal information when you visit our
              website or interact with our franchise inquiry process.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              2. Information We Collect
            </h2>
            <p className="mb-3">We collect information that you provide directly to us, including:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Name, email address, phone number, and mailing address</li>
              <li>Preferred franchise territory location</li>
              <li>Information about your interest level and financial qualifications</li>
              <li>Background information you share about yourself</li>
              <li>Referral source information</li>
              <li>Communications you send to us via email, chat, or forms</li>
            </ul>
            <p className="mt-3 mb-3">We also automatically collect certain information when you visit our website:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Browser type, operating system, and device information</li>
              <li>IP address and approximate geographic location</li>
              <li>Pages visited, time spent, and navigation patterns</li>
              <li>Referring website or source</li>
              <li>UTM parameters and campaign attribution data</li>
              <li>Session identifiers and visitor tracking cookies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              3. How We Use Your Information
            </h2>
            <p className="mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Respond to your franchise inquiries and provide requested information</li>
              <li>Evaluate your candidacy for a franchise opportunity</li>
              <li>Communicate with you about the franchise process</li>
              <li>Send you relevant information about Acme Franchise franchising</li>
              <li>Improve our website, services, and user experience</li>
              <li>Analyze website traffic and marketing effectiveness</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              4. Information Sharing
            </h2>
            <p className="mb-3">
              We do not sell your personal information to third parties. We may share your
              information with:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Service providers who assist with our website operations, email delivery,
                and business tools (e.g., Postmark for email, Stripe for payment processing)</li>
              <li>Professional advisors such as attorneys and accountants as needed</li>
              <li>Financing partners (such as Benetrends Financial) only with your explicit consent</li>
              <li>Law enforcement or government agencies when required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              5. Cookies and Tracking
            </h2>
            <p>
              Our website uses cookies and similar tracking technologies to enhance your browsing
              experience, analyze site traffic, and understand visitor behavior. These include
              session cookies (which expire when you close your browser) and persistent cookies
              (which remain on your device). You can control cookie settings through your browser
              preferences.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              6. AI Chat Assistant
            </h2>
            <p>
              Our website features an AI-powered chat assistant (&quot;Earl&quot;). Conversations with
              Earl are stored to improve our services and may be reviewed by our team.
              Earl does not collect additional personal information beyond what you voluntarily
              share in the conversation. Earl cannot provide financial performance representations
              or earnings projections.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              7. Data Security
            </h2>
            <p>
              We implement reasonable administrative, technical, and physical safeguards to
              protect your personal information. However, no method of electronic transmission
              or storage is completely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              8. Your Rights
            </h2>
            <p className="mb-3">Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your personal information</li>
              <li>Opt out of marketing communications</li>
              <li>Request a copy of your data in a portable format</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:franchising@acmefranchise.com" className="text-brand-purple hover:underline">
                franchising@acmefranchise.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              9. California Privacy Rights
            </h2>
            <p>
              If you are a California resident, you have additional rights under the California
              Consumer Privacy Act (CCPA), including the right to know what personal information
              we collect, the right to request deletion, and the right to opt out of the sale of
              personal information. We do not sell personal information. To submit a request,
              contact us at the email address above.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              10. Children&apos;s Privacy
            </h2>
            <p>
              This website is directed at prospective franchise owners and is not intended for
              use by children under 13. We do not knowingly collect personal information from
              children under 13 through this website.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              11. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of
              material changes by posting the updated policy on this page with a revised
              &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-brand-navy mb-3">
              12. Contact Us
            </h2>
            <p>
              If you have questions about this Privacy Policy, contact us at:
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
