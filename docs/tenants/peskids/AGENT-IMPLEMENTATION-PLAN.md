# Peskids Standalone — Agent Implementation Plan

**Document Status:** Active Implementation Phase  
**Owner:** Product Engineering  
**Last Updated:** 2026-05-21

---

## Overview

This document specifies the implementation strategy for 7 coordinated AI agents that will run on a client's VPS, automating all Peskids operations (social media, documentation, API integration, web experience, messaging with approval-first workflow, and security validation).

**Delivery Target:** Each agent deployed as a Node.js worker via BullMQ (Redis-backed job queues), coordinated by the Orchestrator-Agent via OpenClaw framework.

---

## Architecture: BullMQ Job Queue Pattern

### Queue Topology

```
Redis (message broker)
├── orchestrator:tasks          (all tasks needing coordination)
├── social_media_agent:tasks   (lead extraction, DM parsing)
├── docs_generator:tasks       (report generation, analytics)
├── api_integration:tasks      (webhook routing, CRM sync)
├── web_experience:tasks       (form analytics, optimization)
├── messaging_agent:tasks      (approval queue, send operations)
├── security_agent:tasks       (audit, RLS validation)
└── [event bus]                (cross-agent event propagation)
```

### Agent Lifecycle

Each agent follows the **BullMQ Worker** pattern:

```typescript
// Template for all agents
const redis = new Redis(process.env.REDIS_URL);
const queue = new Queue('agent-role:tasks', { connection: redis });
const worker = new Worker('agent-role:tasks', async (job) => {
  // Process job
  // Emit events to other agents
  // Return result or throw error
}, { connection: redis });

worker.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed`, result);
});

worker.on('failed', (job, error) => {
  logger.error(`Job ${job.id} failed`, error);
  // Retry or alert
});
```

### Event Propagation

```
Trigger (user action, webhook, cron)
  ↓
Event emitted to Redis pub/sub + Supabase audit log
  ↓
Orchestrator-Agent subscribes to event
  ↓
Routes to appropriate agent queue(s)
  ↓
Agent processes + emits completion event
  ↓
Other agents subscribe to completion events
  ↓
Cascade coordination
```

---

## Agent 1: Orchestrator-Agent (Coordinator)

**Role:** Central router. Consumes events and distributes work to specialized agents.

**Responsibilities:**
- Consume tasks from `orchestrator:tasks` queue
- Parse event type + payload
- Route to appropriate agent queue(s)
- Track coordination state in Redis
- Log all routing decisions

**Technology Stack:**
- Node.js + Express (optional, for health checks)
- BullMQ (job queue)
- Redis (state + pub/sub)
- Supabase (event logging)

**Implementation Outline:**

```typescript
// apps/agents/orchestrator-agent/src/index.ts

import { Queue, Worker } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import redis from './lib/redis';

const orchestratorQueue = new Queue('orchestrator:tasks', { 
  connection: redis 
});

const worker = new Worker('orchestrator:tasks', async (job) => {
  const { event_type, payload } = job.data;

  // Route based on event type
  switch (event_type) {
    case 'lead.created':
      await enqueueToQueue('social_media_agent:tasks', {
        action: 'extract_lead',
        payload
      });
      await enqueueToQueue('docs_generator:tasks', {
        action: 'update_analytics',
        entity_type: 'lead',
        payload
      });
      break;

    case 'feedback.received':
      await enqueueToQueue('docs_generator:tasks', {
        action: 'update_report',
        entity_type: 'feedback',
        payload
      });
      await enqueueToQueue('security_agent:tasks', {
        action: 'audit_feedback',
        payload
      });
      break;

    case 'message.inbound':
      await enqueueToQueue('messaging_agent:tasks', {
        action: 'prepare_for_approval',
        payload
      });
      break;

    case 'approval.given':
      await enqueueToQueue('messaging_agent:tasks', {
        action: 'send_approved_message',
        payload
      });
      break;

    default:
      logger.warn(`Unknown event type: ${event_type}`);
  }

  // Log routing decision
  await logOrchestratorAction(event_type, payload);
  
  return { status: 'routed', event_type };
}, { connection: redis });

