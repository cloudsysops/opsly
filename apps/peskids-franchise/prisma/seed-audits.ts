import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding audit templates...");

  // --- 1. Brand Standards Audit ---
  const brandStandards = await prisma.auditTemplate.upsert({
    where: { slug: "brand-standards" },
    update: {
      name: "Brand Standards Audit",
      description:
        "Evaluate franchisee adherence to Acme Franchise brand guidelines including signage, materials, attire, and digital presence.",
      category: "BRAND_STANDARDS",
      isActive: true,
    },
    create: {
      name: "Brand Standards Audit",
      slug: "brand-standards",
      description:
        "Evaluate franchisee adherence to Acme Franchise brand guidelines including signage, materials, attire, and digital presence.",
      category: "BRAND_STANDARDS",
      isActive: true,
    },
  });

  // Delete existing items and recreate for idempotency
  await prisma.auditTemplateItem.deleteMany({
    where: { templateId: brandStandards.id },
  });

  const brandStandardsItems = [
    { question: "Signage properly displayed and in good condition", itemType: "PASS_FAIL" as const, weight: 2, sortOrder: 1, isRequired: true },
    { question: "Logo used correctly on all materials", itemType: "PASS_FAIL" as const, weight: 2, sortOrder: 2, isRequired: true },
    { question: "Brand colors consistent across materials", itemType: "PASS_FAIL" as const, weight: 1, sortOrder: 3, isRequired: true },
    { question: "Staff wearing approved Acme Franchise attire", itemType: "PASS_FAIL" as const, weight: 1, sortOrder: 4, isRequired: true },
    { question: "Marketing materials are current and undamaged", itemType: "PASS_FAIL" as const, weight: 1, sortOrder: 5, isRequired: true },
    { question: "Business cards available and up to date", itemType: "PASS_FAIL" as const, weight: 1, sortOrder: 6, isRequired: true },
    { question: "Chess sets display STC branding", itemType: "PASS_FAIL" as const, weight: 1, sortOrder: 7, isRequired: true },
    { question: "Vehicle signage (if applicable) meets standards", itemType: "PASS_FAIL" as const, weight: 1, sortOrder: 8, isRequired: true },
    { question: "Social media profiles use approved branding", itemType: "PASS_FAIL" as const, weight: 1, sortOrder: 9, isRequired: true },
    { question: "Email signatures follow template", itemType: "PASS_FAIL" as const, weight: 1, sortOrder: 10, isRequired: true },
    { question: "Website landing page matches brand guidelines", itemType: "PASS_FAIL" as const, weight: 2, sortOrder: 11, isRequired: true },
    { question: "Promotional items are approved merchandise", itemType: "PASS_FAIL" as const, weight: 1, sortOrder: 12, isRequired: true },
    { question: "Photo/video of overall brand presentation", itemType: "PHOTO" as const, weight: 0, sortOrder: 13, isRequired: false },
    { question: "Overall brand impression rating", itemType: "RATING_1_5" as const, weight: 2, sortOrder: 14, isRequired: true },
    { question: "Additional brand standards notes", itemType: "TEXT" as const, weight: 0, sortOrder: 15, isRequired: false },
  ];

  await prisma.auditTemplateItem.createMany({
    data: brandStandardsItems.map((item) => ({
      ...item,
      templateId: brandStandards.id,
    })),
  });

  console.log(`  Brand Standards Audit: ${brandStandardsItems.length} items`);

  // --- 2. Operations Audit ---
  const operations = await prisma.auditTemplate.upsert({
    where: { slug: "operations" },
    update: {
      name: "Operations Audit",
      description:
        "Assess franchisee operational readiness including class setup, safety procedures, staffing ratios, and student engagement.",
      category: "OPERATIONS",
      isActive: true,
    },
    create: {
      name: "Operations Audit",
      slug: "operations",
      description:
        "Assess franchisee operational readiness including class setup, safety procedures, staffing ratios, and student engagement.",
      category: "OPERATIONS",
      isActive: true,
    },
  });

  await prisma.auditTemplateItem.deleteMany({
    where: { templateId: operations.id },
  });

  const operationsItems = [
    { question: "Class space properly set up before students arrive", itemType: "PASS_FAIL" as const, weight: 2, sortOrder: 1, isRequired: true },
    { question: "All chess sets complete with all pieces", itemType: "PASS_FAIL" as const, weight: 2, sortOrder: 2, isRequired: true },
    { question: "Lesson plan prepared and age-appropriate", itemType: "PASS_FAIL" as const, weight: 2, sortOrder: 3, isRequired: true },
    { question: "Student roster accurate and attendance tracked", itemType: "YES_NO" as const, weight: 1, sortOrder: 4, isRequired: true },
    { question: "Safety procedures posted and visible", itemType: "PASS_FAIL" as const, weight: 2, sortOrder: 5, isRequired: true },
    { question: "First aid kit accessible and stocked", itemType: "PASS_FAIL" as const, weight: 2, sortOrder: 6, isRequired: true },
    { question: "Emergency contact info available for all students", itemType: "YES_NO" as const, weight: 1, sortOrder: 7, isRequired: true },
    { question: "Class runs within scheduled time window", itemType: "PASS_FAIL" as const, weight: 1, sortOrder: 8, isRequired: true },
    { question: "Instructor-to-student ratio maintained", itemType: "PASS_FAIL" as const, weight: 2, sortOrder: 9, isRequired: true },
    { question: "Student engagement level during class", itemType: "RATING_1_5" as const, weight: 2, sortOrder: 10, isRequired: true },
    { question: "Photo of class setup", itemType: "PHOTO" as const, weight: 0, sortOrder: 11, isRequired: false },
    { question: "Operations notes and observations", itemType: "TEXT" as const, weight: 0, sortOrder: 12, isRequired: false },
  ];

  await prisma.auditTemplateItem.createMany({
    data: operationsItems.map((item) => ({
      ...item,
      templateId: operations.id,
    })),
  });

  console.log(`  Operations Audit: ${operationsItems.length} items`);

  // --- 3. Customer Experience Audit ---
  const customerExperience = await prisma.auditTemplate.upsert({
    where: { slug: "customer-experience" },
    update: {
      name: "Customer Experience Audit",
      description:
        "Evaluate the quality of customer interactions including instructor delivery, student engagement, parent communication, and feedback systems.",
      category: "CUSTOMER_EXPERIENCE",
      isActive: true,
    },
    create: {
      name: "Customer Experience Audit",
      slug: "customer-experience",
      description:
        "Evaluate the quality of customer interactions including instructor delivery, student engagement, parent communication, and feedback systems.",
      category: "CUSTOMER_EXPERIENCE",
      isActive: true,
    },
  });

  await prisma.auditTemplateItem.deleteMany({
    where: { templateId: customerExperience.id },
  });

  const customerExperienceItems = [
    { question: "Professional greeting of students and parents", itemType: "RATING_1_5" as const, weight: 2, sortOrder: 1, isRequired: true },
    { question: "Instructor enthusiasm and energy level", itemType: "RATING_1_5" as const, weight: 2, sortOrder: 2, isRequired: true },
    { question: "Age-appropriate instruction delivery", itemType: "RATING_1_5" as const, weight: 2, sortOrder: 3, isRequired: true },
    { question: "Student participation and engagement", itemType: "RATING_1_5" as const, weight: 2, sortOrder: 4, isRequired: true },
    { question: "Positive reinforcement used effectively", itemType: "RATING_1_5" as const, weight: 1, sortOrder: 5, isRequired: true },
    { question: "Parent communication at pickup", itemType: "RATING_1_5" as const, weight: 1, sortOrder: 6, isRequired: true },
    { question: "Follow-up procedures in place for absent students", itemType: "YES_NO" as const, weight: 1, sortOrder: 7, isRequired: true },
    { question: "Feedback collection system active", itemType: "YES_NO" as const, weight: 1, sortOrder: 8, isRequired: true },
    { question: "Overall customer experience rating", itemType: "RATING_1_5" as const, weight: 3, sortOrder: 9, isRequired: true },
    { question: "Customer experience notes", itemType: "TEXT" as const, weight: 0, sortOrder: 10, isRequired: false },
  ];

  await prisma.auditTemplateItem.createMany({
    data: customerExperienceItems.map((item) => ({
      ...item,
      templateId: customerExperience.id,
    })),
  });

  console.log(`  Customer Experience Audit: ${customerExperienceItems.length} items`);

  console.log("Audit templates seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
