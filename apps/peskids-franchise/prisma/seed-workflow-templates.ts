// Seed pre-built workflow templates for the Visual Workflow Builder
// Run with: npx tsx prisma/seed-workflow-templates.ts

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

interface TemplateAction {
  actionType: "SEND_EMAIL" | "CREATE_TASK" | "NOTIFY_ADMIN" | "CHANGE_STAGE" | "ADD_NOTE" | "WAIT";
  actionConfig: Prisma.InputJsonValue;
  delayMinutes: number;
  order: number;
  nodeId: string;
}

interface TemplateCondition {
  nodeId: string;
  field: string;
  operator: string;
  value: string;
}

interface TemplateDef {
  name: string;
  description: string;
  triggerType: "NEW_INQUIRY" | "STAGE_CHANGE" | "PREWORK_COMPLETED" | "INACTIVITY" | "MANUAL";
  triggerConfig: Prisma.InputJsonValue;
  category: string;
  flowData: Prisma.InputJsonValue;
  actions: TemplateAction[];
  conditions: TemplateCondition[];
}

// =============================================================================
// Template 1: New Lead Connection
// =============================================================================
const newLeadConnection: TemplateDef = {
  name: "New Lead Connection",
  description:
    "Automatically engage new leads with a welcome email, follow-up task, and nurture sequence",
  triggerType: "NEW_INQUIRY",
  triggerConfig: {},
  category: "connection",
  flowData: {
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 250, y: 0 },
        data: { triggerType: "NEW_INQUIRY" },
      },
      {
        id: "action-1",
        type: "action",
        position: { x: 250, y: 120 },
        data: {
          actionType: "SEND_EMAIL",
          label: "Send Welcome Email",
          templateSlug: "welcome-prospect",
        },
      },
      {
        id: "wait-1",
        type: "wait",
        position: { x: 250, y: 240 },
        data: { delayMinutes: 240, waitValue: 4, waitUnit: "hours" },
      },
      {
        id: "condition-1",
        type: "condition",
        position: { x: 250, y: 360 },
        data: { field: "prospectScore", operator: "gte", value: "70" },
      },
      {
        id: "action-2",
        type: "action",
        position: { x: 500, y: 360 },
        data: {
          actionType: "CREATE_TASK",
          label: "Create HIGH Task",
          title: "Follow up with high-score lead",
          priority: "HIGH",
        },
      },
      {
        id: "action-3",
        type: "action",
        position: { x: 500, y: 480 },
        data: {
          actionType: "NOTIFY_ADMIN",
          label: "Notify Admin",
          message: "High-score lead requires attention",
        },
      },
      {
        id: "action-4",
        type: "action",
        position: { x: 250, y: 480 },
        data: {
          actionType: "CREATE_TASK",
          label: "Create MEDIUM Task",
          title: "Follow up with new lead",
          priority: "MEDIUM",
        },
      },
      {
        id: "wait-2",
        type: "wait",
        position: { x: 250, y: 600 },
        data: { delayMinutes: 4320, waitValue: 3, waitUnit: "days" },
      },
      {
        id: "action-5",
        type: "action",
        position: { x: 250, y: 720 },
        data: {
          actionType: "SEND_EMAIL",
          label: "Send Follow-up Email",
          subject:
            "Following up on your interest in Acme Franchise",
          body: "Hi {{firstName}}, ...",
        },
      },
      {
        id: "wait-3",
        type: "wait",
        position: { x: 250, y: 840 },
        data: { delayMinutes: 10080, waitValue: 7, waitUnit: "days" },
      },
      {
        id: "action-6",
        type: "action",
        position: { x: 250, y: 960 },
        data: {
          actionType: "SEND_EMAIL",
          label: "Still Interested?",
          subject: "Still interested in Acme Franchise?",
          body: "Hi {{firstName}}, ...",
        },
      },
    ],
    edges: [
      { id: "e-trigger1-action1", source: "trigger-1", target: "action-1" },
      { id: "e-action1-wait1", source: "action-1", target: "wait-1" },
      { id: "e-wait1-condition1", source: "wait-1", target: "condition-1" },
      {
        id: "e-condition1-yes-action2",
        source: "condition-1",
        sourceHandle: "yes",
        target: "action-2",
      },
      { id: "e-action2-action3", source: "action-2", target: "action-3" },
      {
        id: "e-condition1-no-action4",
        source: "condition-1",
        sourceHandle: "no",
        target: "action-4",
      },
      { id: "e-action4-wait2", source: "action-4", target: "wait-2" },
      { id: "e-action3-wait2", source: "action-3", target: "wait-2" },
      { id: "e-wait2-action5", source: "wait-2", target: "action-5" },
      { id: "e-action5-wait3", source: "action-5", target: "wait-3" },
      { id: "e-wait3-action6", source: "wait-3", target: "action-6" },
    ],
  },
  actions: [
    {
      actionType: "SEND_EMAIL",
      nodeId: "action-1",
      order: 0,
      delayMinutes: 0,
      actionConfig: { templateSlug: "welcome-prospect" },
    },
    {
      actionType: "WAIT",
      nodeId: "wait-1",
      order: 1,
      delayMinutes: 240,
      actionConfig: {},
    },
    {
      actionType: "CREATE_TASK",
      nodeId: "action-2",
      order: 2,
      delayMinutes: 0,
      actionConfig: {
        title: "Follow up with high-score lead",
        priority: "HIGH",
      },
    },
    {
      actionType: "NOTIFY_ADMIN",
      nodeId: "action-3",
      order: 3,
      delayMinutes: 0,
      actionConfig: { message: "High-score lead requires attention" },
    },
    {
      actionType: "CREATE_TASK",
      nodeId: "action-4",
      order: 4,
      delayMinutes: 0,
      actionConfig: {
        title: "Follow up with new lead",
        priority: "MEDIUM",
      },
    },
    {
      actionType: "WAIT",
      nodeId: "wait-2",
      order: 5,
      delayMinutes: 4320,
      actionConfig: {},
    },
    {
      actionType: "SEND_EMAIL",
      nodeId: "action-5",
      order: 6,
      delayMinutes: 0,
      actionConfig: {
        subject: "Following up on your interest in Acme Franchise",
        body: "<p>Hi {{firstName}},</p><p>I wanted to follow up on your inquiry about Acme Franchise franchising. Do you have any questions I can help with?</p><p>Best regards,<br>The STC Franchising Team</p>",
      },
    },
    {
      actionType: "WAIT",
      nodeId: "wait-3",
      order: 7,
      delayMinutes: 10080,
      actionConfig: {},
    },
    {
      actionType: "SEND_EMAIL",
      nodeId: "action-6",
      order: 8,
      delayMinutes: 0,
      actionConfig: {
        subject: "Still interested in Acme Franchise?",
        body: "<p>Hi {{firstName}},</p><p>We haven't heard from you in a while. Are you still interested in learning more about Acme Franchise franchise opportunities?</p><p>We'd love to chat whenever you're ready.</p><p>Best,<br>The STC Franchising Team</p>",
      },
    },
  ],
  conditions: [
    {
      nodeId: "condition-1",
      field: "prospectScore",
      operator: "gte",
      value: "70",
    },
  ],
};

