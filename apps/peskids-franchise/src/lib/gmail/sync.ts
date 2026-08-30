import { db } from "@/lib/db";
import { getGmailClient, getAdminEmails, isGmailConfigured } from "./client";
import { parseGmailMessage, emailInvolvesProspect } from "./parser";
import { EmailDirection } from "@prisma/client";

interface SyncResult {
  synced: number;
  errors: string[];
  adminsSynced: string[];
}

/**
 * Sync emails from Gmail for all admin accounts
 * Optionally filter to a specific prospect
 */
export async function syncEmails(prospectId?: string): Promise<SyncResult> {
  if (!isGmailConfigured()) {
    return {
      synced: 0,
      errors: ["Gmail integration is not configured"],
      adminsSynced: [],
    };
  }

  const adminEmails = getAdminEmails();
  const result: SyncResult = {
    synced: 0,
    errors: [],
    adminsSynced: [],
  };

  // Get all prospects (or specific one) to match emails against
  const prospects = prospectId
    ? await db.prospect.findMany({ where: { id: prospectId }, select: { id: true, email: true } })
    : await db.prospect.findMany({ select: { id: true, email: true } });

  const prospectEmailMap = new Map(prospects.map((p) => [p.email.toLowerCase(), p.id]));

  for (const adminEmail of adminEmails) {
    try {
      await syncAdminEmails(adminEmail, prospectEmailMap, result);
      result.adminsSynced.push(adminEmail);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(`${adminEmail}: ${message}`);
      console.error(`Error syncing ${adminEmail}:`, error);

      // Update sync state with error
      await db.gmailSyncState.upsert({
        where: { adminEmail },
        update: { status: "ERROR", lastError: message },
        create: { adminEmail, status: "ERROR", lastError: message },
      });
    }
  }

  return result;
}

async function syncAdminEmails(
  adminEmail: string,
  prospectEmailMap: Map<string, string>,
  result: SyncResult
): Promise<void> {
  // Update sync state to syncing
  await db.gmailSyncState.upsert({
    where: { adminEmail },
    update: { status: "SYNCING", lastError: null },
    create: { adminEmail, status: "SYNCING" },
  });

  const gmail = await getGmailClient(adminEmail);

  // Get sync state for incremental sync
  const syncState = await db.gmailSyncState.findUnique({
    where: { adminEmail },
  });

  // Build search query - emails from/to any prospect
  // For initial sync, look back 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const afterDate = Math.floor(ninetyDaysAgo.getTime() / 1000);

  // Use incremental sync if we have a history ID
  let messages: { id: string; threadId: string }[] = [];

  if (syncState?.historyId) {
    // Incremental sync using history API
    try {
      const historyResponse = await gmail.users.history.list({
        userId: "me",
        startHistoryId: syncState.historyId,
        historyTypes: ["messageAdded"],
      });

      if (historyResponse.data.history) {
        for (const historyItem of historyResponse.data.history) {
          if (historyItem.messagesAdded) {
            for (const added of historyItem.messagesAdded) {
              if (added.message?.id && added.message?.threadId) {
                messages.push({
                  id: added.message.id,
                  threadId: added.message.threadId,
                });
              }
            }
          }
        }
      }
    } catch (error) {
      // History may be expired, fall back to full sync
      console.log("History expired, falling back to full sync");
      messages = await fetchRecentMessages(gmail, afterDate);
    }
  } else {
    // Full sync
    messages = await fetchRecentMessages(gmail, afterDate);
  }

  // Process each message
  for (const messageRef of messages) {
    try {
      // Skip if already synced
      const existing = await db.crmEmail.findUnique({
        where: { gmailMessageId: messageRef.id },
      });
      if (existing) continue;

      // Fetch full message
      const messageResponse = await gmail.users.messages.get({
        userId: "me",
        id: messageRef.id,
        format: "full",
      });

      const parsed = parseGmailMessage(messageResponse.data, adminEmail);
      if (!parsed) continue;

      // Find which prospect this email belongs to
      let matchedProspectId: string | null = null;

      // Check from email
      if (prospectEmailMap.has(parsed.fromEmail)) {
        matchedProspectId = prospectEmailMap.get(parsed.fromEmail)!;
      }

      // Check to emails
      if (!matchedProspectId) {
        for (const toEmail of parsed.toEmails) {
          if (prospectEmailMap.has(toEmail)) {
            matchedProspectId = prospectEmailMap.get(toEmail)!;
            break;
          }
        }
      }

      // Check cc emails
      if (!matchedProspectId) {
        for (const ccEmail of parsed.ccEmails) {
          if (prospectEmailMap.has(ccEmail)) {
            matchedProspectId = prospectEmailMap.get(ccEmail)!;
            break;
          }
        }
      }

      // Skip if no prospect match
      if (!matchedProspectId) continue;

      // Save to database
      await db.crmEmail.create({
        data: {
          prospectId: matchedProspectId,
          gmailMessageId: parsed.messageId,
          gmailThreadId: parsed.threadId,
          direction: parsed.direction as EmailDirection,
          fromEmail: parsed.fromEmail,
          fromName: parsed.fromName,
          toEmails: parsed.toEmails,
          ccEmails: parsed.ccEmails,
          subject: parsed.subject,
          bodyPreview: parsed.bodyPreview,
          bodyHtml: parsed.bodyHtml,
          hasAttachments: parsed.hasAttachments,
          attachmentNames: parsed.attachmentNames,
          sentAt: parsed.sentAt,
          adminEmail,
        },
      });

      result.synced++;
    } catch (error) {
      console.error(`Error processing message ${messageRef.id}:`, error);
    }
  }

  // Get current history ID for next incremental sync
  const profile = await gmail.users.getProfile({ userId: "me" });
  const newHistoryId = profile.data.historyId;

  // Update sync state
  await db.gmailSyncState.update({
    where: { adminEmail },
    data: {
      status: "IDLE",
      lastSyncedAt: new Date(),
      historyId: newHistoryId || undefined,
      lastError: null,
    },
  });
}

async function fetchRecentMessages(
  gmail: ReturnType<typeof getGmailClient> extends Promise<infer T> ? T : never,
  afterTimestamp: number
): Promise<{ id: string; threadId: string }[]> {
  const messages: { id: string; threadId: string }[] = [];
  let pageToken: string | undefined;

  do {
    const response = await gmail.users.messages.list({
      userId: "me",
      q: `after:${afterTimestamp}`,
      maxResults: 100,
      pageToken,
    });

    if (response.data.messages) {
      for (const msg of response.data.messages) {
        if (msg.id && msg.threadId) {
          messages.push({ id: msg.id, threadId: msg.threadId });
        }
      }
    }

    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken && messages.length < 500); // Limit to 500 messages per sync

  return messages;
}

/**
 * Get sync status for all admin accounts
 */
export async function getSyncStatus(): Promise<
  Array<{
    adminEmail: string;
    lastSyncedAt: Date | null;
    status: string;
    lastError: string | null;
  }>
> {
  const states = await db.gmailSyncState.findMany({
    orderBy: { adminEmail: "asc" },
  });

  return states.map((s) => ({
    adminEmail: s.adminEmail,
    lastSyncedAt: s.lastSyncedAt,
    status: s.status,
    lastError: s.lastError,
  }));
}
