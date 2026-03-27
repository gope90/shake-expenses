import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const body = await request.json();

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_status',
        submitted_by: body.submitted_by,
        submitted_at: body.submitted_at,
        new_status: body.new_status,
      }),
    });

    if (!response.ok) {
      console.error('Google Sheets status sync failed:', response.statusText);
      return NextResponse.json({ ok: false, error: 'Sync failed' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Google Sheets status sync error:', error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