// Coordinate with other agent completion events
redis.subscribe('agent:completed', (msg) => {
  const { agent, event, result } = JSON.parse(msg);
  logger.info(`Agent ${agent} completed ${event}`, result);
  // Trigger cascading tasks if needed
});
```

**Configuration (.env):**
```
ORCHESTRATOR_REDIS_URL=redis://:password@redis:6379
SUPABASE_URL=https://project.supabase.co
SUPABASE_SERVICE_KEY=...
LOG_LEVEL=info
```

**Testing:**
- Unit tests: Queue routing, event parsing
- Integration tests: End-to-end flow (lead created → social + docs agents triggered)

---

## Agent 2: Social-Media-Agent (DM Parser)

**Role:** Extract leads from Instagram, Facebook, TikTok. Parse DMs/comments.

**Integrations:**
- Instagram Graph API (DMs + comments)
- Facebook Messenger API
- TikTok Creator Fund API
- Meta Webhooks → n8n → REST call to agent

**Responsibilities:**
- Consume `social_media_agent:tasks` from Redis
- Parse incoming DM/comment as lead data
- Extract: sender name, email (optional), phone (optional), message content
- Validate against lead schema
- Create lead in Supabase via API
- Emit `lead.created_from_social` event
- Prepare templated response (awaiting approval)

**Implementation Outline:**

```typescript
// apps/agents/social-media-agent/src/index.ts

import { Worker } from 'bullmq';
import { InstagramApi } from './lib/instagram';
import { FacebookApi } from './lib/facebook';
import { TikTokApi } from './lib/tiktok';
import redis from './lib/redis';

