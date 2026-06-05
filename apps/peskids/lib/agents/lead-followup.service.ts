import type { Contact } from '@intcloudsysops/services/gohighlevel';
import type { GoHighLevelClient } from '@intcloudsysops/services/gohighlevel';

const DEFAULT_LLM_GATEWAY_URL = 'http://localhost:3010';

export interface LeadFollowupResult {
  followed: number;
  escalated: number;
  failed: number;
}

export interface ReengagementCandidate {
  contact: Contact;
  daysSinceContact: number;
}

export class LeadFollowupService {
  constructor(private ghlClient: GoHighLevelClient) {}

  async findStaleLeads(hoursThreshold = 24): Promise<Contact[]> {
    const response = await this.ghlClient.getContacts({
      status: 'New Lead',
      limit: 100,
    });

    const cutoff = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

    return response.data.filter((contact) => {
      if (!contact.createdAt) return false;
      const created = new Date(contact.createdAt);
      return created < cutoff;
    });
  }

  async generateFollowupMessage(
    contact: Contact,
    llmGatewayUrl?: string
  ): Promise<string> {
    const baseUrl = (llmGatewayUrl ?? process.env.LLM_GATEWAY_URL ?? DEFAULT_LLM_GATEWAY_URL).replace(
      /\/$/,
      ''
    );

    const leadName = contact.name || contact.firstName || contact.lastName || 'familia';
    const modality = (contact.customFields?.modality as string) ?? null;
    const childName = (contact.customFields?.child_name as string) ?? null;
    const interest = (contact.customFields?.interest as string) ?? null;

    const profileLines: string[] = [];
    if (childName) profileLines.push(`- Hijo/a: ${childName}`);
    if (modality) profileLines.push(`- Modalidad de interés: ${modality}`);
    if (interest) profileLines.push(`- Interés: ${interest}`);

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
      const fallback = this.buildFallbackMessage(leadName, childName);
      return fallback;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return this.buildFallbackMessage(leadName, childName);
    }

    return content;
  }

  async sendFollowup(
    contactId: string,
    message: string,
    channel: 'sms' | 'whatsapp'
  ): Promise<boolean> {
    try {
      const result = await this.ghlClient.sendMessage({
        contactId,
        message,
        channel,
      });
      return result.status === 'sent' || result.status === 'pending';
    } catch {
      return false;
    }
  }

  async escalateToHuman(contactId: string, reason: string): Promise<void> {
    await this.ghlClient.createTask({
      title: 'Lead sin respuesta — seguimiento humano requerido',
      description: reason,
      contactId,
      priority: 'high',
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

    for (const contact of staleLeads) {
      try {
        const message = await this.generateFollowupMessage(contact, llmGatewayUrl);
        const sent = await this.sendFollowup(contact.id, message, channel);

        if (!sent) {
          failed++;
          continue;
        }

        followed++;

        await this.escalateToHuman(
          contact.id,
          `Lead ${contact.name || contact.id} seguido automáticamente vía ${channel}. ` +
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
    const now = Date.now();
    const minCutoff = new Date(now - maxDays * 24 * 60 * 60 * 1000);
    const maxCutoff = new Date(now - minDays * 24 * 60 * 60 * 1000);

    const [newLeads, contacted] = await Promise.all([
      this.ghlClient.getContacts({ status: 'New Lead', limit: 100 }),
      this.ghlClient.getContacts({ status: 'Contacted', limit: 100 }),
    ]);

    const all = [...newLeads.data, ...contacted.data];
    const seen = new Set<string>();
    const unique: Contact[] = [];

    for (const c of all) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        unique.push(c);
      }
    }

    return unique
      .filter((contact) => {
        if (!contact.createdAt) return false;
        const created = new Date(contact.createdAt).getTime();
        return created >= minCutoff.getTime() && created <= maxCutoff.getTime();
      })
      .map((contact) => ({
        contact,
        daysSinceContact: Math.floor(
          (now - new Date(contact.createdAt!).getTime()) / (24 * 60 * 60 * 1000)
        ),
      }))
      .sort((a, b) => b.daysSinceContact - a.daysSinceContact);
  }

  async sendReengagementSequence(
    contactId: string,
    daysSinceContact: number
  ): Promise<boolean> {
    try {
      const contact = await this.ghlClient.getContact(contactId);
      const parentName = contact.name || contact.firstName || 'familia';
      const childName = (contact.customFields?.child_name as string) ?? null;

      let message: string;
      let tag: string;

      if (daysSinceContact >= 30) {
        message = this.buildFinalAttemptMessage(parentName, childName);
        tag = 'reengaged_no_response';
      } else if (daysSinceContact >= 10) {
        message = this.buildReminderMessage(parentName, childName);
        tag = 'reengagement_1';
      } else {
        message = this.buildReengagementMessage(parentName, childName);
        tag = 'reengagement_1';
      }

      const sent = await this.sendFollowup(contactId, message, 'sms');
      if (sent) {
        await this.ghlClient.addContactTags(contactId, [tag]);
      }
      return sent;
    } catch {
      return false;
    }
  }

  private buildReengagementMessage(parentName: string, childName: string | null): string {
    const child = childName ? ` de ${childName}` : '';
    return (
      `¡Hola ${parentName}! Soy de Peskids. Vimos que hace unos días preguntaste` +
      ` por nuestras clases de natación${child}. ¿Qué tal si agendamos una clase` +
      ` de prueba gratis esta semana? Responde SÍ y te contacto.`
    );
  }

  private buildReminderMessage(parentName: string, childName: string | null): string {
    const child = childName ? ` de ${childName}` : '';
    return (
      `¡Hola ${parentName}! Queremos recordarte que tu clase de prueba gratuita` +
      ` en Peskids sigue disponible${child}. Tenemos horarios flexibles en` +
      ` Llanogrande y a domicilio. ¿Te gustaría probar?`
    );
  }

  private buildFinalAttemptMessage(_parentName: string, childName: string | null): string {
    const child = childName ? ` de ${childName}` : '';
    return (
      `Último aviso${child}: tu invitación a clase de prueba gratuita en Peskids` +
      ` vence pronto. No pierdas la oportunidad de que ${childName || 'tu hijo'}` +
      ` aprenda a nadar. ¡Responde y te agendamos!`
    );
  }

  private buildFallbackMessage(leadName: string, childName: string | null): string {
    const name = leadName || 'familia';
    const child = childName ? ` de ${childName}` : '';
    return (
      `Hola ${name}, soy el equipo de Peskids. Queremos saber si tienes alguna pregunta sobre nuestras clases${child}. ` +
      '¿Te gustaría más información o agendar una prueba?'
    );
  }
}
