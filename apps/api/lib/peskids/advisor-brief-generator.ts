import { Anthropic } from '@anthropic-ai/sdk';
import type { PeskidsLeadRow } from './repository';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function metadataString(metadata: Record<string, unknown> | null, key: string): string | null {
  if (metadata === null) {
    return null;
  }
  const value = metadata[key];
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

export async function generateAdvisorBrief(lead: PeskidsLeadRow): Promise<string | null> {
  try {
    const { metadata, lead_type, full_name, child_name, email, phone, neighborhood, referral_source } = lead;
    const childAge = metadataString(metadata, 'child_age_years');
    const city = metadataString(metadata, 'city');

    const prompt = `Eres un asistente especializado en educación y natación infantil. Analiza estos datos de un cliente potencial y genera un BRIEF contextuado para el asesor de Peskids.

DATOS DEL CLIENTE:
- Nombre: ${full_name}
${child_name ? `- Niño: ${child_name}` : ''}
${childAge ? `- Edad del niño: ${childAge} años` : ''}
- Tipo de cliente: ${lead_type === 'family' ? 'Familia/Padres' : lead_type === 'teacher_applicant' ? 'Docente (candidato)' : 'Alianza/Empresa'}
- Barrio/Ubicación: ${neighborhood || 'No especificado'}
${city ? `- Ciudad: ${city}` : ''}
- Fuente: ${referral_source || 'No especificado'}
- Email: ${email}
- Teléfono: ${phone}

GENERA UN BRIEF EN ESTE FORMATO EXACTO (sin markdown, solo texto plano):

NUEVO INTERESADO
Nombre: ${full_name}
${child_name ? `Niño: ${child_name}` : 'Tipo: ' + (lead_type === 'family' ? 'Familia' : lead_type === 'teacher_applicant' ? 'Docente' : 'Alianza')}
${childAge ? `Edad: ${childAge} años` : ''}
Ubicación: ${neighborhood || 'Por confirmar'}
Fuente: ${referral_source || 'Directo'}

RESUMEN:
[Escribe 2-3 líneas que analicen: qué tipo de cliente es, qué podría estar buscando, qué necesidades potenciales tiene, cuál es el mejor enfoque. Sé específico, no genérico.]

SIGUIENTE ACCIÓN:
1. [Acción inmediata - ejemplo: Llamar hoy, Enviar info de horarios]
2. [Acción secundaria - ejemplo: Ofrecer clase de prueba, Enviar precios]
3. [Acción de seguimiento - ejemplo: Agendar sesión, Proponer plan de membresía]

Sé conciso y práctico. El asesor necesita actuar en menos de 2 minutos.`;

    const message = await anthropic.messages.create({
      model: 'claude-opus-5',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const briefText =
      message.content[0]?.type === 'text' ? message.content[0].text : null;

    return briefText;
  } catch (error) {
    console.error('[peskids] Failed to generate advisor brief', {
      lead_id: lead.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
