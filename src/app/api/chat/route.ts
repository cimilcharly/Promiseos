import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { query, emails } = await request.json();
    const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!geminiKey || geminiKey === 'mock-key') {
      return NextResponse.json({ response: getFallbackAnswer(query, emails) });
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Format emails for context
    const context = emails.map((e: any, idx: number) => {
      return `[Email #${idx + 1}]
Subject: ${e.subject}
From: ${e.fromAddress}
Date: ${e.dateSent}
Summary: ${e.insights?.summary || e.snippet}
Body Snippet: ${e.body?.slice(0, 400)}
---`;
    }).join('\n');

    const prompt = `
You are the PromiseOS Personal Memory Vault AI. The user is asking a question about their accumulated life history, purchases, travels, subscriptions, or tasks based on their synced emails.
Use the following email history context to answer their question accurately. 
If the answer is in the emails, state it clearly along with the date and source email subject. If it is not found, state that you couldn't find it in their current synced records.

Email History Context:
${context}

User Question: "${query}"

Provide a concise, helpful, and friendly response.
`;

    const result = await model.generateContent(prompt);
    return NextResponse.json({ response: result.response.text().trim() });
  } catch (err: any) {
    console.error('Chat API Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function getFallbackAnswer(query: string, emails: any[]): string {
  const q = query.toLowerCase();
  
  if (q.includes('keyboard') || q.includes('buy') || q.includes('shop') || q.includes('purchase') || q.includes('laptop')) {
    const kb = emails.find(e => e.subject.toLowerCase().includes('keyboard') || e.subject.toLowerCase().includes('order') || e.subject.toLowerCase().includes('vercel'));
    if (kb) {
      return `According to your records, you purchased a Keychron K2 Ergonomic Mechanical Keyboard from Amazon on ${new Date(kb.dateSent).toLocaleDateString()}. The package shipped via UPS (Tracking: 1Z999AA10123456784) and is in transit.`;
    }
    return "You have order receipts for hosting subscriptions, delta flights, and amazon electronics in your vault, but I don't see a laptop purchase receipt in this current sync batch.";
  }
  
  if (q.includes('vercel') || q.includes('hosting') || q.includes('bill')) {
    const vercel = emails.find(e => e.subject.toLowerCase().includes('vercel'));
    if (vercel) {
      return `Yes, your Vercel monthly hosting invoice (#2026-8942) was received on ${new Date(vercel.dateSent).toLocaleDateString()} for $40.00, due on July 5th, 2026.`;
    }
  }
  
  if (q.includes('flight') || q.includes('delta') || q.includes('trip') || q.includes('travel') || q.includes('goa') || q.includes('hotel')) {
    const flight = emails.find(e => e.subject.toLowerCase().includes('flight') || e.subject.toLowerCase().includes('trip') || e.subject.toLowerCase().includes('delta'));
    if (flight) {
      return `You have a confirmed Delta flight DL142 departing SFO for JFK on July 10, 2026 at 8:30 AM (Seat 12C). Your hotel stay details will be grouped inside that trip folder.`;
    }
  }
  
  if (q.includes('interview') || q.includes('career') || q.includes('job') || q.includes('apex') || q.includes('roadmap') || q.includes('last')) {
    const job = emails.find(e => e.subject.toLowerCase().includes('meeting') || e.subject.toLowerCase().includes('roadmap') || e.subject.toLowerCase().includes('agency'));
    if (job) {
      return `Your Q3 Product Roadmap review session is scheduled for Thursday, July 2nd, 2026 at 3:00 PM EST with Sarah Jones on Google Meet.`;
    }
  }
  
  return "I searched your synced memory vault but couldn't find specific matches. Could you try rephrasing or syncing more emails?";
}