const worker = new Worker('social_media_agent:tasks', async (job) => {
  const { payload } = job.data;

  // Parse incoming message based on source
  let lead;
  let source;
  
  if (payload.source === 'instagram') {
    lead = await parseInstagramDM(payload);
    source = 'instagram_dm';
  } else if (payload.source === 'facebook') {
    lead = await parseFacebookMessage(payload);
    source = 'facebook_messenger';
  } else if (payload.source === 'tiktok') {
    lead = await parseTikTokComment(payload);
    source = 'tiktok_comment';
  }

  // Validate lead schema
  const validLead = validateLeadSchema(lead);
  if (!validLead.success) {
    throw new Error(`Invalid lead: ${validLead.errors}`);
  }

  // Insert into Supabase
  const { data: insertedLead, error } = await supabase
    .from('leads')
    .insert({
      tenant_id: process.env.TENANT_ID,
      name: validLead.data.name,
      email: validLead.data.email,
      phone: validLead.data.phone,
      source,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw error;

  // Prepare response message
  const responseMessage = generateLeadResponse(lead);
  
  // Emit events
  await redis.publish('lead:created', JSON.stringify({
    lead_id: insertedLead.id,
    source,
    name: lead.name,
  }));

  // Enqueue message approval task
  await messagingQueue.add('approve_message', {
    lead_id: insertedLead.id,
    recipient_id: payload.sender_id,
    message: responseMessage,
    channel: source,
  });

  return {
    status: 'success',
    lead_id: insertedLead.id,
    message_queued_for_approval: true,
  };
}, { connection: redis });

async function parseInstagramDM(payload) {
  const instagram = new InstagramApi(process.env.INSTAGRAM_TOKEN);
  const message = await instagram.getMessage(payload.message_id);
  return {
    name: message.from.name,
    email: extractEmailFromMessage(message.text),
    phone: extractPhoneFromMessage(message.text),
    message_text: message.text,
    sender_id: message.from.id,
  };
}

// Similar for Facebook, TikTok...
```

**Configuration (.env):**
```
INSTAGRAM_TOKEN=...
FACEBOOK_TOKEN=...
TIKTOK_TOKEN=...
SOCIAL_MEDIA_REDIS_URL=redis://:password@redis:6379
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
```

**Approval-First Workflow:**
```
Social-media-agent extracts lead
  ↓
Generates response message (e.g., "Thanks for your interest! We'll follow up soon.")
  ↓
Emits "message.awaiting_approval" event
  ↓
Admin sees in dashboard with message preview
  ↓
Admin clicks "Approve & Send"
  ↓
Messaging-Agent receives approval, sends via appropriate channel
```

---

## Agent 3: Docs-Generator-Agent (Analytics + Reports)

**Role:** Generate weekly reports, analytics dashboards, content summaries.

**Responsibilities:**
- Consume `docs_generator:tasks` from Redis
- Read Supabase tables (leads, feedback, followups, messages)
- Generate:
  - Weekly parent feedback summary (satisfaction trends, key insights)
  - Lead pipeline report (new, contacted, enrolled)
  - Student progress snapshots
  - Monthly analytics (acquisition cost, enrollment rate, churn)
- Create PDF/HTML reports
- Store reports in Supabase `reports` table
- Emit `report.generated` event
- Schedule weekly cron (Monday 9 AM client timezone)

**Implementation Outline:**

```typescript
// apps/agents/docs-generator-agent/src/index.ts

import { Worker, UnrepeatableError } from 'bullmq';
import puppeteer from 'puppeteer';
import { generateWeeklyReport, generateMonthlyReport } from './lib/templates';
import redis from './lib/redis';

const worker = new Worker('docs_generator:tasks', async (job) => {
  const { action, payload } = job.data;

  switch (action) {
    case 'generate_weekly_report':
      return await generateWeeklyReport();
    
    case 'generate_monthly_report':
      return await generateMonthlyReport();
    
    case 'update_analytics':
      return await updateAnalyticsDashboard(payload);
    
    default:
      throw new UnrepeatableError(`Unknown action: ${action}`);
  }
}, { connection: redis });

async function generateWeeklyReport() {
  // Fetch data from Supabase
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .gte('created_at', oneWeekAgo())
    .eq('tenant_id', process.env.TENANT_ID);

  const { data: feedback } = await supabase
    .from('feedback')
    .select('*')
    .gte('created_at', oneWeekAgo())
    .eq('tenant_id', process.env.TENANT_ID);

  // Calculate metrics
  const metrics = {
    new_leads: leads.length,
    avg_satisfaction: calculateAvgSatisfaction(feedback),
    top_sources: getTopLeadSources(leads),
    conversion_rate: calculateConversionRate(leads),
  };

  // Generate HTML/PDF using Handlebars + Puppeteer
  const html = await renderTemplate('weekly-report.hbs', {
    metrics,
    week_ending: getWeekEndDate(),
    school_name: await getSchoolName(),
  });

  const pdf = await generatePdf(html);

  // Store in Supabase
  const { data: report, error } = await supabase
    .from('reports')
    .insert({
      tenant_id: process.env.TENANT_ID,
      type: 'weekly',
      metrics,
      pdf_url: await uploadToStorage(pdf),
      generated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw error;

  // Emit event
  await redis.publish('report:generated', JSON.stringify({
    report_id: report.id,
    type: 'weekly',
  }));

  return { status: 'success', report_id: report.id };
}

// Cron job (runs via node-cron or external scheduler)
import cron from 'node-cron';
cron.schedule('0 9 * * 1', async () => {
  // Every Monday at 9 AM UTC
  await docsGeneratorQueue.add('generate_weekly_report', {}, {
    removeOnComplete: true,
  });
});
```

**Configuration (.env):**
```
DOCS_GENERATOR_REDIS_URL=redis://:password@redis:6379
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
REPORT_TIMEZONE=America/New_York
PDF_GENERATION_TIMEOUT=30000
```

**Report Templates:**
```
templates/
├── weekly-report.hbs       # Satisfaction trends, new leads
├── monthly-report.hbs      # Enrollment metrics, cost analysis
└── student-progress.hbs    # Individual student snapshots
```

---

## Agent 4: API-Integration-Agent (Webhook Manager)

**Role:** Manage webhooks, third-party API sync, data flows.

**Responsibilities:**
- Consume `api_integration:tasks` from Redis
- Monitor webhook endpoints
- Retry failed API calls (exponential backoff)
- Sync data with client's CRM (HubSpot, Pipedrive, custom)
- Update lead status based on external systems
- Emit `lead.status_changed` events

**Implementation Outline:**

```typescript
// apps/agents/api-integration-agent/src/index.ts

import { Worker } from 'bullmq';
import axios, { AxiosError } from 'axios';
import { HubSpotClient } from '@hubspot/api-client';
import redis from './lib/redis';

const worker = new Worker('api_integration:tasks', async (job) => {
  const { action, payload } = job.data;

  switch (action) {
    case 'sync_to_hubspot':
      return await syncToHubSpot(payload);
    
    case 'sync_to_pipedrive':
      return await syncToPipedrive(payload);
    
    case 'webhook_dispatch':
      return await dispatchWebhook(payload);
    
    case 'retry_failed_webhook':
      return await retryFailedWebhook(payload);
    
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}, { 
  connection: redis,
  attempts: 5, // Retry up to 5 times
  backoff: {
    type: 'exponential',
    delay: 2000, // Start with 2 second delay
  },
});

async function syncToHubSpot(payload: any) {
  if (!process.env.HUBSPOT_API_KEY) {
    logger.warn('HubSpot sync requested but no API key configured');
    return { status: 'skipped', reason: 'not_configured' };
  }

  const hubspot = new HubSpotClient({ 
    accessToken: process.env.HUBSPOT_API_KEY 
  });

  try {
    const contact = {
      firstname: payload.name,
      email: payload.email,
      phone: payload.phone,
      lifecyclestage: 'lead',
      source: payload.source,
    };

    await hubspot.crm.contacts.basicApi.create({
      properties: contact,
    });

    await logWebhookEvent('hubspot_sync', 'success', payload);
    
    return { status: 'success', synced_to: 'hubspot' };
  } catch (error) {
    logger.error('HubSpot sync failed', error);
    await logWebhookEvent('hubspot_sync', 'failed', { 
      error: (error as Error).message,
      payload 
    });
    throw error;
  }
}

async function dispatchWebhook(payload: any): Promise<any> {
  const { url, headers, body } = payload;
  const maxRetries = 5;
  let lastError: AxiosError | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.post(url, body, {
        headers,
        timeout: 10000,
      });

      await logWebhookEvent('webhook_dispatch', 'success', {
        url,
        status: response.status,
      });

      return { status: 'success', webhook_url: url, attempt };
    } catch (error) {
      lastError = error as AxiosError;
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      
      if (attempt < maxRetries - 1) {
        logger.warn(`Webhook attempt ${attempt + 1} failed, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  await logWebhookEvent('webhook_dispatch', 'failed', {
    url,
    error: lastError?.message,
    attempts: maxRetries,
  });

  throw lastError || new Error('All webhook attempts failed');
}

async function logWebhookEvent(
  event_type: string, 
  status: string, 
  details: any
) {
  await supabase
    .from('webhook_logs')
    .insert({
      tenant_id: process.env.TENANT_ID,
      event_type,
      status,
      details,
      logged_at: new Date().toISOString(),
    });
}
```

**Configuration (.env):**
```
HUBSPOT_API_KEY=optional
PIPEDRIVE_API_KEY=optional
WEBHOOK_TIMEOUT=10000
WEBHOOK_MAX_RETRIES=5
API_INTEGRATION_REDIS_URL=redis://:password@redis:6379
```

---

## Agent 5: Web-Experience-Agent (Dashboard Optimization)

**Role:** Monitor form submission metrics, optimize dashboard UX.

**Responsibilities:**
- Monitor form submission metrics (conversion rate, abandonment rate)
- Analyze which form fields have high error rates
- Suggest form field reordering
- A/B test page copy (if enabled by client)
- Update dashboard layout based on usage patterns
- Emit `dashboard.optimization_suggested` events

**Implementation Outline:**

```typescript
// apps/agents/web-experience-agent/src/index.ts

import { Worker } from 'bullmq';
import redis from './lib/redis';

const worker = new Worker('web_experience:tasks', async (job) => {
  const { action } = job.data;

  switch (action) {
    case 'analyze_form_metrics':
      return await analyzeFormMetrics();
    
    case 'optimize_dashboard_layout':
      return await optimizeDashboardLayout();
    
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}, { connection: redis });

async function analyzeFormMetrics() {
  // Fetch form submission events
  const { data: submissions } = await supabase
    .from('form_submissions')
    .select('*')
    .gte('created_at', last30Days())
    .eq('tenant_id', process.env.TENANT_ID);

  // Calculate metrics
  const metrics = {
    total_submissions: submissions.length,
    conversion_rate: calculateConversionRate(submissions),
    abandonment_rate: calculateAbandonmentRate(submissions),
    field_errors: analyzeFieldErrors(submissions),
    avg_completion_time: calculateAvgCompletionTime(submissions),
  };

  // Suggest optimizations
  const suggestions = [];
  
  if (metrics.abandonment_rate > 0.3) {
    suggestions.push({
      type: 'form_too_long',
      severity: 'high',
      recommendation: 'Consider splitting form into 2-3 steps',
    });
  }

  if (metrics.field_errors.some(f => f.error_rate > 0.2)) {
    suggestions.push({
      type: 'field_validation_issue',
      severity: 'medium',
      fields: metrics.field_errors.filter(f => f.error_rate > 0.2),
      recommendation: 'Improve validation messages or field labels',
    });
  }

  // Store suggestions
  await supabase
    .from('optimization_suggestions')
    .insert({
      tenant_id: process.env.TENANT_ID,
      metrics,
      suggestions,
      generated_at: new Date().toISOString(),
    });

  // Emit event
  await redis.publish('dashboard:optimization_suggested', JSON.stringify({
    suggestion_count: suggestions.length,
  }));

  return { status: 'analyzed', suggestions };
}
```

**Configuration (.env):**
```
WEB_EXPERIENCE_REDIS_URL=redis://:password@redis:6379
SUPABASE_URL=...
ANALYSIS_LOOKBACK_DAYS=30
```

---

## Agent 6: Messaging-Agent (Approval-First Gateway)

**Role:** Handle WhatsApp, SMS, email with **mandatory approval** before send.

**CRITICAL:** This agent implements the approval-first workflow. **No message is sent without explicit human approval.**

**Integrations:**
- Twilio (SMS + WhatsApp)
- Resend (Email)
- Custom SMTP (optional)

**Approval-First Workflow:**

```
1. Inbound message/trigger
   ↓
2. Messaging-Agent prepares response with preview
3. Emits "message.awaiting_approval" with preview
   ↓
4. Admin sees in dashboard notification
5. Admin clicks "Preview Send" to review message
   ↓
6. Admin clicks "Approve & Send" (explicit action required)
   ↓
7. Messaging-Agent receives "approval.given" event
8. Sends via Twilio/Resend
9. Stores in Supabase `messages` table (status: sent)
10. Emits "message.sent" event
```

**Implementation Outline:**

```typescript
// apps/agents/messaging-agent/src/index.ts

import { Worker } from 'bullmq';
import twilio from 'twilio';
import { Resend } from 'resend';
import redis from './lib/redis';

const worker = new Worker('messaging_agent:tasks', async (job) => {
  const { action, payload } = job.data;

  switch (action) {
    case 'prepare_for_approval':
      return await prepareMessageForApproval(payload);
    
    case 'send_approved_message':
      return await sendApprovedMessage(payload);
    
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}, { connection: redis });

async function prepareMessageForApproval(payload: any) {
  const { lead_id, recipient_phone, recipient_email, message_type } = payload;

  // Generate message content based on template
  const messageContent = generateMessageContent(message_type, payload);

  // Create pending message record in Supabase
  const { data: pendingMessage, error } = await supabase
    .from('messages')
    .insert({
      tenant_id: process.env.TENANT_ID,
      lead_id,
      recipient_phone,
      recipient_email,
      content: messageContent,
      status: 'awaiting_approval',
      message_type,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw error;

  // Emit event for admin dashboard
  await redis.publish('message:awaiting_approval', JSON.stringify({
    message_id: pendingMessage.id,
    lead_id,
    preview: messageContent.slice(0, 100) + '...',
    recipient: recipient_phone || recipient_email,
  }));

  // Also notify admin via Discord/Slack
  await notifyAdminOfPendingApproval(pendingMessage.id, messageContent);

  return {
    status: 'queued_for_approval',
    message_id: pendingMessage.id,
  };
}

async function sendApprovedMessage(payload: any) {
  const { message_id, approved_by } = payload;

  // Fetch message
  const { data: message, error: fetchError } = await supabase
    .from('messages')
    .select('*')
    .eq('id', message_id)
    .single();

  if (fetchError) throw fetchError;

  // Double-check status is still awaiting_approval
  if (message.status !== 'awaiting_approval') {
    throw new Error(`Message ${message_id} is not in awaiting_approval state`);
  }

  // Send based on channel
  let sent_via = '';
  try {
    if (message.recipient_phone && message.message_type === 'whatsapp') {
      sent_via = await sendViaWhatsApp(
        message.recipient_phone,
        message.content
      );
    } else if (message.recipient_phone && message.message_type === 'sms') {
      sent_via = await sendViaSMS(
        message.recipient_phone,
        message.content
      );
    } else if (message.recipient_email && message.message_type === 'email') {
      sent_via = await sendViaEmail(
        message.recipient_email,
        message.content
      );
    }

    // Update message status
    await supabase
      .from('messages')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_via,
        approved_by,
      })
      .eq('id', message_id);

    // Emit event
    await redis.publish('message:sent', JSON.stringify({
      message_id,
      sent_via,
    }));

    logger.info(`Message ${message_id} sent successfully via ${sent_via}`);
    
    return {
      status: 'sent',
      message_id,
      sent_via,
    };
  } catch (error) {
    // Update message as failed
    await supabase
      .from('messages')
      .update({
        status: 'failed',
        error: (error as Error).message,
      })
      .eq('id', message_id);

    // Emit event
    await redis.publish('message:failed', JSON.stringify({
      message_id,
      error: (error as Error).message,
    }));

    throw error;
  }
}

async function sendViaWhatsApp(phone: string, content: string): Promise<string> {
  const twiliClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  const message = await twiliClient.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${phone}`,
    body: content,
  });

  return `whatsapp:${message.sid}`;
}

async function sendViaSMS(phone: string, content: string): Promise<string> {
  const twiliClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  const message = await twiliClient.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
    body: content,
  });

  return `sms:${message.sid}`;
}

async function sendViaEmail(email: string, content: string): Promise<string> {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const result = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: email,
    subject: 'Follow-up from ' + (await getSchoolName()),
    html: content,
  });

  return `email:${result.id}`;
}

async function notifyAdminOfPendingApproval(
  message_id: string,
  preview: string
) {
  // Send Discord notification (if webhook configured)
  if (process.env.DISCORD_WEBHOOK_URL) {
    await axios.post(process.env.DISCORD_WEBHOOK_URL, {
      embeds: [{
        title: '📬 Message Awaiting Approval',
        description: preview,
        fields: [
          {
            name: 'Message ID',
            value: message_id,
            inline: true,
          },
          {
            name: 'Action Required',
            value: 'Click "Approve & Send" in the Peskids dashboard',
          },
        ],
        color: 3066993, // Yellow
      }],
    });
  }
}
```

**Configuration (.env):**
```
MESSAGING_REDIS_URL=redis://:password@redis:6379
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...

# Twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
TWILIO_WHATSAPP_NUMBER=+1...

# Resend
RESEND_API_KEY=...
RESEND_FROM_EMAIL=noreply@...

# Notifications
DISCORD_WEBHOOK_URL=optional
```

**Safety Guarantees:**
- ✅ All messages stored in `awaiting_approval` state before any send attempt
- ✅ Admin must explicitly click "Approve & Send" (not automatic)
- ✅ Each approval logged with `approved_by` user ID + timestamp
- ✅ Failed sends logged with error details
- ✅ Audit trail in Supabase for compliance

---

## Agent 7: Security-Agent (RLS Validator)

**Role:** Validate requests, manage RLS policies, audit access.

**Responsibilities:**
- Consume `security_agent:tasks` from Redis
- Validate incoming requests (JWT, API keys)
- Enforce RLS policies (tenant isolation)
- Check rate limits
- Monitor for suspicious activity
- Log all access attempts
- Emit `security.violation` events on anomalies
- Update RLS policies when tenant permissions change

**Implementation Outline:**

```typescript
// apps/agents/security-agent/src/index.ts

import { Worker } from 'bullmq';
import jwt from 'jsonwebtoken';
import redis from './lib/redis';

const worker = new Worker('security_agent:tasks', async (job) => {
  const { action, payload } = job.data;

  switch (action) {
    case 'validate_request':
      return await validateRequest(payload);
    
    case 'audit_data_access':
      return await auditDataAccess(payload);
    
    case 'check_rate_limit':
      return await checkRateLimit(payload);
    
    case 'detect_anomalies':
      return await detectAnomalies(payload);
    
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}, { connection: redis });

async function validateRequest(payload: any) {
  const { token, ip_address, user_agent } = payload;

  try {
    // Verify JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'dev-secret'
    ) as any;

    // Check token hasn't been revoked
    const isRevoked = await redis.get(`revoked_token:${token}`);
    if (isRevoked) {
      throw new Error('Token has been revoked');
    }

    // Log access
    await logAccessAttempt({
      user_id: decoded.sub,
      ip_address,
      user_agent,
      status: 'success',
    });

    return {
      status: 'valid',
      user_id: decoded.sub,
      tenant_id: decoded.tenant_id,
      permissions: decoded.permissions,
    };
  } catch (error) {
    // Log failed attempt
    await logAccessAttempt({
      ip_address,
      user_agent,
      status: 'failed',
      error: (error as Error).message,
    });

    // Emit security event
    await redis.publish('security:violation', JSON.stringify({
      type: 'invalid_token',
      ip_address,
    }));

    throw error;
  }
}

async function auditDataAccess(payload: any) {
  const { user_id, tenant_id, table, operation } = payload;

  // Log access
  await supabase
    .from('audit_logs')
    .insert({
      user_id,
      tenant_id,
      table,
      operation,
      timestamp: new Date().toISOString(),
    });

  // Check for suspicious patterns
  const recentAccesses = await redis.lrange(
    `user_accesses:${user_id}`,
    0,
    100
  );

  if (detectSuspiciousPattern(recentAccesses)) {
    await redis.publish('security:alert', JSON.stringify({
      type: 'suspicious_access_pattern',
      user_id,
      action_required: 'review',
    }));
  }

  return { status: 'logged' };
}

async function checkRateLimit(payload: any) {
  const { user_id, endpoint } = payload;
  const key = `ratelimit:${user_id}:${endpoint}`;
  const limit = 100; // 100 requests
  const window = 3600; // per hour

  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, window);
  }

  if (count > limit) {
    await redis.publish('security:alert', JSON.stringify({
      type: 'rate_limit_exceeded',
      user_id,
      endpoint,
    }));

    throw new Error('Rate limit exceeded');
  }

  return {
    status: 'within_limit',
    remaining: limit - count,
  };
}

