import { randomUUID } from 'node:crypto';
import { getGoHighLevelService } from '../service.js';
import { logger } from '../../../observability/logger.js';
import type { Contact, Task } from '../types.js';

/**
 * AI-powered lead follow-up workflow for GoHighLevel
 * Orchestrates: fetch contact → generate personalized message → send → track
 */

export interface AIFollowupConfig {
  tenantId: string;
  contactId?: string;
  filters?: {
    status?: 'lead' | 'prospect' | 'customer';
    source?: string;
    limit?: number;
  };
  automationRules?: {
    daysSinceLastInteraction?: number;
    excludeStatuses?: string[];
  };
  messageContext?: {
    businessName?: string;
    ownerName?: string;
    serviceType?: string;
  };
}

export interface AIFollowupResult {
  success: boolean;
  contactsProcessed: number;
  messagesSent: number;
  errors: string[];
  tasks: Array<{
    contactId: string;
    contactName: string;
    messageSent: boolean;
    taskCreated: boolean;
    messagePreview: string;
    error?: string;
  }>;
}

/**
 * Generate a personalized AI follow-up message for a contact
 */
async function generateFollowupMessage(
  contact: Contact,
  messageContext: AIFollowupConfig['messageContext']
): Promise<string> {
  const systemPrompt = `You are an AI assistant helping small business owners stay in touch with clients.
Generate a brief, personalized follow-up message that:
- Is warm and conversational (not robotic)
- References the client's service/history if available
- Has a clear call-to-action
- Is under 150 characters (mobile-friendly)
- Can be sent via WhatsApp, SMS, or email`;

  const userPrompt = `Generate a follow-up message for this client:
Name: ${contact.firstName || ''} ${contact.lastName || ''}
Last interaction: ${contact.lastInteraction || 'Not specified'}
Service: ${messageContext?.serviceType || 'Not specified'}
Business: ${messageContext?.businessName || 'Not specified'}
Owner: ${messageContext?.ownerName || 'Not specified'}

Return ONLY the message text, no quotes or formatting.`;

  try {
    const gatewayUrl = process.env.LLM_GATEWAY_URL || 'http://localhost:3010';

    const response = await fetch(`${gatewayUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 200,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Gateway error: ${response.status}`);
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      error?: string;
    };

    if (data.content && data.content.length > 0) {
      const textContent = data.content.find((block) => block.type === 'text');
      return textContent?.text || '';
    }

    return '';
  } catch (error) {
    logger.error('Failed to generate followup message', {
      contactId: contact.id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Process a single contact: generate message, send it, and create task
 */
async function processContact(
  contact: Contact,
  ghlService: ReturnType<typeof getGoHighLevelService>,
  config: AIFollowupConfig
): Promise<{
  success: boolean;
  messageSent: boolean;
  taskCreated: boolean;
  messagePreview: string;
  error?: string;
}> {
  try {
    // Generate personalized message
    const message = await generateFollowupMessage(contact, config.messageContext);

    if (!message) {
      return {
        success: false,
        messageSent: false,
        taskCreated: false,
        messagePreview: '',
        error: 'Failed to generate message',
      };
    }

    // Determine preferred channel (prefer WhatsApp if phone available, else email)
    const channel = contact.phone ? ('whatsapp' as const) : ('email' as const);

    // Send message
    const sendResult = await ghlService.sendMessage(config.tenantId, {
      contactId: contact.id,
      channel,
      subject: channel === 'email' ? 'Quick Update' : undefined,
      body: message,
    });

    // Create follow-up task (for manual review if needed)
    const task: Task = {
      id: randomUUID(),
      contactId: contact.id,
      title: `Follow-up: ${contact.firstName || 'Contact'}`,
      description: `AI-generated follow-up sent via ${channel}. Review response and next steps.`,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'open',
      priority: 'medium',
    };

    const taskResult = await ghlService.createTask(config.tenantId, task);

    return {
      success: true,
      messageSent: !!sendResult,
      taskCreated: !!taskResult,
      messagePreview: message.substring(0, 100),
    };
  } catch (error) {
    return {
      success: false,
      messageSent: false,
      taskCreated: false,
      messagePreview: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main workflow: Process multiple contacts and send AI-generated follow-ups
 */
export async function runAILeadFollowupWorkflow(config: AIFollowupConfig): Promise<AIFollowupResult> {
  const ghlService = getGoHighLevelService();
  const results: AIFollowupResult = {
    success: true,
    contactsProcessed: 0,
    messagesSent: 0,
    errors: [],
    tasks: [],
  };

  try {
    // Fetch contacts
    const filters = config.filters || {};
    const contacts = await ghlService.getContacts(config.tenantId, {
      status: filters.status,
      source: filters.source,
      limit: filters.limit || 10,
      offset: 0,
    });

    if (!contacts || contacts.length === 0) {
      logger.info('No contacts found for AI follow-up', {
        tenantId: config.tenantId,
        filters,
      });
      return results;
    }

    // Process each contact
    for (const contact of contacts) {
      results.contactsProcessed++;

      const result = await processContact(contact, ghlService, config);

      results.tasks.push({
        contactId: contact.id,
        contactName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        messageSent: result.messageSent,
        taskCreated: result.taskCreated,
        messagePreview: result.messagePreview,
        error: result.error,
      });

      if (result.messageSent) {
        results.messagesSent++;
      }

      if (!result.success && result.error) {
        results.errors.push(`Contact ${contact.id}: ${result.error}`);
      }
    }

    // Log workflow completion
    logger.info('AI lead follow-up workflow completed', {
      tenantId: config.tenantId,
      contactsProcessed: results.contactsProcessed,
      messagesSent: results.messagesSent,
      errors: results.errors.length,
    });

    results.success = results.errors.length === 0 || results.messagesSent > 0;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    results.success = false;
    results.errors.push(`Workflow error: ${errorMsg}`);

    logger.error('AI lead follow-up workflow failed', {
      tenantId: config.tenantId,
      error: errorMsg,
    });
  }

  return results;
}

/**
 * Trigger follow-up for a specific contact
 */
export async function triggerFollowupForContact(
  tenantId: string,
  contactId: string,
  messageContext?: AIFollowupConfig['messageContext']
): Promise<AIFollowupResult> {
  const ghlService = getGoHighLevelService();

  try {
    // Get contact details
    const contact = await ghlService.getContact(tenantId, contactId);

    if (!contact) {
      return {
        success: false,
        contactsProcessed: 0,
        messagesSent: 0,
        errors: ['Contact not found'],
        tasks: [],
      };
    }

    const result = await processContact(
      contact,
      ghlService,
      {
        tenantId,
        messageContext,
      }
    );

    return {
      success: result.success,
      contactsProcessed: 1,
      messagesSent: result.messageSent ? 1 : 0,
      errors: result.error ? [result.error] : [],
      tasks: [
        {
          contactId: contact.id,
          contactName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
          messageSent: result.messageSent,
          taskCreated: result.taskCreated,
          messagePreview: result.messagePreview,
          error: result.error,
        },
      ],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      contactsProcessed: 1,
      messagesSent: 0,
      errors: [errorMsg],
      tasks: [],
    };
  }
}
