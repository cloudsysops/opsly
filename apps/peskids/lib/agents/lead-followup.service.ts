import type { PeskidsGoHighLevelThreadClient } from '@/lib/gohighlevel-thread-client';
import type {
  FollowupLeadRecord,
  LeadFollowupStore,
  ReengagementLeadCandidate,
} from '@/lib/agents/lead-followup-store';
import { createSupabaseLeadFollowupStore } from '@/lib/agents/lead-followup-store';

const DEFAULT_LLM_GATEWAY_URL = 'http://localhost:3010';

export interface LeadFollowupResult {
  followed: number;
  escalated: number;
  failed: number;
}

export type ReengagementCandidate = ReengagementLeadCandidate;

export type LeadFollowupServiceDeps = {
  store?: LeadFollowupStore;
  ghlClient?: PeskidsGoHighLevelThreadClient | null;
  tenantId?: string;
};

export class LeadFollowupService {
  private readonly store: LeadFollowupStore;
  private readonly ghlClient: PeskidsGoHighLevelThreadClient | null;
  private readonly tenantId: string;

  constructor(deps: LeadFollowupServiceDeps = {}) {
    this.store = deps.store ?? createSupabaseLeadFollowupStore();
    this.ghlClient = deps.ghlClient ?? null;
    this.tenantId = deps.tenantId ?? process.env.NEXT_PUBLIC_TENANT_ID ?? 'peskids';
  }

  /** Legacy GHL contact id used only as transient messaging channel. */
  getCrmMessagingContactId(lead: FollowupLeadRecord): string | null {
    return lead.ghl_contact_id?.trim() || null;
  }

  async resolveConversationId(crmContactId: string): Promise<string | null> {
    if (!this.ghlClient) {
      return null;
    }

    try {
      const conversation = await this.ghlClient.findConversationByContactId(crmContactId);
      return conversation?.id ?? null;
    } catch {
      return null;
    }
  }

  async findStaleLeads(hoursThreshold = 24): Promise<FollowupLeadRecord[]> {
    return this.store.findStaleLeads(hoursThreshold, this.tenantId);
  }

  async generateFollowupMessage(
    lead: FollowupLeadRecord,
    llmGatewayUrl?: string
  ): Promise<string> {
    const baseUrl = (llmGatewayUrl ?? process.env.LLM_GATEWAY_URL ?? DEFAULT_LLM_GATEWAY_URL).replace(
      /\/$/,
      ''
    );

    const leadName = lead.name || 'familia';
    const modality = lead.class_modality;
    const interest = lead.grade_interested;

    const profileLines: string[] = [];
    if (modality) profileLines.push(`- Modalidad de interés: ${modality}`);
    if (interest) profileLines.push(`- Grado de interés: ${interest}`);
    if (lead.neighborhood) profileLines.push(`- Barrio: ${lead.neighborhood}`);

    const systemPrompt =
      'Eres un asistente amable y profesional de Peskids, una escuela de natación y actividades extraescolares. ' +
      'Genera un mensaje de seguimiento corto (máximo 200 caracteres) en español, cálido pero no insistente, ' +
      'para un lead que mostró interés pero aún no ha concretado. ' +
      'Incluye una pregunta abierta al final para retomar la conversación. ' +
      'No uses emojis. No promociones ni ofrezcas descuentos.';

    const userPrompt = [
      `Nombre del lead: ${leadName}`,
      ...profileLines,
      '',
      'Genera el mensaje de seguimiento:',
    ].join('\n');

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      return this.buildFallbackMessage(leadName, interest);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return this.buildFallbackMessage(leadName, interest);
    }

