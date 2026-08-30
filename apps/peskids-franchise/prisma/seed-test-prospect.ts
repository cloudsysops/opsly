import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Creating test prospect for invite flow testing...");

  const testProspect = await prisma.prospect.upsert({
    where: { email: "test-invite@example.com" },
    update: {
      firstName: "Test",
      lastName: "Prospect",
      phone: "555-123-4567",
      preferredTerritory: "Austin, TX",
      interestLevel: "SERIOUSLY_CONSIDERING",
      aboutYourself: "Test prospect for verifying the portal invite flow.",
      pipelineStage: "NEW_INQUIRY",
      // Reset invite fields
      passwordHash: null,
      inviteToken: null,
      inviteTokenExpiry: null,
      inviteSentAt: null,
    },
    create: {
      email: "test-invite@example.com",
      firstName: "Test",
      lastName: "Prospect",
      phone: "555-123-4567",
      preferredTerritory: "Austin, TX",
      interestLevel: "SERIOUSLY_CONSIDERING",
      aboutYourself: "Test prospect for verifying the portal invite flow.",
      pipelineStage: "NEW_INQUIRY",
    },
  });

  console.log("Test prospect created/updated:");
  console.log(`  ID: ${testProspect.id}`);
  console.log(`  Email: ${testProspect.email}`);
  console.log(`  Name: ${testProspect.firstName} ${testProspect.lastName}`);
  console.log(`  Stage: ${testProspect.pipelineStage}`);
  console.log(`  Has Password: ${!!testProspect.passwordHash}`);
  console.log("");
  console.log("Next steps:");
  console.log("1. Go to http://localhost:3000/admin/prospects");
  console.log("2. Find the 'Test Prospect' entry");
  console.log("3. Click 'Send Portal Invite' button");
  console.log("4. Check console logs for email details (no SendGrid in dev)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
