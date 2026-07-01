import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { subject, body, taskStatus, persona, customInstructions } = await request.json();
    const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    const toneText = 
      persona === 'The Motivator' ? 'enthusiastic and encouraging' :
      persona === 'The Auditor' ? 'very formal, precise, and analytical' :
      'brief, professional, and minimalist';

    const statusText = taskStatus === 'completed' 
      ? 'confirming that the requested task has been successfully completed'
      : 'acknowledging the request and confirming it is currently in progress / scheduled';

    if (!geminiKey || geminiKey === 'mock-key') {
      return NextResponse.json({ draft: getFallbackDraft(subject, taskStatus, persona, customInstructions) });
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const instructionsText = customInstructions 
      ? `- The user has requested these specific instructions/content for the reply: "${customInstructions}". Incorporate these requirements exactly.`
      : '';

    const prompt = `
You are the PromiseOS AI Draft Assistant. Write a response email reply.
Original Subject: ${subject}
Original Body:
"""
${body.slice(0, 1000)}
"""

Context details for the reply:
- The tone should be: ${toneText}.
- The message should be: ${statusText}.
${instructionsText}

Generate ONLY the draft reply body. Do not include subject lines or metadata headers.
`;

    const result = await model.generateContent(prompt);
    return NextResponse.json({ draft: result.response.text().trim() });
  } catch (err: any) {
    console.error('Draft API Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function getFallbackDraft(subject: string, taskStatus: string, persona: string, customInstructions?: string): string {
  const isCompleted = taskStatus === 'completed';
  const customNote = customInstructions ? `\n\n[Incorporated custom instructions: "${customInstructions}"]` : '';
  
  if (persona === 'The Motivator') {
    return `Hi team!\n\nJust wanted to send a quick update on this. ${isCompleted ? "Woohoo! I've already tackled the task and got it fully completed! Let me know if there's anything else we need to jump on." : "I'm on it! I've logged this task in my dashboard queue and am actively working on it. Will send over the details the moment it is ready. Let's do this!"}${customNote}\n\nBest,\nCharlie`;
  }
  
  if (persona === 'The Auditor') {
    return `To Whom It May Concern,\n\nI am writing to confirm receipt of your correspondence regarding "${subject}".\n\nThis is to notify you that the associated action items are currently: ${isCompleted ? "VERIFIED & COMPLETED. All records have been reconciled." : "PENDING REVIEW. Work is scheduled and progress is tracked in the system dashboard."}${customNote}\n\nRespectfully,\nCharles`;
  }

  // Executive Minimalist default
  return `Hi,\n\nThanks for reaching out. ${isCompleted ? "The tasks associated with this request have been completed." : "I have added these tasks to my queue and will update you shortly."}${customNote}\n\nBest,\nCharlie`;
}
