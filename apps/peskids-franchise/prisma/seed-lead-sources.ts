import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const leadSources = [
  {
    slug: "google-ads",
    name: "Google Ads",
    category: "PAID_SEARCH" as const,
    utmSource: "google",
    utmMedium: "cpc",
  },
  {
    slug: "facebook-ads",
    name: "Facebook Ads",
    category: "PAID_SOCIAL" as const,
    utmSource: "facebook",
    utmMedium: "cpc",
  },
  {
    slug: "instagram-ads",
    name: "Instagram Ads",
    category: "PAID_SOCIAL" as const,
    utmSource: "instagram",
    utmMedium: "social",
  },
  {
    slug: "email-newsletter",
    name: "Email Newsletter",
    category: "EMAIL" as const,
    utmSource: "newsletter",
    utmMedium: "email",
  },
  {
    slug: "referral",
    name: "Referral",
    category: "REFERRAL" as const,
    utmSource: "referral",
    utmMedium: null,
  },
  {
    slug: "direct",
    name: "Direct",
    category: "DIRECT" as const,
    utmSource: null,
    utmMedium: null,
  },
  {
    slug: "events",
    name: "Events",
    category: "EVENTS" as const,
    utmSource: "event",
    utmMedium: "offline",
  },
  {
    slug: "partnerships",
    name: "Partnerships",
    category: "PARTNERSHIPS" as const,
    utmSource: "partner",
    utmMedium: "referral",
  },
];

async function main() {
  console.log("Seeding lead sources...");

  for (const source of leadSources) {
    await prisma.leadSource.upsert({
      where: { slug: source.slug },
      update: {
        name: source.name,
        category: source.category,
        utmSource: source.utmSource,
        utmMedium: source.utmMedium,
      },
      create: source,
    });
    console.log(`  Upserted: ${source.name}`);
  }

  console.log("Done seeding lead sources!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
