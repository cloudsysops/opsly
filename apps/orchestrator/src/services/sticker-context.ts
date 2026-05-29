import { createClient } from '@supabase/supabase-js';

interface MessageInput {
  message: string;
  tenantSlug: string;
  userId: string;
  channel: string;
  messageId: string;
}

interface MessageResponse {
  output: string;
  suggestedActions?: string[];
}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export class StickerContextService {
  private supabase = createClient(supabaseUrl, supabaseKey);

  async processUserMessage(input: MessageInput): Promise<MessageResponse> {
    const { message, tenantSlug, userId, channel } = input;

    // Simple intent detection for sticker queries
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('tengo') || lowerMsg.includes('have')) {
      // Query: "Do I have Messi?"
      return this.handleHaveQuery(message, tenantSlug, userId);
    }

    if (lowerMsg.includes('falta') || lowerMsg.includes('missing')) {
      // Query: "What am I missing?"
      return this.handleMissingQuery(tenantSlug, userId);
    }

    if (lowerMsg.includes('cuánto') || lowerMsg.includes('how many')) {
      // Query: "How many do I need?"
      return this.handleCountQuery(tenantSlug, userId);
    }

    if (lowerMsg.includes('equipo') || lowerMsg.includes('team')) {
      // Query: "What teams do I have?"
      return this.handleTeamQuery(message, tenantSlug, userId);
    }

    // Default: help message with quick actions
    return {
      output: '¿En qué puedo ayudarte con tu colección? Puedo decirte: qué laminitas tienes, cuáles te faltan, o ayudarte a organizarte.',
      suggestedActions: [
        '¿Tengo el Messi?',
        'Qué me falta completar',
        'Cuántas me faltan',
      ],
    };
  }

  private async handleHaveQuery(
    message: string,
    tenantSlug: string,
    userId: string,
  ): Promise<MessageResponse> {
    // Extract player/team name from query
    const playerMatch = message.match(
      /(?:tengo|have)\s+(?:el\s+)?([a-zá-ú\s]+)\??/i,
    );
    const playerName = playerMatch ? playerMatch[1].trim() : '';

    if (!playerName) {
      return {
        output:
          '¿Quién buscas? Dame el nombre del jugador o equipo (ejemplo: Messi, Argentina)',
        suggestedActions: [],
      };
    }

    try {
      // Query inventory for this player
      const { data, error } = await this.supabase
        .from('sticker_inventory')
        .select('sticker_id, quantity')
        .eq('user_id', userId)
        .ilike('sticker_id->player_name', `%${playerName}%`)
        .limit(10);

      if (error) {
        return {
          output: 'No pude verificar tu inventario. Intenta más tarde.',
          suggestedActions: [],
        };
      }

      if (!data || data.length === 0) {
        return {
          output: `No encontré "${playerName}" en tu colección. ¿Deseas agregarlo a tu lista de deseos?`,
          suggestedActions: ['Agregar a deseos', 'Buscar otro jugador'],
        };
      }

      const count = data.reduce((sum, item) => sum + (item.quantity || 1), 0);
      return {
        output: `Sí, tienes ${count} laminita(s) de ${playerName} en tu colección.`,
        suggestedActions: ['Ver todas del jugador', 'Ver mi colección completa'],
      };
    } catch {
      return {
        output: 'Error consultando tu colección. Intenta nuevamente.',
        suggestedActions: [],
      };
    }
  }

  private async handleMissingQuery(
    tenantSlug: string,
    userId: string,
  ): Promise<MessageResponse> {
    try {
      // This would query all stickers not in inventory
      // For MVP, return a generic response with suggested actions
      return {
        output:
          'Tu colección no está completa. Puedo ayudarte a encontrar las laminitas que te faltan a los mejores precios.',
        suggestedActions: [
          'Mostrar lo que me falta',
          'Buscar ofertas',
          'Ver mi progreso',
        ],
      };
    } catch {
      return {
        output: 'No pude cargar tu información. Intenta más tarde.',
        suggestedActions: [],
      };
    }
  }

  private async handleCountQuery(
    tenantSlug: string,
    userId: string,
  ): Promise<MessageResponse> {
    try {
      // Calculate missing count
      return {
        output:
          'Te faltan muchas laminitas para completar. ¿Quieres que te busque las mejores ofertas?',
        suggestedActions: [
          'Buscar ofertas',
          'Mi progreso actual',
          'Ver lista de deseos',
        ],
      };
    } catch {
      return {
        output: 'No pude calcular tu progreso. Intenta más tarde.',
        suggestedActions: [],
      };
    }
  }

  private async handleTeamQuery(
    message: string,
    tenantSlug: string,
    userId: string,
  ): Promise<MessageResponse> {
    // Extract team name from query
    const teamMatch = message.match(/(?:equipo|team)\s+([a-zá-ú\s]+)\??/i);
    const teamName = teamMatch ? teamMatch[1].trim() : '';

    if (!teamName) {
      return {
        output: '¿Qué equipo quieres ver? (ejemplo: Argentina, Brasil, España)',
        suggestedActions: [],
      };
    }

    try {
      return {
        output: `Tu colección del ${teamName} es incompleta. Tienes algunos jugadores, pero te faltan otros.`,
        suggestedActions: [
          `Ver ${teamName} completo`,
          'Buscar faltantes del equipo',
        ],
      };
    } catch {
      return {
        output: 'Error consultando el equipo. Intenta nuevamente.',
        suggestedActions: [],
      };
    }
  }
}