async function detectAnomalies(payload: any) {
  // Check for unusual data access patterns
  // Check for bulk data exports
  // Check for access from unusual locations/times
  // Return alerts
  return { status: 'scan_complete', anomalies_found: 0 };
}

async function logAccessAttempt(details: any) {
  await supabase
    .from('access_logs')
    .insert({
      ...details,
      logged_at: new Date().toISOString(),
    });
}

function detectSuspiciousPattern(accesses: string[]): boolean {
  // Heuristics for suspicious patterns
  // E.g., large number of different tables accessed in short time
  return accesses.length > 50 && new Date().getTime() - 300000 < Date.now();
}
```

**Configuration (.env):**
```
SECURITY_REDIS_URL=redis://:password@redis:6379
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
JWT_SECRET=...
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_SECONDS=3600
```

**RLS Policy Example (in Supabase):**
```sql
-- Prevent non-owners from seeing other tenant's data
CREATE POLICY tenant_isolation ON leads
  USING (tenant_id = current_setting('app.settings.tenant_id')::text);

CREATE POLICY tenant_isolation ON messages
  USING (tenant_id = current_setting('app.settings.tenant_id')::text);

CREATE POLICY audit_logs_immutable ON audit_logs
  AS RESTRICTIVE
  USING (true)
  WITH CHECK (false); -- Prevent updates/deletes
