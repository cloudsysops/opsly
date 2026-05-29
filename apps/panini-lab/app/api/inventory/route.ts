import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // TODO: Fetch user's inventory from Supabase
    return NextResponse.json({
      stickers: [],
      total: 0,
    });
  } catch (error) {
    console.error('Inventory API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sticker_id, condition } = await req.json();

    // TODO: Add sticker to user's inventory
    return NextResponse.json({
      ok: true,
      sticker_id,
      condition,
    });
  } catch (error) {
    console.error('Inventory API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
