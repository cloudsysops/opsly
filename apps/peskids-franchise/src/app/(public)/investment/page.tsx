import { Metadata } from "next";
import { LinkButton } from "@/components/shared/Button";

// TODO(content): every figure on this page must come from Peskids' own real
// Franchise Disclosure Document (Items 5, 6, 7) before this goes live. These
// were previously copied verbatim from an unrelated real company's actual
// FDD - do not invent replacement numbers; leave as placeholders until real
// figures are supplied.

export const metadata: Metadata = {
  title: "Cost & Investment",
  description:
    "Understand the investment required to own a Peskids Franchise.",
  alternates: {
    canonical: "https://franchise.peskids.com/investment",
  },
  openGraph: {
    url: "https://franchise.peskids.com/investment",
  },
};

const investmentComponents = [
  {
    item: "Initial Franchise Fee",
    description: "One-time fee for territory rights and initial training (non-refundable)",
    range: "[Add real figure]",
  },
  {
    item: "Equipment Fee",
    description: "Materials, classroom equipment, and marketing materials",
    range: "[Add real figure]",
  },
  {
    item: "Opening Advertising Campaign",
    description: "Initial marketing to promote the opening of your franchise",
    range: "[Add real figure]",
  },
  {
    item: "Additional Funds (3 months)",
    description: "Working capital for initial operating expenses",
    range: "[Add real figure]",
  },
  {
    item: "Other Costs",
    description: "Insurance, licenses, professional fees, and miscellaneous expenses",
    range: "[Add real figure]",
  },
];

const ongoingFees = [
  {
    fee: "Royalty Fee",
    amount: "[Add real %]",
    description: "Ongoing fee for support, training, and brand usage",
  },
  {
    fee: "Brand Fund Contribution",
    amount: "[Add real %]",
    description: "Contribution to national marketing and brand development",
  },
  {
    fee: "Local Advertising",
    amount: "[Add real figure]",
    description: "Required minimum monthly spend on local marketing",
  },
  {
    fee: "Software & Applications",
    amount: "[Add real figure]",
    description: "Required third-party software and applications",
  },
];

const qualifications = [
  "[Add real net worth requirement]",
  "[Add real liquid capital requirement]",
  "Passion for children's education and development",
  "Strong communication and relationship-building skills",
  "Willingness to follow the franchise system",
  "Background check clearance for working with children",
];

export default function InvestmentPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-brand-light to-white py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-5xl">
              Investment Overview
            </h1>
            <p className="mt-3 text-base sm:text-lg leading-7 sm:leading-8 text-gray-600">
              Transparent information about the costs and qualifications for
              owning a Peskids Franchise.
            </p>
          </div>
        </div>
      </div>

      {/* Initial Investment */}
      <div className="py-6 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              Initial Investment
            </h2>
            <p className="mt-4 text-base sm:text-lg text-gray-600">
              The total investment necessary to begin operation of a Peskids Franchise is{" "}
              <span className="font-bold text-brand-navy">
                [Add real total range]
              </span>
              . This includes the initial franchise fee.
            </p>

            {/* Mobile Cards View */}
            <div className="mt-6 sm:hidden space-y-3">
              {investmentComponents.map((component) => (
                <div key={component.item} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="font-medium text-brand-navy text-sm">
                      {component.item}
                    </div>
                    <div className="font-medium text-brand-purple text-sm whitespace-nowrap">
                      {component.range}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {component.description}
                  </div>
                </div>
              ))}
              <div className="bg-brand-navy text-white rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <div className="font-semibold text-sm">Total Estimated</div>
                  <div className="font-bold">[Add real total range]</div>
                </div>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="mt-8 overflow-hidden rounded-2xl border border-gray-100 hidden sm:block">
              <table className="w-full">
                <thead className="bg-brand-light">
                  <tr>
                    <th className="px-4 lg:px-6 py-4 text-left text-sm font-semibold text-brand-navy">
                      Investment Component
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-right text-sm font-semibold text-brand-navy">
                      Estimated Range
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {investmentComponents.map((component) => (
                    <tr key={component.item}>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="font-medium text-brand-navy">
                          {component.item}
                        </div>
                        <div className="text-sm text-gray-500">
                          {component.description}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-right font-medium text-brand-navy whitespace-nowrap">
                        {component.range}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-brand-navy text-white">
                  <tr>
                    <td className="px-4 lg:px-6 py-4 font-semibold">
                      Total Estimated Investment
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-right font-bold">
                      [Add real total range]
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="mt-4 text-xs sm:text-sm text-gray-500">
              * These figures are estimates based on our Franchise Disclosure Document. Actual costs may vary based on your
              specific situation. See Item 7 of the FDD for initial investment details and Items 5 and 6 for ongoing fee details.
            </p>
          </div>
        </div>
      </div>

      {/* Ongoing Fees */}
      <div className="bg-brand-light py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              Ongoing Fees
            </h2>
            <p className="mt-4 text-base sm:text-lg text-gray-600">
              Monthly and ongoing costs to operate your franchise.
            </p>

            <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
              {ongoingFees.map((fee) => (
                <div
                  key={fee.fee}
                  className="rounded-xl sm:rounded-2xl bg-white p-4 sm:p-6 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                    <h3 className="text-base sm:text-lg font-semibold text-brand-navy">
                      {fee.fee}
                    </h3>
                    <span className="text-sm sm:text-lg font-bold text-brand-purple">
                      {fee.amount}
                    </span>
                  </div>
                  <p className="mt-2 text-xs sm:text-sm text-gray-600">{fee.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Qualifications */}
      <div className="py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              Ideal Candidate
            </h2>
            <p className="mt-4 text-base sm:text-lg text-gray-600">
              We&apos;re looking for franchise partners who meet these
              qualifications:
            </p>

            <ul className="mt-6 space-y-3">
              {qualifications.map((qual) => (
                <li
                  key={qual}
                  className="flex items-start gap-3 text-sm sm:text-base text-gray-700"
                >
                  <span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 bg-brand-green/20 rounded-full flex items-center justify-center">
                    <span className="text-brand-green text-xs sm:text-sm">✓</span>
                  </span>
                  {qual}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Financing Options */}
      {/* TODO(content): if Peskids has a real financing partner, add it here
          with their real branding/terms. Do not claim a partnership that
          doesn't exist - the previous content named a real financing company
          (with real trademarks and contact info) that Peskids has no actual
          relationship with. */}
      <div className="bg-white py-10 sm:py-16 border-t border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              Financing Options
            </h2>
            <p className="mt-4 text-base sm:text-lg text-gray-600">
              Common ways franchisees fund their initial investment include
              401(k)/IRA rollovers, SBA loans, securities-backed loans, and
              personal savings. Our team can point you toward financing
              resources during your conversation.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-brand-navy py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Ready to discuss your investment options?
          </h2>
          <p className="mt-2 text-sm sm:text-base text-brand-light/80">
            Our team can walk you through the numbers in detail.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <LinkButton href="/contact" variant="secondary" size="lg" className="w-full sm:w-auto">
              Schedule a Call
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
  );
}