```

---

## Deployment on Client VPS

### Docker Compose Stack (infra/docker-compose.yml)

```yaml
version: '3.8'

services:
  # Reverse proxy
  nginx:
    image: nginx:latest
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs/:/etc/nginx/certs/:ro

  # Core database
  supabase-db:
    image: supabase/postgres:latest
    environment:
      POSTGRES_DB: peskids
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data

  # Message broker + cache
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes

  # Web app
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports: ["3000:3000"]
    environment:
      NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379

  # 7 Agents
  orchestrator-agent:
    build: ./apps/agents/orchestrator-agent
    environment:
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      AGENT_ROLE: orchestrator

  social-media-agent:
    build: ./apps/agents/social-media-agent
    environment:
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      INSTAGRAM_TOKEN: ${INSTAGRAM_TOKEN}

  # ... (docs-generator, api-integration, web-experience, messaging, security agents)

  # Workflow automation
  n8n:
    image: n8nio/n8n:latest
    ports: ["5678:5678"]
    environment:
      N8N_HOST: ${CLIENT_DOMAIN}
      DB_TYPE: postgresdb

  # Monitoring
  uptime-kuma:
    image: louislam/uptime-kuma:latest
    ports: ["3001:3001"]
    volumes:
      - kuma-data:/app/data