// =============================================================================
// Template 2: Discovery Call Prep
// =============================================================================
const discoveryCallPrep: TemplateDef = {
  name: "Discovery Call Prep",
  description:
    "Sends preparation materials and creates admin tasks when a prospect moves to the Discovery Call stage",
  triggerType: "STAGE_CHANGE",
  triggerConfig: { toStage: "DISCOVERY_CALL" },
  category: "conversion",
  flowData: {
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 250, y: 0 },
        data: { triggerType: "STAGE_CHANGE", toStage: "DISCOVERY_CALL" },
      },
      {
        id: "action-1",
        type: "action",
        position: { x: 250, y: 120 },
        data: {
          actionType: "SEND_EMAIL",
          label: "Send Prep Email",
          subject: "Preparing for your Discovery Call with Acme Franchise",
          body: "Hi {{firstName}}, ...",
        },
      },
      {
        id: "action-2",
        type: "action",
        position: { x: 250, y: 240 },
        data: {
          actionType: "CREATE_TASK",
          label: "Create Admin Task",
          title: "Prepare for discovery call with {{fullName}}",
          priority: "HIGH",
        },
      },
      {
        id: "wait-1",
        type: "wait",
        position: { x: 250, y: 360 },
        data: { delayMinutes: 1440, waitValue: 1, waitUnit: "days" },
      },
      {
        id: "action-3",
        type: "action",
        position: { x: 250, y: 480 },
        data: {
          actionType: "NOTIFY_ADMIN",
          label: "Notify Admin",
          message: "Discovery call with {{fullName}} is coming up - review their profile",
        },
      },
    ],
    edges: [
      { id: "e-trigger1-action1", source: "trigger-1", target: "action-1" },
      { id: "e-action1-action2", source: "action-1", target: "action-2" },
      { id: "e-action2-wait1", source: "action-2", target: "wait-1" },
      { id: "e-wait1-action3", source: "wait-1", target: "action-3" },
    ],
  },
  actions: [
    {
      actionType: "SEND_EMAIL",
      nodeId: "action-1",
      order: 0,
      delayMinutes: 0,
      actionConfig: {
        subject: "Preparing for your Discovery Call with Acme Franchise",
        body: "<p>Hi {{firstName}},</p><p>We're excited to connect with you for a discovery call! Here's what to expect:</p><ul><li>A 30-minute conversation about your goals</li><li>An overview of the Acme Franchise franchise model</li><li>Answers to any questions you have</li></ul><p>Looking forward to speaking with you!</p><p>Best,<br>The STC Franchising Team</p>",
      },
    },
    {
      actionType: "CREATE_TASK",
      nodeId: "action-2",
      order: 1,
      delayMinutes: 0,
      actionConfig: {
        title: "Prepare for discovery call with {{fullName}}",
        description:
          "Review prospect profile, score, and inquiry details before the discovery call.",
        priority: "HIGH",
      },
    },
    {
      actionType: "WAIT",
      nodeId: "wait-1",
      order: 2,
      delayMinutes: 1440,
      actionConfig: {},
    },
    {
      actionType: "NOTIFY_ADMIN",
      nodeId: "action-3",
      order: 3,
      delayMinutes: 0,
      actionConfig: {
        message:
          "Discovery call with {{fullName}} is coming up - review their profile",
      },
    },
  ],
  conditions: [],
};

