/**
 * Email notifications for Academy modules
 */

import { sendEmail } from "./sendgrid";

const ADMIN_EMAILS = [
  "franchising@acmefranchise.com",
  "admin@acmefranchise.com",
];

interface ProspectInfo {
  firstName: string;
  lastName: string;
  email: string;
}

interface TaskInfo {
  title: string;
  slug: string;
  franchisorActionText?: string | null;
}

/**
 * Notify franchisor when a franchisee completes a module that requires franchisor action
 */
export async function notifyFranchisorTaskReady(
  prospect: ProspectInfo,
  task: TaskInfo
) {
  const hasAction = !!task.franchisorActionText;
  const subjectPrefix = hasAction ? "[Action Required]" : "[Completed]";
  const heading = hasAction
    ? `Action Required: ${prospect.firstName} ${prospect.lastName}`
    : `Step Completed: ${prospect.firstName} ${prospect.lastName}`;
  const intro = hasAction
    ? "A new task requires your attention:"
    : `${prospect.firstName} ${prospect.lastName} completed a step in their onboarding:`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2D2F8E;">${heading}</h2>

      <p>${intro}</p>

      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0; font-weight: bold;">Step: ${task.title}</p>
        ${hasAction ? `<p style="margin: 0; color: #666;">Action: ${task.franchisorActionText}</p>` : ""}
      </div>

      <p>
        <a href="${process.env.NEXTAUTH_URL || "https://franchise-stc-993771038de6.herokuapp.com"}/admin/learning/todos"
           style="display: inline-block; background: #2D2F8E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          View Todo List
        </a>
      </p>

      <p style="color: #666; font-size: 14px;">
        Franchisee: ${prospect.firstName} ${prospect.lastName} (${prospect.email})
      </p>
    </div>
  `;

  const subjectText = hasAction
    ? task.franchisorActionText
    : `${prospect.firstName} ${prospect.lastName} completed "${task.title}"`;

  try {
    await sendEmail({
      to: ADMIN_EMAILS,
      subject: `${subjectPrefix} ${subjectText}`,
      html,
    });
    console.log(`Sent franchisor notification for module: ${task.title}`);
  } catch (error) {
    console.error("Failed to send franchisor notification:", error);
  }
}

/**
 * Notify franchisee when franchisor completes a module for them
 */
export async function notifyFranchiseeTaskCompleted(
  prospect: ProspectInfo,
  task: TaskInfo
) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2D2F8E;">Task Completed!</h2>

      <p>Hi ${prospect.firstName},</p>

      <p>Great news! The following task has been completed:</p>

      <div style="background: #e8fbff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #34B256;">
        <p style="margin: 0; font-weight: bold; color: #2D2F8E;">${task.title}</p>
      </div>

      <p>You can view your full progress in the Story Time Academy portal:</p>

      <p>
        <a href="${process.env.NEXTAUTH_URL || "https://franchise-stc-993771038de6.herokuapp.com"}/portal/learning"
           style="display: inline-block; background: #34B256; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          View My Learning Center
        </a>
      </p>

      <p style="color: #666; margin-top: 30px;">
        Keep up the great work!<br>
        - The Acme Franchise Team
      </p>
    </div>
  `;

  try {
    await sendEmail({
      to: prospect.email,
      subject: `Task Completed: ${task.title}`,
      html,
    });
    console.log(`Sent task completion notification to ${prospect.email}`);
  } catch (error) {
    console.error("Failed to send franchisee notification:", error);
  }
}

/**
 * Notify franchisee about overdue modules (called from a cron job)
 */
export async function notifyOverdueTasks(
  prospect: ProspectInfo,
  tasks: { title: string; targetDay: number; daysOverdue: number }[]
) {
  if (tasks.length === 0) return;

  const taskList = tasks
    .map(
      (t) => `
        <li style="margin-bottom: 10px;">
          <strong>${t.title}</strong>
          <br><span style="color: #dc2626; font-size: 14px;">${t.daysOverdue} day${t.daysOverdue > 1 ? "s" : ""} overdue</span>
        </li>
      `
    )
    .join("");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2D2F8E;">Friendly Reminder: Tasks Need Attention</h2>

      <p>Hi ${prospect.firstName},</p>

      <p>You have ${tasks.length} task${tasks.length > 1 ? "s" : ""} that ${tasks.length > 1 ? "are" : "is"} past the target completion date:</p>

      <ul style="background: #fef2f2; padding: 20px 20px 20px 40px; border-radius: 8px; margin: 20px 0;">
        ${taskList}
      </ul>

      <p>Don't worry - we're here to help you catch up! If you're facing any blockers, please reach out to your franchise support team.</p>

      <p>
        <a href="${process.env.NEXTAUTH_URL || "https://franchise-stc-993771038de6.herokuapp.com"}/portal/learning"
           style="display: inline-block; background: #2D2F8E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          View My Learning Center
        </a>
      </p>

      <p style="color: #666; margin-top: 30px;">
        We believe in you!<br>
        - The Acme Franchise Team
      </p>
    </div>
  `;

  try {
    await sendEmail({
      to: prospect.email,
      subject: `Reminder: ${tasks.length} task${tasks.length > 1 ? "s" : ""} need${tasks.length === 1 ? "s" : ""} your attention`,
      html,
    });
    console.log(`Sent overdue notification to ${prospect.email}`);
  } catch (error) {
    console.error("Failed to send overdue notification:", error);
  }
}

/**
 * Notify franchisee when they complete a milestone
 */
export async function notifyMilestoneComplete(
  prospect: ProspectInfo,
  task: TaskInfo,
  milestonesCompleted: number,
  totalMilestones: number
) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2D2F8E;">Milestone Achieved!</h2>

      <p>Hi ${prospect.firstName},</p>

      <p>Congratulations! You've reached a major milestone:</p>

      <div style="background: #fef9c3; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #facc29;">
        <p style="margin: 10px 0 0 0; font-weight: bold; color: #2D2F8E; font-size: 18px;">${task.title}</p>
      </div>

      <p style="text-align: center; color: #666;">
        You've completed <strong>${milestonesCompleted} of ${totalMilestones}</strong> milestones!
      </p>

      <div style="background: #e8e8e8; border-radius: 100px; height: 20px; margin: 20px 0; overflow: hidden;">
        <div style="background: linear-gradient(90deg, #34B256, #50C8DF); height: 100%; width: ${Math.round((milestonesCompleted / totalMilestones) * 100)}%;"></div>
      </div>

      <p>Keep up the amazing work! Every milestone brings you closer to a successful franchise launch.</p>

      <p>
        <a href="${process.env.NEXTAUTH_URL || "https://franchise-stc-993771038de6.herokuapp.com"}/portal/learning"
           style="display: inline-block; background: #34B256; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Continue My Learning
        </a>
      </p>

      <p style="color: #666; margin-top: 30px;">
        We're so proud of your progress!<br>
        - The Acme Franchise Team
      </p>
    </div>
  `;

  try {
    await sendEmail({
      to: prospect.email,
      subject: `Milestone Complete: ${task.title}`,
      html,
    });
    console.log(`Sent milestone notification to ${prospect.email}`);
  } catch (error) {
    console.error("Failed to send milestone notification:", error);
  }
}
