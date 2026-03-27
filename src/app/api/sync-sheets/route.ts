import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

    if (!webhookUrl) {
      // If no webhook URL configured, skip silently (sheets sync is optional)
      return NextResponse.json({ ok: true, skipped: true });
    }

    const body = await request.json();

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error('Google Sheets sync failed:', response.statusText);
      return NextResponse.json({ ok: false, error: 'Sync failed' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Google Sheets sync error:', error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