// =============================================================================
// Template 3: Pre-Work Nudge
// =============================================================================
const preWorkNudge: TemplateDef = {
  name: "Pre-Work Nudge",
  description:
    "Sends encouragement emails to prospects who haven't completed pre-work after 7 days of inactivity",
  triggerType: "INACTIVITY",
  triggerConfig: { inactivityDays: 7 },
  category: "conversion",
  flowData: {
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 250, y: 0 },
        data: { triggerType: "INACTIVITY", inactivityDays: 7 },
      },
      {
        id: "action-1",
        type: "action",
        position: { x: 250, y: 120 },
        data: {
          actionType: "SEND_EMAIL",
          label: "Send Check-in Email",
          subject: "How's your pre-work going?",
          body: "Hi {{firstName}}, ...",
        },
      },
      {
        id: "wait-1",
        type: "wait",
        position: { x: 250, y: 240 },
        data: { delayMinutes: 10080, waitValue: 7, waitUnit: "days" },
      },
      {
        id: "condition-1",
        type: "condition",
        position: { x: 250, y: 360 },
        data: { field: "preWorkStatus", operator: "eq", value: "APPROVED" },
      },
      {
        id: "action-2",
        type: "action",
        position: { x: 250, y: 480 },
        data: {
          actionType: "SEND_EMAIL",
          label: "Send Help Email",
          subject: "Need help with your pre-work?",
          body: "Hi {{firstName}}, ...",
        },
      },
      {
        id: "action-3",
        type: "action",
        position: { x: 250, y: 600 },
        data: {
          actionType: "CREATE_TASK",
          label: "Create Follow-up Task",
          title: "Follow up on stalled pre-work for {{fullName}}",
          priority: "MEDIUM",
        },
      },
    ],
    edges: [
      { id: "e-trigger1-action1", source: "trigger-1", target: "action-1" },
      { id: "e-action1-wait1", source: "action-1", target: "wait-1" },
      { id: "e-wait1-condition1", source: "wait-1", target: "condition-1" },
      {
        id: "e-condition1-no-action2",
        source: "condition-1",
        sourceHandle: "no",
        target: "action-2",
      },
      { id: "e-action2-action3", source: "action-2", target: "action-3" },
    ],
  },
  actions: [
    {
      actionType: "SEND_EMAIL",
      nodeId: "action-1",
      order: 0,
      delayMinutes: 0,
      actionConfig: {
        subject: "How's your pre-work going?",
        body: "<p>Hi {{firstName}},</p><p>We noticed you started your pre-work modules but haven't been back in a while. How's everything going?</p><p>The pre-work is an important step in the franchise process, and we're here to help if you have any questions.</p><p>Best,<br>The STC Franchising Team</p>",
      },
    },
    {
      actionType: "WAIT",
      nodeId: "wait-1",
      order: 1,
      delayMinutes: 10080,
      actionConfig: {},
    },
    {
      actionType: "SEND_EMAIL",
      nodeId: "action-2",
      order: 2,
      delayMinutes: 0,
      actionConfig: {
        subject: "Need help with your pre-work?",
        body: "<p>Hi {{firstName}},</p><p>We want to make sure you have everything you need to complete your pre-work. Is there anything we can help with?</p><p>Feel free to reach out anytime - we're happy to answer questions or walk you through the process.</p><p>Best,<br>The STC Franchising Team</p>",
      },
    },
    {
      actionType: "CREATE_TASK",
      nodeId: "action-3",
      order: 3,
      delayMinutes: 0,
      actionConfig: {
        title: "Follow up on stalled pre-work for {{fullName}}",
        description:
          "Prospect has been inactive on pre-work for 14+ days. Consider a personal phone call.",
        priority: "MEDIUM",
      },
    },
  ],
  conditions: [
    {
      nodeId: "condition-1",
      field: "preWorkStatus",
      operator: "eq",
      value: "APPROVED",
    },
  ],
};

