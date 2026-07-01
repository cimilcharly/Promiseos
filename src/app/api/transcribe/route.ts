import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 400 });
    }

    const formDataToSend = new FormData();
    formDataToSend.append('file', file);
    formDataToSend.append('model', 'whisper-1');

    const openAiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formDataToSend,
    });

    const openAiData = await openAiResponse.json();
    if (!openAiResponse.ok) {
      throw new Error(openAiData.error?.message || 'OpenAI API error');
    }

    return NextResponse.json({ text: openAiData.text });
  } catch (error: any) {
    console.error('Whisper transcription error:', error);
    return NextResponse.json({ error: error.message || 'Transcription failed' }, { status: 500 });
  }
}