    return content;
  }

  async sendFollowup(
    crmContactId: string,
    message: string,
    channel: 'sms' | 'whatsapp',
    options?: { conversationId?: string; replyToMessageId?: string }
  ): Promise<boolean> {
    if (!this.ghlClient) {
      return false;
    }

    try {
      const result = options?.conversationId
        ? await this.ghlClient.sendConversationMessage({
            contactId: crmContactId,
            conversationId: options.conversationId,
            replyToMessageId: options.replyToMessageId,
            message,
            channel,
          })
        : await this.ghlClient.sendMessage({
            contactId: crmContactId,
            message,
            channel,
          });
      return result.status === 'sent' || result.status === 'pending';
    } catch {
      return false;
    }
  }

  async escalateToHuman(crmContactId: string, reason: string): Promise<void> {
    if (!this.ghlClient) {
      return;
    }

    await this.ghlClient.createTask({
      title: 'Lead sin respuesta — seguimiento humano requerido',
      description: reason,
      contactId: crmContactId,
      priority: 'high',
    });
  }

  async queueManualFollowup(
    lead: FollowupLeadRecord,
    message: string,
    channel: 'sms' | 'whatsapp' | 'call' | 'email' | 'in-person' = 'call'
  ): Promise<void> {
    await this.store.createPendingFollowup({
      tenantId: lead.tenant_id,
      leadId: lead.id,
      type: channel === 'whatsapp' ? 'sms' : channel,
      notes:
        `Seguimiento manual requerido (${channel}). ` +
        `Lead: ${lead.name} <${lead.email}>. ` +
        `Borrador sugerido: ${message}`,
    });
  }

  async executeFollowupCycle(
    options?: {
      hoursThreshold?: number;
      channel?: 'sms' | 'whatsapp';
      llmGatewayUrl?: string;
    }
  ): Promise<LeadFollowupResult> {
    const hoursThreshold = options?.hoursThreshold ?? 24;
    const channel = options?.channel ?? 'whatsapp';
    const llmGatewayUrl = options?.llmGatewayUrl;

    const staleLeads = await this.findStaleLeads(hoursThreshold);

    let followed = 0;
    let escalated = 0;
    let failed = 0;

    for (const lead of staleLeads) {
      try {
        const message = await this.generateFollowupMessage(lead, llmGatewayUrl);
        const crmContactId = this.getCrmMessagingContactId(lead);

        if (!crmContactId) {
          await this.queueManualFollowup(lead, message, channel);
          escalated++;
          continue;
        }

        const conversationId = await this.resolveConversationId(crmContactId);
        const sent = await this.sendFollowup(crmContactId, message, channel, {
          ...(conversationId ? { conversationId } : {}),
        });

        if (!sent) {
          await this.queueManualFollowup(lead, message, channel);
          escalated++;
          failed++;
          continue;
        }

        followed++;

        await this.escalateToHuman(
          crmContactId,
          `Lead ${lead.name} (${lead.id}) seguido automáticamente vía ${channel}. ` +
            'Si no responde en 48h, el equipo debe contactar manualmente.'
        );
      } catch {
        failed++;
      }
    }

    return { followed, escalated, failed };
  }

  async findReengagementCandidates(
    minDays = 7,
    maxDays = 30
  ): Promise<ReengagementCandidate[]> {
    return this.store.findReengagementCandidates(minDays, maxDays, this.tenantId);
  }

  async sendReengagementSequence(lead: FollowupLeadRecord): Promise<boolean> {
    try {
      const parentName = lead.name || 'familia';
      const daysSinceContact = Math.floor(
        (Date.now() - new Date(lead.created_at).getTime()) / (24 * 60 * 60 * 1000)
      );

      let message: string;
      if (daysSinceContact >= 30) {
        message = this.buildFinalAttemptMessage(parentName, lead.grade_interested);
      } else if (daysSinceContact >= 10) {
        message = this.buildReminderMessage(parentName, lead.grade_interested);
      } else {
        message = this.buildReengagementMessage(parentName, lead.grade_interested);
      }

      const crmContactId = this.getCrmMessagingContactId(lead);
      if (!crmContactId || !this.ghlClient) {
        await this.queueManualFollowup(lead, message, 'sms');
        return false;
      }

      const sent = await this.sendFollowup(crmContactId, message, 'sms');
      if (sent) {
        await this.ghlClient.addContactTags(crmContactId, [
          daysSinceContact >= 30 ? 'reengaged_no_response' : 'reengagement_1',
        ]);
        return true;
      }

      await this.queueManualFollowup(lead, message, 'sms');
      return false;
    } catch {
      return false;
    }
  }

  private buildReengagementMessage(parentName: string, gradeInterested: string | null): string {
    const child = gradeInterested ? ` (${gradeInterested})` : '';
    return (
      `¡Hola ${parentName}! Soy de Peskids. Vimos que hace unos días preguntaste` +
      ` por nuestras clases de natación${child}. ¿Qué tal si agendamos una clase` +
      ` de prueba gratis esta semana? Responde SÍ y te contacto.`
    );
  }

  private buildReminderMessage(parentName: string, gradeInterested: string | null): string {
    const child = gradeInterested ? ` (${gradeInterested})` : '';
    return (
      `¡Hola ${parentName}! Queremos recordarte que tu clase de prueba gratuita` +
      ` en Peskids sigue disponible${child}. Tenemos horarios flexibles en` +
      ` Llanogrande y a domicilio. ¿Te gustaría probar?`
    );
  }

  private buildFinalAttemptMessage(parentName: string, gradeInterested: string | null): string {
    const child = gradeInterested ? ` para ${gradeInterested}` : '';
    return (
      `${parentName}, último aviso${child}: tu invitación a clase de prueba gratuita en Peskids` +
      ` vence pronto. No pierdas la oportunidad de que tu hijo aprenda a nadar.` +
      ` ¡Responde y te agendamos!`
    );
  }

  private buildFallbackMessage(leadName: string, gradeInterested: string | null): string {
    const name = leadName || 'familia';
    const child = gradeInterested ? ` (${gradeInterested})` : '';
    return (
      `Hola ${name}, soy el equipo de Peskids. Queremos saber si tienes alguna pregunta sobre nuestras clases${child}. ` +
      '¿Te gustaría más información o agendar una prueba?'
    );
  }
}