// =============================================================================
// Template 4: Stale Lead Re-engagement
// =============================================================================
const staleLeadReengagement: TemplateDef = {
  name: "Stale Lead Re-engagement",
  description:
    "Re-engages leads who have been inactive for 14 days with targeted follow-ups based on their score",
  triggerType: "INACTIVITY",
  triggerConfig: { inactivityDays: 14 },
  category: "retention",
  flowData: {
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 250, y: 0 },
        data: { triggerType: "INACTIVITY", inactivityDays: 14 },
      },
      {
        id: "action-1",
        type: "action",
        position: { x: 250, y: 120 },
        data: {
          actionType: "SEND_EMAIL",
          label: "Send Check-in Email",
          subject: "Checking in - Acme Franchise",
          body: "Hi {{firstName}}, ...",
        },
      },
      {
        id: "wait-1",
        type: "wait",
        position: { x: 250, y: 240 },
        data: { delayMinutes: 10080, waitValue: 7, waitUnit: "days" },
      },
      {
        id: "condition-1",
        type: "condition",
        position: { x: 250, y: 360 },
        data: { field: "prospectScore", operator: "gte", value: "50" },
      },
      {
        id: "action-2",
        type: "action",
        position: { x: 500, y: 360 },
        data: {
          actionType: "CREATE_TASK",
          label: "Create Re-engagement Task",
          title: "Re-engage high-potential lead {{fullName}}",
          priority: "HIGH",
        },
      },
      {
        id: "action-3",
        type: "action",
        position: { x: 500, y: 480 },
        data: {
          actionType: "NOTIFY_ADMIN",
          label: "Notify Admin",
          message: "High-potential stale lead {{fullName}} needs personal outreach",
        },
      },
      {
        id: "action-4",
        type: "action",
        position: { x: 250, y: 480 },
        data: {
          actionType: "ADD_NOTE",
          label: "Add Note",
          content: "Lead has been inactive for 21+ days with low score. Moved to passive nurture.",
        },
      },
    ],
    edges: [
      { id: "e-trigger1-action1", source: "trigger-1", target: "action-1" },
      { id: "e-action1-wait1", source: "action-1", target: "wait-1" },
      { id: "e-wait1-condition1", source: "wait-1", target: "condition-1" },
      {
        id: "e-condition1-yes-action2",
        source: "condition-1",
        sourceHandle: "yes",
        target: "action-2",
      },
      { id: "e-action2-action3", source: "action-2", target: "action-3" },
      {
        id: "e-condition1-no-action4",
        source: "condition-1",
        sourceHandle: "no",
        target: "action-4",
      },
    ],
  },
  actions: [
    {
      actionType: "SEND_EMAIL",
      nodeId: "action-1",
      order: 0,
      delayMinutes: 0,
      actionConfig: {
        subject: "Checking in - Acme Franchise",
        body: "<p>Hi {{firstName}},</p><p>It's been a little while since we last connected. We wanted to check in and see if you're still interested in learning about Acme Franchise franchise opportunities.</p><p>Our team is here whenever you're ready to take the next step.</p><p>Warm regards,<br>The STC Franchising Team</p>",
      },
    },
    {
      actionType: "WAIT",
      nodeId: "wait-1",
      order: 1,
      delayMinutes: 10080,
      actionConfig: {},
    },
    {
      actionType: "CREATE_TASK",
      nodeId: "action-2",
      order: 2,
      delayMinutes: 0,
      actionConfig: {
        title: "Re-engage high-potential lead {{fullName}}",
        description:
          "This lead scored 50+ but has been inactive for 21+ days. Consider a personal phone call or custom email.",
        priority: "HIGH",
      },
    },
    {
      actionType: "NOTIFY_ADMIN",
      nodeId: "action-3",
      order: 3,
      delayMinutes: 0,
      actionConfig: {
        message:
          "High-potential stale lead {{fullName}} needs personal outreach",
      },
    },
    {
      actionType: "ADD_NOTE",
      nodeId: "action-4",
      order: 4,
      delayMinutes: 0,
      actionConfig: {
        content:
          "Lead has been inactive for 21+ days with low score. Moved to passive nurture.",
      },
    },
  ],
  conditions: [
    {
      nodeId: "condition-1",
      field: "prospectScore",
      operator: "gte",
      value: "50",
    },
  ],
};

