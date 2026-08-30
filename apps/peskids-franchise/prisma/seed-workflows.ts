// Seed default workflow triggers
// Run with: npx tsx prisma/seed-workflows.ts

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

interface WorkflowSeed {
  name: string;
  description: string;
  triggerType: "NEW_INQUIRY" | "STAGE_CHANGE" | "PREWORK_COMPLETED" | "INACTIVITY" | "MANUAL";
  triggerConfig: Prisma.InputJsonValue;
  actions: {
    actionType: "SEND_EMAIL" | "CREATE_TASK" | "NOTIFY_ADMIN" | "CHANGE_STAGE" | "ADD_NOTE";
    actionConfig: Prisma.InputJsonValue;
    delayMinutes: number;
    order: number;
  }[];
}

const WORKFLOWS: WorkflowSeed[] = [
  // 1. New Inquiry - 24 Hour Follow Up
  {
    name: "24 Hour Follow Up Reminder",
    description: "Creates a follow-up task 24 hours after a new inquiry if no contact has been made",
    triggerType: "NEW_INQUIRY",
    triggerConfig: {},
    actions: [
      {
        actionType: "CREATE_TASK",
        actionConfig: {
          title: "Follow up with {{fullName}}",
          description: "New inquiry from 24 hours ago. Score: {{score}}. Territory: {{territory}}.",
          priority: "HIGH",
          assignedTo: "admin@acmefranchise.com",
          dueHours: 4,
        },
        delayMinutes: 60 * 24, // 24 hours
        order: 1,
      },
    ],
  },

  // 2. Stage Change - Moved to Pre-work
  {
    name: "Pre-work Started Notification",
    description: "Sends welcome message when prospect starts pre-work",
    triggerType: "STAGE_CHANGE",
    triggerConfig: {
      toStage: "PRE_WORK_IN_PROGRESS",
    },
    actions: [
      {
        actionType: "ADD_NOTE",
        actionConfig: {
          content: "Prospect moved to Pre-work stage on {{date}}. They now have access to complete the 5 pre-work modules.",
        },
        delayMinutes: 0,
        order: 1,
      },
    ],
  },

  // 3. Stage Change - Pre-work Complete
  {
    name: "Pre-work Complete - Admin Alert",
    description: "Notifies admins when a prospect completes all pre-work",
    triggerType: "STAGE_CHANGE",
    triggerConfig: {
      toStage: "PRE_WORK_COMPLETE",
    },
    actions: [
      {
        actionType: "NOTIFY_ADMIN",
        actionConfig: {
          subject: "Pre-work Complete: {{fullName}}",
          message: "{{fullName}} has completed all pre-work modules and is ready for review.",
          includeProspectDetails: true,
        },
        delayMinutes: 0,
        order: 1,
      },
      {
        actionType: "CREATE_TASK",
        actionConfig: {
          title: "Review pre-work for {{fullName}}",
          description: "All 5 pre-work modules have been submitted. Please review and score the submissions.",
          priority: "HIGH",
          assignedTo: "admin@acmefranchise.com",
          dueDays: 3,
        },
        delayMinutes: 0,
        order: 2,
      },
    ],
  },

  // 4. Stage Change - Selected
  {
    name: "Franchisee Selected - Onboarding Kick-off",
    description: "Triggers onboarding workflow when a prospect is selected",
    triggerType: "STAGE_CHANGE",
    triggerConfig: {
      toStage: "SELECTED",
    },
    actions: [
      {
        actionType: "NOTIFY_ADMIN",
        actionConfig: {
          subject: "New Franchisee Selected: {{fullName}}",
          message: "Congratulations! {{fullName}} has been selected as a new franchisee. They will now have access to the 90-Day Journey.",
          includeProspectDetails: true,
        },
        delayMinutes: 0,
        order: 1,
      },
      {
        actionType: "ADD_NOTE",
        actionConfig: {
          content: "SELECTED as franchisee on {{date}} at {{time}}. 90-Day Journey access is now enabled.",
          isPinned: true,
        },
        delayMinutes: 0,
        order: 2,
      },
      {
        actionType: "CREATE_TASK",
        actionConfig: {
          title: "Schedule onboarding call with {{fullName}}",
          description: "New franchisee selected! Schedule the kick-off call to begin the 90-Day Journey.",
          priority: "HIGH",
          assignedTo: "admin@acmefranchise.com",
          dueDays: 1,
        },
        delayMinutes: 0,
        order: 3,
      },
    ],
  },

  // 5. High Score Alert
  {
    name: "High Score Alert",
    description: "Immediately notifies admins when a high-scoring prospect submits",
    triggerType: "NEW_INQUIRY",
    triggerConfig: {
      minScore: 70,
    },
    actions: [
      {
        actionType: "NOTIFY_ADMIN",
        actionConfig: {
          subject: "High Score Alert: {{fullName}} ({{score}} points)",
          message: "A high-scoring prospect just submitted an inquiry! This could be a strong candidate - prioritize outreach.",
          includeProspectDetails: true,
        },
        delayMinutes: 0,
        order: 1,
      },
      {
        actionType: "CREATE_TASK",
        actionConfig: {
          title: "PRIORITY: Contact {{fullName}} - High Score",
          description: "High-scoring prospect ({{score}}) just submitted. Contact within 2 hours for best conversion.",
          priority: "URGENT",
          assignedTo: "admin@acmefranchise.com",
          dueHours: 2,
        },
        delayMinutes: 0,
        order: 2,
      },
    ],
  },

  // 6. Pre-work Reminder (7 days after starting)
  {
    name: "Pre-work Reminder - 7 Days",
    description: "Reminds prospects to complete pre-work if still in progress after 7 days",
    triggerType: "STAGE_CHANGE",
    triggerConfig: {
      toStage: "PRE_WORK_IN_PROGRESS",
    },
    actions: [
      {
        actionType: "CREATE_TASK",
        actionConfig: {
          title: "Check pre-work progress for {{fullName}}",
          description: "It's been 7 days since {{fullName}} started pre-work. Check their progress and consider a follow-up.",
          priority: "MEDIUM",
          assignedTo: "admin@acmefranchise.com",
          dueDays: 7,
        },
        delayMinutes: 60 * 24 * 7, // 7 days
        order: 1,
      },
    ],
  },
];

async function seed() {
  console.log("Seeding workflows...");

  for (const workflow of WORKFLOWS) {
    // Check if workflow already exists
    const existing = await prisma.workflowTrigger.findFirst({
      where: { name: workflow.name },
    });

    if (existing) {
      console.log(`  Skipping "${workflow.name}" - already exists`);
      continue;
    }

    // Create workflow with actions
    const created = await prisma.workflowTrigger.create({
      data: {
        name: workflow.name,
        description: workflow.description,
        triggerType: workflow.triggerType,
        triggerConfig: workflow.triggerConfig,
        isActive: true,
        actions: {
          create: workflow.actions.map((action) => ({
            actionType: action.actionType,
            actionConfig: action.actionConfig,
            delayMinutes: action.delayMinutes,
            order: action.order,
          })),
        },
      },
      include: {
        actions: true,
      },
    });

    console.log(`  Created "${created.name}" with ${created.actions.length} action(s)`);
  }

  console.log("Done seeding workflows!");
}

seed()
  .catch((e) => {
    console.error("Error seeding workflows:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
