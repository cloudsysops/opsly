import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding royalty configuration...');

  // Find existing global config (franchiseeAccountId is null)
  const existingGlobalConfig = await prisma.royaltyConfig.findFirst({
    where: { franchiseeAccountId: null },
  });

  let globalConfig;

  if (existingGlobalConfig) {
    // Update existing
    globalConfig = await prisma.royaltyConfig.update({
      where: { id: existingGlobalConfig.id },
      data: {
        royaltyPercent: new Decimal(7.0),
        brandFundPercent: new Decimal(2.0),
        systemsFeePercent: new Decimal(1.0),
        notes: 'Default configuration: 7% royalty + 2% brand fund + 1% systems fee = 10% total',
      },
    });
    console.log('✅ Global royalty config updated:', globalConfig.id);
  } else {
    // Create new
    globalConfig = await prisma.royaltyConfig.create({
      data: {
        franchiseeAccountId: null,
        royaltyPercent: new Decimal(7.0),
        brandFundPercent: new Decimal(2.0),
        systemsFeePercent: new Decimal(1.0),
        minimumMonthlyFee: null,
        maximumMonthlyFee: null,
        notes: 'Default configuration: 7% royalty + 2% brand fund + 1% systems fee = 10% total',
        effectiveFrom: new Date(),
        effectiveTo: null,
      },
    });
    console.log('✅ Global royalty config created:', globalConfig.id);
  }

  // Seed certifications
  const certifications = [
    {
      slug: 'stc-brand-training',
      name: 'STC Brand Training',
      description: 'Complete Acme Franchise brand values, messaging, and guidelines training',
      requiredForLaunch: true,
      renewalMonths: null,
      category: 'TRAINING' as const,
    },
    {
      slug: 'chess-instruction-fundamentals',
      name: 'Chess Instruction Fundamentals',
      description: 'Basic chess teaching methodology and age-appropriate instruction techniques',
      requiredForLaunch: true,
      renewalMonths: null,
      category: 'TRAINING' as const,
    },
    {
      slug: 'tutorcruncher-operations',
      name: 'TutorCruncher Operations',
      description: 'Training on using TutorCruncher for scheduling, invoicing, and tutor management',
      requiredForLaunch: true,
      renewalMonths: null,
      category: 'OPERATIONS' as const,
    },
    {
      slug: 'sales-and-marketing',
      name: 'Sales & Marketing Certification',
      description: 'Training on lead generation, client conversion, and marketing best practices',
      requiredForLaunch: true,
      renewalMonths: 12,
      category: 'TRAINING' as const,
    },
    {
      slug: 'business-insurance',
      name: 'Business Insurance',
      description: 'General liability and professional liability insurance coverage',
      requiredForLaunch: true,
      renewalMonths: 12,
      category: 'INSURANCE' as const,
    },
    {
      slug: 'llc-formation',
      name: 'LLC Formation',
      description: 'Business entity formation documentation',
      requiredForLaunch: true,
      renewalMonths: null,
      category: 'LEGAL' as const,
    },
    {
      slug: 'fdd-acknowledgment',
      name: 'FDD Acknowledgment',
      description: 'Franchise Disclosure Document review and acknowledgment',
      requiredForLaunch: true,
      renewalMonths: null,
      category: 'LEGAL' as const,
    },
    {
      slug: 'background-check',
      name: 'Background Check',
      description: 'Completed background check for working with minors',
      requiredForLaunch: true,
      renewalMonths: 24,
      category: 'COMPLIANCE' as const,
    },
    {
      slug: 'annual-compliance-review',
      name: 'Annual Compliance Review',
      description: 'Annual review of operational compliance and brand standards',
      requiredForLaunch: false,
      renewalMonths: 12,
      category: 'COMPLIANCE' as const,
    },
  ];

  for (const cert of certifications) {
    await prisma.certification.upsert({
      where: { slug: cert.slug },
      update: cert,
      create: cert,
    });
  }

  console.log(`✅ ${certifications.length} certifications seeded`);

  console.log('🎉 Royalty configuration seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
