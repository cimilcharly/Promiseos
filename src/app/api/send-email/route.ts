/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { apiKey, to, subject, text } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Resend API Key' }, { status: 400 });
    }
    if (!to || !subject || !text) {
      return NextResponse.json({ error: 'Missing to, subject, or text parameter' }, { status: 400 });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PromiseOS Reminders <onboarding@resend.dev>',
        to,
        subject,
        text,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Resend API error: ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error inside /api/send-email route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
