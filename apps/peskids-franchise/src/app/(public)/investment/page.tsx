import { Metadata } from "next";
import { LinkButton } from "@/components/shared/Button";
import { TrackedDownloadLink } from "@/components/shared/TrackedDownloadLink";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

export const metadata: Metadata = {
  title: "Cost & Investment",
  description:
    "Understand the investment required to own an Acme Franchise.",
  alternates: {
    canonical: "https://franchising.acmefranchise.com/investment",
  },
  openGraph: {
    url: "https://franchising.acmefranchise.com/investment",
  },
};

const investmentComponents = [
  {
    item: "Initial Franchise Fee",
    description: "One-time fee for territory rights and initial training (non-refundable)",
    range: "$45,000",
  },
  {
    item: "Equipment Fee",
    description: "Board games, lesson books, classroom materials, and marketing materials",
    range: "$669 - $2,267",
  },
  {
    item: "Opening Advertising Campaign",
    description: "Initial marketing to promote the opening of your franchise",
    range: "$500 - $2,000",
  },
  {
    item: "Additional Funds (3 months)",
    description: "Working capital for initial operating expenses",
    range: "$5,458 - $22,721",
  },
  {
    item: "Other Costs",
    description: "Insurance, licenses, professional fees, and miscellaneous expenses",
    range: "$4,000 - $4,000",
  },
];

const ongoingFees = [
  {
    fee: "Royalty Fee",
    amount: "7% of Gross Revenue",
    description: "Weekly fee (minimum $200/week) for ongoing support, training, and brand usage",
  },
  {
    fee: "Brand Fund Contribution",
    amount: "2% of Gross Revenue",
    description: "Contribution to national marketing and brand development",
  },
  {
    fee: "Internal Systems Fee",
    amount: "1% of Gross Revenue",
    description: "Operations hub, scheduling, and CRM tools",
  },
  {
    fee: "Local Advertising",
    amount: "$500 - $2,000/month",
    description: "Required minimum monthly spend on local marketing (paid to third parties)",
  },
  {
    fee: "Software & Applications",
    amount: "$30 - $80/month",
    description: "Required third-party software and applications",
  },
];

const qualifications = [
  "Net worth of at least $150,000",
  "Liquid capital of $50,000 - $100,000 available for investment",
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
              owning an Acme Franchise.
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
              The total investment necessary to begin operation of an Acme Franchise is{" "}
              <span className="font-bold text-brand-navy">
                $55,627 to $75,988
              </span>
              . This includes a $45,000 initial franchise fee.
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
                  <div className="font-bold">$55,627 - $75,988</div>
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
                      $55,627 - $75,988
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

      {/* Financing Options - Benetrends Partnership */}
      <div className="bg-white py-10 sm:py-16 border-t border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              Financing Options
            </h2>

            {/* Benetrends Partnership Banner */}
            <div className="mt-6 sm:mt-8 rounded-2xl bg-gradient-to-r from-[#F7941D] to-[#F7A94D] p-6 sm:p-8 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white/80 uppercase tracking-wide">
                    Financing Partner
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold mt-1">
                    Benetrends Financial
                  </h3>
                  <p className="mt-2 text-white/90 text-sm sm:text-base">
                    We&apos;ve partnered with Benetrends to jumpstart your business success
                    with a customized program that utilizes a comprehensive suite of funding options.
                  </p>
                </div>
                <TrackedDownloadLink
                  href="/pdf/Benetrends_Overview_SC.pdf"
                  documentName="Benetrends Financing Overview"
                  fileName="Benetrends_Overview_SC.pdf"
                  source="/investment"
                  className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-3 bg-white text-[#F7941D] font-semibold rounded-lg hover:bg-white/90 transition-colors text-sm sm:text-base"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  Download Overview
                </TrackedDownloadLink>
              </div>
            </div>

            {/* Benetrends Description */}
            <div className="mt-6 sm:mt-8 text-base sm:text-lg text-gray-600">
              <p>
                Benetrends has helped more than <strong>30,000 entrepreneurs</strong> successfully
                launch their dreams for over <strong>40 years</strong>, with proven and innovative
                funding strategies that maximize opportunities while minimizing risk.
              </p>
            </div>

            {/* Financing Options Grid */}
            <div className="mt-8 grid gap-4 sm:gap-6">
              {/* 401(k)/IRA Rollover */}
              <div className="rounded-xl border border-gray-200 p-5 sm:p-6 hover:border-brand-cyan hover:shadow-sm transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-brand-cyan/10 rounded-xl flex items-center justify-center">
                    <span className="text-xl sm:text-2xl">💰</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-navy text-base sm:text-lg">
                      401(k)/IRA Rollover Funding
                    </h3>
                    <p className="mt-1 text-sm sm:text-base text-gray-600">
                      The Rainmaker Plan&reg; allows you to use the funds in your retirement
                      plan to purchase or expand your business while eliminating debt &mdash;
                      tax-deferred and penalty-free.
                    </p>
                  </div>
                </div>
              </div>

              {/* SBA Loans */}
              <div className="rounded-xl border border-gray-200 p-5 sm:p-6 hover:border-brand-cyan hover:shadow-sm transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-brand-cyan/10 rounded-xl flex items-center justify-center">
                    <span className="text-xl sm:text-2xl">🏦</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-navy text-base sm:text-lg">
                      SBA Loans
                    </h3>
                    <p className="mt-1 text-sm sm:text-base text-gray-600">
                      One of the most popular loan offerings for small businesses. Benetrends
                      has one of the highest loan approval ratings in the industry with a
                      <strong> money-back fee guarantee</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Securities-Backed Loans */}
              <div className="rounded-xl border border-gray-200 p-5 sm:p-6 hover:border-brand-cyan hover:shadow-sm transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-brand-cyan/10 rounded-xl flex items-center justify-center">
                    <span className="text-xl sm:text-2xl">📈</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-navy text-base sm:text-lg">
                      Securities-Backed Loans
                    </h3>
                    <p className="mt-1 text-sm sm:text-base text-gray-600">
                      A line of credit backed by securities in your investment portfolio.
                      Cash needs are acquired within 10 days without disrupting investments.
                      The portfolio remains in your name.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tax Advantaged Strategies */}
              <div className="rounded-xl border border-gray-200 p-5 sm:p-6 hover:border-brand-cyan hover:shadow-sm transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-brand-cyan/10 rounded-xl flex items-center justify-center">
                    <span className="text-xl sm:text-2xl">📋</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-brand-navy text-base sm:text-lg">
                      Tax Advantaged Capitalization Strategies
                    </h3>
                    <p className="mt-1 text-sm sm:text-base text-gray-600">
                      The Rainmaker Advantage Plan&reg; creates a structure that will greatly
                      minimize or eliminate taxes on gains when selling the business.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Benetrends */}
            <div className="mt-8 p-5 sm:p-6 bg-gray-50 rounded-xl text-center">
              <p className="text-sm sm:text-base text-gray-600">
                Learn more about financing options at{" "}
                <a
                  href="https://www.benetrends.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-purple font-medium hover:underline"
                >
                  Benetrends.com
                </a>
                {" "}or call{" "}
                <a href="tel:866-423-6387" className="text-brand-purple font-medium hover:underline">
                  866.423.6387
                </a>
              </p>
            </div>
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
