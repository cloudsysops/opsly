import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({
      wishlist: [],
      total: 0,
    });
  } catch (e) {
    console.error('Wishlist API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sticker_id, max_price } = await req.json();
    return NextResponse.json({ ok: true, sticker_id, max_price });
  } catch (e) {
    console.error('Wishlist API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
