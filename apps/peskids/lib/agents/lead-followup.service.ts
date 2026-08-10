import type {
  FollowupLeadRecord,
  LeadFollowupStore,
  ReengagementLeadCandidate,
} from '@/lib/agents/lead-followup-store';
import { createSupabaseLeadFollowupStore } from '@/lib/agents/lead-followup-store';
import { formatAgeRange } from '@/lib/peskids-domain';

const DEFAULT_LLM_GATEWAY_URL = 'http://localhost:3010';

export interface LeadFollowupResult {
  followed: number;
  escalated: number;
  failed: number;
}

export type ReengagementCandidate = ReengagementLeadCandidate;

export type LeadFollowupServiceDeps = {
  store?: LeadFollowupStore;
  tenantId?: string;
};

/**
 * Generates follow-up drafts via LLM Gateway and queues them for staff / n8n.
 * legacy CRM messaging removed — outbound send is approval-first via Opsly.
 */
export class LeadFollowupService {
  private readonly store: LeadFollowupStore;
  private readonly tenantId: string;

  constructor(deps: LeadFollowupServiceDeps = {}) {
    this.store = deps.store ?? createSupabaseLeadFollowupStore();
    this.tenantId = deps.tenantId ?? process.env.NEXT_PUBLIC_TENANT_ID ?? 'peskids';
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
    if (interest) profileLines.push(`- Edad / rango de interés: ${formatAgeRange(interest)}`);
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
        await this.queueManualFollowup(lead, message, channel);
        escalated++;
        followed++;
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

      await this.queueManualFollowup(lead, message, 'sms');
      return true;
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