```

### One-Click Setup Script

```bash
#!/bin/bash
# scripts/setup-client-vps.sh

set -e

echo "Peskids VPS Setup"

# 1. Install Docker
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  rm get-docker.sh
fi

# 2. Generate .env
cp .env.example .env
read -p "Enter Supabase URL: " SUPABASE_URL
sed -i "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}|" .env

# ... (more prompts)

# 3. Generate SSL certs
mkdir -p infra/certs
openssl req -x509 -newkey rsa:4096 \
  -keyout infra/certs/key.pem \
  -out infra/certs/cert.pem \
  -days 365 -nodes -subj "/CN=${CLIENT_DOMAIN}"

# 4. Start services
docker-compose -f infra/docker-compose.yml up -d

# 5. Run migrations
docker-compose -f infra/docker-compose.yml exec -T supabase-db \
  psql -U postgres -d peskids -f /migrations/001_peskids_base.sql

# 6. Health check
./scripts/health-check.sh

echo "✅ Setup complete!"
```

---

## Testing Strategy

### Unit Tests (per agent)
- Job processing logic
- Message formatting
- Data validation
- Error handling

### Integration Tests
- End-to-end flow: lead created → social + docs agents triggered
- Approval workflow: message prepared → approved → sent
- Retry logic on failure

### Load Testing
- 100 concurrent jobs in queue
- Redis memory usage
- Database connection pooling

---

## Monitoring & Observability

### Metrics to Track
- Jobs processed per second (throughput)
- Job success/failure rates (per agent)
- Queue depth (backlog)
- Message approval latency
- End-to-end latency (lead submission → dashboard update)

### Alerts
- Queue depth > 1000
- Agent failure rate > 5%
- Message approval timeout > 30 minutes
- Supabase connection errors

---

## Rollout Plan

### Phase 1: Local Development
- Implement all 7 agents
- Test end-to-end flow with Docker Compose
- Load testing

### Phase 2: Staging VPS
- Deploy to test VPS
- Run with real Instagram/Facebook tokens (test accounts)
- Verify approval workflow with test messages

### Phase 3: Production Client VPS
- One-click setup via `setup-client-vps.sh`
- Client configures secrets (.env)
- Health check validates all services
- Monitoring dashboard (Uptime Kuma)

---

## References

- **Queue Framework:** BullMQ (https://docs.bullmq.io/)
- **Approval-First Pattern:** docs/tenants/peskids/AI-APPROVAL-POLICY.md
- **Event Contract:** docs/tenants/peskids/EVENT-CONTRACT.md
- **Architecture:** docs/tenants/peskids/ARCHITECTURE.md

---

**Next Steps:**
1. Implement orchestrator-agent with BullMQ routing
2. Implement messaging-agent with approval workflow
3. Create Dockerfile templates for each agent
4. Docker Compose production stack spec
5. One-click VPS deployment automation
6. End-to-end testing with simulated webhooks
