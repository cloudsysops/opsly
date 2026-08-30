import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const franchisees = [
  {
    email: 'westside@demo-franchise.example.com',
    firstName: 'Westside',
    lastName: 'Franchisee',
    phone: '615-555-0001',
    preferredTerritory: 'Westside, TN',
  },
  {
    email: 'eastside@demo-franchise.example.com',
    firstName: 'Eastside',
    lastName: 'Franchisee',
    phone: '407-555-0001',
    preferredTerritory: 'Eastside, FL',
  },
];

async function main() {
  console.log('Seeding franchisee accounts...\n');

  for (const franchisee of franchisees) {
    // Check if prospect already exists
    const existing = await prisma.prospect.findUnique({
      where: { email: franchisee.email },
      include: { franchiseeAccount: true },
    });

    if (existing) {
      console.log(`Prospect ${franchisee.email} already exists`);

      // Update to SELECTED if not already
      if (existing.pipelineStage !== 'SELECTED') {
        await prisma.prospect.update({
          where: { id: existing.id },
          data: {
            pipelineStage: 'SELECTED',
            preferredTerritory: franchisee.preferredTerritory,
          },
        });
        console.log(`  -> Updated to SELECTED stage`);
      }

      // Create franchisee account if doesn't exist
      if (!existing.franchiseeAccount) {
        await prisma.franchiseeAccount.create({
          data: {
            prospectId: existing.id,
          },
        });
        console.log(`  -> Created FranchiseeAccount`);
      } else {
        console.log(`  -> FranchiseeAccount already exists`);
      }
    } else {
      // Create new prospect with SELECTED stage
      const prospect = await prisma.prospect.create({
        data: {
          email: franchisee.email,
          firstName: franchisee.firstName,
          lastName: franchisee.lastName,
          phone: franchisee.phone,
          preferredTerritory: franchisee.preferredTerritory,
          interestLevel: 'READY_TO_START',
          pipelineStage: 'SELECTED',
          prospectScore: 100,
          preWorkStatus: 'APPROVED',
          preWorkCompletedAt: new Date(),
        },
      });

      console.log(`Created prospect: ${franchisee.firstName} ${franchisee.lastName} (${franchisee.email})`);

      // Create franchisee account
      await prisma.franchiseeAccount.create({
        data: {
          prospectId: prospect.id,
        },
      });

      console.log(`  -> Created FranchiseeAccount`);
    }
  }

  console.log('\nDone! Franchisee accounts created.');
  console.log('\nWestside and Eastside franchisees will now appear in the Royalty Dashboard.');
  console.log('When you generate invoices, the system will pull revenue from the STC databases.');
}

main()
  .catch((e) => {
    console.error('Error seeding franchisees:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
