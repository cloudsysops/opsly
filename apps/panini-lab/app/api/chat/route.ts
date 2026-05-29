import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // TODO: Call LLM Gateway with sticker tools
    // For now, return mock response based on keywords
    let response: string;
    let actions: Array<{ label: string; action: string }> = [];

    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('messi')) {
      response = 'Tienes 2 estampillas de Messi en tu colección: Argentina #10 y su tarjeta de club. ¡Te falta la variante #11!';
      actions = [
        { label: '➕ Agregar a deseos', action: 'add_to_wishlist:messi_11' },
        { label: '🔍 Buscar precios', action: 'search_marketplace:messi_11' },
      ];
    } else if (lowerMessage.includes('argentina') || lowerMessage.includes('qué me falta')) {
      response = 'Te faltan 5 estampillas de Argentina. Los jugadores más difíciles de encontrar son el portero del banco y los defensas suplentes.';
      actions = [
        { label: '📋 Ver lista completa', action: 'show_missing:argentina' },
        { label: '💰 Mejores precios', action: 'search_missing:argentina' },
      ];
    } else if (lowerMessage.includes('tengo')) {
      response = 'Tienes 327 estampillas de 620 en total. Completas 4 de 8 equipos. ¡Vas muy bien!';
      actions = [
        { label: '📊 Ver estadísticas', action: 'show_stats' },
        { label: '📚 Mi colección', action: 'show_inventory' },
      ];
    } else {
      response = '¿Puedo ayudarte con tu colección Panini? Puedo:' +
        '\n• Decirte qué estampillas tienes o te faltan' +
        '\n• Buscar los mejores precios en MercadoLibre y eBay' +
        '\n• Organizar tu lista de deseos' +
        '\n• Reconocer estampillas por foto';
      actions = [
        { label: '¿Tengo a Messi?', action: 'do_i_have:messi' },
        { label: 'Ver mi colección', action: 'show_inventory' },
        { label: '📷 Escanear', action: 'open_scanner' },
      ];
    }

    return NextResponse.json({
      content: response,
      actions,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
