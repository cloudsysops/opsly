import { Metadata } from "next";
import { LinkButton } from "@/components/shared/Button";
import JsonLd from "@/components/shared/JsonLd";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about the Acme Franchise opportunity.",
  alternates: {
    canonical: "https://franchising.acmefranchise.com/faq",
  },
  openGraph: {
    url: "https://franchising.acmefranchise.com/faq",
  },
};

const faqCategories = [
  {
    title: "About the Opportunity",
    faqs: [
      {
        question: "Do I need chess experience to become a franchisee?",
        answer:
          "No! Our comprehensive curriculum certification program teaches you everything you need to know about chess and how to teach it using our unique Story Time method. Many of our most successful franchisees were not chess players before joining.",
      },
      {
        question: "Do I need teaching experience?",
        answer:
          "While teaching experience is helpful, it's not required. Our training program covers classroom management, engaging young learners, and effective instruction techniques. A passion for children's education is more important than formal teaching credentials.",
      },
      {
        question: "Is this a full-time or part-time opportunity?",
        answer:
          "Most franchisees start part-time and grow to full-time as their business develops. Since most programs run after school and on weekends, the schedule can be flexible. Many franchisees keep other employment during their initial ramp-up period.",
      },
      {
        question: "What territories are available?",
        answer:
          "We're actively expanding and have territories available in most major metropolitan areas. Our current focus areas include markets in the Southeast and Texas, but we're open to discussions about other regions. Visit our Markets page for more information.",
      },
    ],
  },
  {
    title: "Investment & Finances",
    faqs: [
      {
        question: "What is the total investment required?",
        answer:
          "The estimated initial investment ranges from $55,627 to $75,988, including a $45,000 franchise fee, equipment, working capital, and initial marketing. See our Investment page for a detailed breakdown, and refer to Item 7 of the Franchise Disclosure Document for complete details.",
      },
      {
        question: "Are financing options available?",
        answer:
          "While we don't offer direct financing, many franchisees use SBA loans, 401(k)/IRA rollovers (ROBS), home equity, or personal savings. We can connect you with franchise financing specialists who understand our opportunity.",
      },
      {
        question: "What are the ongoing fees?",
        answer:
          "Ongoing fees include a 7% royalty on gross revenue, a 2% brand fund contribution, and a 1% systems fee (10% total). These fees support ongoing training, marketing, and operational systems.",
      },
      {
        question: "What kind of revenue can I expect?",
        answer:
          "Revenue varies by market and operator. All financial performance information is disclosed in Item 19 of our Franchise Disclosure Document, which you will receive at least 14 days before signing any agreement or paying any fees.",
      },
    ],
  },
  {
    title: "Training & Support",
    faqs: [
      {
        question: "What training is provided?",
        answer:
          "Our training program includes curriculum certification (learning our Acme Franchise method), business operations training, marketing and sales training, and hands-on practice. Training is a combination of virtual sessions and in-person experience.",
      },
      {
        question: "What ongoing support do I receive?",
        answer:
          "You'll have a dedicated franchise success coach, access to our operations platform, monthly franchisee meetings, marketing resources, and continuous curriculum updates. We're committed to your success and available when you need help.",
      },
      {
        question: "How long does it take to get started?",
        answer:
          "The typical timeline from initial inquiry to launching your first programs is 10-18 weeks. This includes the pre-work phase (2-4 weeks), discovery day, agreement signing, and training/setup (4-8 weeks).",
      },
    ],
  },
  {
    title: "Operations",
    faqs: [
      {
        question: "Where do programs take place?",
        answer:
          "Programs typically run in schools (as after-school enrichment), community centers, libraries, and private homes. You don't need a dedicated facility—our model is designed for low overhead and flexibility.",
      },
      {
        question: "Do I need to hire employees?",
        answer:
          "Most franchisees start as the primary instructor. As your business grows, you can hire additional instructors. We provide guidance on hiring, training, and managing staff when you're ready to scale.",
      },
      {
        question: "What equipment and materials are needed?",
        answer:
          "You'll need chess sets, curriculum materials, demonstration boards, and promotional items. We provide a complete startup kit and ongoing access to materials through our supplier network.",
      },
      {
        question: "How do I find schools and partners?",
        answer:
          "Our pre-work program teaches you how to identify and approach potential partners. We provide outreach templates, talking points, and ongoing coaching on building school relationships. Our franchisees typically work with 5-15 schools in their first year.",
      },
    ],
  },
  {
    title: "The Process",
    faqs: [
      {
        question: "What is the pre-work phase?",
        answer:
          "Pre-work is a 2-4 week program where you complete 5 modules: territory research, market analysis, outreach exercises, reflection, and a 90-day launch plan. It's designed to give you real experience with core franchise activities and help both parties assess fit.",
      },
      {
        question: "Why is pre-work required?",
        answer:
          "Pre-work ensures you understand what running an Acme Franchise entails before making a commitment. It demonstrates initiative and helps us identify candidates who will thrive as franchisees. Successful completion is required for selection.",
      },
      {
        question: "What happens at Discovery Day?",
        answer:
          "Discovery Day is an in-person visit to Westside where you'll meet the team, observe classes, review detailed financials, and ask questions. It's your opportunity to experience Acme Franchise firsthand and make an informed decision.",
      },
      {
        question: "How are franchisees selected?",
        answer:
          "We evaluate candidates based on their pre-work quality, alignment with our values, financial qualifications, and mutual fit. We're looking for partners who are passionate about children's education and committed to following our established system.",
      },
    ],
  },
];

export default function FAQPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqCategories.flatMap((category) =>
      category.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      }))
    ),
  };

  return (
    <div className="bg-white">
      <JsonLd data={faqJsonLd} />
      {/* Hero */}
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-brand-light to-white py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-5xl">
              Frequently Asked Questions
            </h1>
            <p className="mt-4 text-base sm:text-lg leading-7 sm:leading-8 text-gray-600">
              Find answers to common questions about the Acme Franchise
              franchise opportunity.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Sections */}
      <div className="py-10 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {faqCategories.map((category) => (
            <div key={category.title} className="mb-8 sm:mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-brand-navy mb-3 sm:mb-4">
                {category.title}
              </h2>
              <div className="space-y-3 sm:space-y-4">
                {category.faqs.map((faq) => (
                  <details
                    key={faq.question}
                    className="group rounded-xl sm:rounded-2xl border border-gray-100 bg-white shadow-sm"
                  >
                    <summary className="flex cursor-pointer items-center justify-between p-4 sm:p-6">
                      <h3 className="text-sm sm:text-lg font-semibold text-brand-navy pr-3 sm:pr-4">
                        {faq.question}
                      </h3>
                      <span className="flex-shrink-0 text-brand-purple transition-transform group-open:rotate-180">
                        <svg
                          className="h-4 w-4 sm:h-5 sm:w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </span>
                    </summary>
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                      <p className="text-sm sm:text-base text-gray-600">{faq.answer}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Still Have Questions */}
      <div className="bg-brand-light py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-brand-navy">
            Still have questions?
          </h2>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            We&apos;re happy to answer any questions not covered here.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <LinkButton href="/contact" size="lg" className="w-full sm:w-auto">
              Contact Us
            </LinkButton>
          </div>
        </div>
      </div>
    </div>
  );
}