// =============================================================================
// Upsert helper
// =============================================================================
async function upsertTemplate(template: TemplateDef) {
  const existing = await prisma.workflowTrigger.findFirst({
    where: { name: template.name, isTemplate: true },
  });

  if (existing) {
    // Delete old actions and conditions, then update
    await prisma.workflowAction.deleteMany({
      where: { triggerId: existing.id },
    });
    await prisma.workflowCondition.deleteMany({
      where: { triggerId: existing.id },
    });
    await prisma.workflowTrigger.update({
      where: { id: existing.id },
      data: {
        description: template.description,
        triggerType: template.triggerType,
        triggerConfig: template.triggerConfig,
        category: template.category,
        flowData: template.flowData,
        isTemplate: true,
        isActive: false,
      },
    });

    // Recreate actions
    for (const action of template.actions) {
      await prisma.workflowAction.create({
        data: {
          triggerId: existing.id,
          actionType: action.actionType,
          actionConfig: action.actionConfig,
          delayMinutes: action.delayMinutes,
          order: action.order,
          nodeId: action.nodeId,
        },
      });
    }

    // Recreate conditions
    for (const condition of template.conditions) {
      await prisma.workflowCondition.create({
        data: {
          triggerId: existing.id,
          nodeId: condition.nodeId,
          field: condition.field,
          operator: condition.operator,
          value: condition.value,
        },
      });
    }

    console.log(`  Updated: ${template.name}`);
  } else {
    // Create new template with nested actions and conditions
    const created = await prisma.workflowTrigger.create({
      data: {
        name: template.name,
        description: template.description,
        triggerType: template.triggerType,
        triggerConfig: template.triggerConfig,
        category: template.category,
        flowData: template.flowData,
        isTemplate: true,
        isActive: false,
        actions: {
          create: template.actions.map((a) => ({
            actionType: a.actionType,
            actionConfig: a.actionConfig,
            delayMinutes: a.delayMinutes,
            order: a.order,
            nodeId: a.nodeId,
          })),
        },
        conditions: {
          create: template.conditions.map((c) => ({
            nodeId: c.nodeId,
            field: c.field,
            operator: c.operator,
            value: c.value,
          })),
        },
      },
    });

    console.log(`  Created: ${template.name}`);
  }
}

// =============================================================================
// Main
// =============================================================================
async function seedWorkflowTemplates() {
  console.log("Seeding workflow templates...");

  await upsertTemplate(newLeadConnection);
  await upsertTemplate(discoveryCallPrep);
  await upsertTemplate(preWorkNudge);
  await upsertTemplate(staleLeadReengagement);

  console.log("Seeded 4 workflow templates");
}

seedWorkflowTemplates()
  .catch((e) => {
    console.error("Error seeding workflow templates:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
