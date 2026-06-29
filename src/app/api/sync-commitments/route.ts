// src/app/api/sync-commitments/route.ts
// API endpoint to sync commitments from Google Calendar/Gmail

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { GoogleMCPServer } from '@/mcp-server/google-calendar-mcp';
import { GoogleGenerativeAI } from '@google/generative-ai';

const anthropic = require('@anthropic-ai/sdk').default;

// Local fallback Regex-based commitment parser
function extractCommitmentsRegex(emails: any[], calendarEvents: any[]): any[] {
  const commitments: any[] = [];
  const todayStr = new Date().toISOString().split('T')[0];

  const futureDate = (days: number) => {
    const d = new Date(); d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const deadlineMap: Record<string, [string, string]> = {
    today: ['Today', futureDate(0)],
    tomorrow: ['Tomorrow', futureDate(1)],
    friday: ['Friday', futureDate(4)],
    monday: ['Monday', futureDate(3)],
    tuesday: ['Tuesday', futureDate(2)],
    wednesday: ['Wednesday', futureDate(3)],
    thursday: ['Thursday', futureDate(4)],
    'next week': ['Next Week', futureDate(7)],
    'end of week': ['End of Week', futureDate(5)],
    'end of month': ['End of Month', futureDate(20)],
    'within the week': ['This Week', futureDate(5)],
  };

  // Process Emails
  for (const email of emails) {
    const snippet = email.snippet || '';
    const subject = email.subject || '';
    const sender = email.from || 'Me';
    const textToScan = `${subject} ${snippet}`;

    const sentences = textToScan.split(/[.!?\n]/);
    for (const sentence of sentences) {
      const cleanSentence = sentence.trim();
      const willMatch = cleanSentence.match(/(?:I'll|I will|we'll|we will|will)\s+([^.!?\n]{10,80})/i);
      if (!willMatch) continue;

      const taskRaw = willMatch[1].replace(/\s*by .*/i, '').trim();
      const task = taskRaw.charAt(0).toUpperCase() + taskRaw.slice(1);

      let deadline = 'Next Week';
      let deadlineIso = futureDate(7);
      const sentenceLower = cleanSentence.toLowerCase();

      for (const [key, [dl, iso]] of Object.entries(deadlineMap)) {
        if (sentenceLower.includes(key)) {
          deadline = dl;
          deadlineIso = iso;
          break;
        }
      }

      commitments.push({
        task: `${task} (from email: "${subject.slice(0, 30)}...")`,
        owner: sender.split('<')[0].trim() || 'Me',
        deadline,
        deadlineIso,
        priority: 'medium',
        source: 'email'
      });
    }
  }

  // Process Calendar Events
  for (const event of calendarEvents) {
    const title = event.summary || '';
    if (title.toLowerCase().includes('review') || title.toLowerCase().includes('due') || title.toLowerCase().includes('submit') || title.toLowerCase().includes('deliver')) {
      const deadlineIso = event.start?.dateTime?.split('T')[0] || event.start?.date || todayStr;
      commitments.push({
        task: `Prepare for / Deliver: ${title}`,
        owner: 'Me',
        deadline: 'Event Date',
        deadlineIso,
        priority: 'high',
        source: 'calendar'
      });
    }
  }

  // Deduplicate
  return commitments.filter((r, i, arr) =>
    i === arr.findIndex((x) => x.task.slice(0, 30) === r.task.slice(0, 30))
  ).slice(0, 10);
}

export async function POST(request: NextRequest) {
  try {
    const { accessToken, userId, googleAccessToken } = await request.json();

    if (!googleAccessToken || !userId) {
      return NextResponse.json(
        { error: 'Missing credentials' },
        { status: 400 }
      );
    }

    // Initialize MCP Server
    const mcpServer = new GoogleMCPServer({
      accessToken: googleAccessToken,
    });

    // Fetch calendar events & emails
    const data = await mcpServer.fetchAllData();

    let commitments = [];

    const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    // 1. Try Gemini first (most accessible/free tier)
    if (geminiKey && geminiKey.trim()) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.0-flash',
          generationConfig: {
            responseMimeType: 'application/json',
          },
        });

        const prompt = `
You are a commitment extraction AI. Analyze the following calendar events and emails.
Extract ONLY commitments/promises/deadlines.

For each commitment, provide JSON:
{
  "task": "what needs to be done",
  "owner": "who is responsible (person name)",
  "deadline": "human-readable deadline (e.g., Friday, Tomorrow)",
  "deadlineIso": "ISO date string",
  "priority": "low|medium|high",
  "source": "calendar|email|both"
}

Calendar Events:
${JSON.stringify(data.calendarEvents, null, 2)}

Emails (last 7 days):
${JSON.stringify(data.emails, null, 2)}

Return ONLY valid JSON array. No explanation, no markdown.
`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        if (text.startsWith('```json')) text = text.substring(7);
        if (text.startsWith('```')) text = text.substring(3);
        if (text.endsWith('```')) text = text.substring(0, text.length - 3);

        commitments = JSON.parse(text.trim());
      } catch (geminiError) {
        console.error('Gemini extraction failed, falling back:', geminiError);
      }
    }

    // 2. Try Anthropic if Gemini is not set or failed
    if (commitments.length === 0 && anthropicKey && anthropicKey.trim()) {
      try {
        const client = new anthropic({ apiKey: anthropicKey });
        const extractionPrompt = `
You are a commitment extraction AI. Analyze the following calendar events and emails.
Extract ONLY commitments/promises/deadlines.

For each commitment, provide JSON:
{
  "task": "what needs to be done",
  "owner": "who is responsible (person name)",
  "deadline": "human-readable deadline (e.g., Friday, Tomorrow)",
  "deadlineIso": "ISO date string",
  "priority": "low|medium|high",
  "source": "calendar|email|both"
}

Calendar Events:
${JSON.stringify(data.calendarEvents, null, 2)}

Emails (last 7 days):
${JSON.stringify(data.emails, null, 2)}

Return ONLY valid JSON array. No markdown, no explanation.
`;

        const message = await client.messages.create({
          model: 'claude-3-5-sonnet-latest',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: extractionPrompt,
            },
          ],
        });

        const content = message.content[0];
        if (content.type === 'text') {
          let text = content.text.trim();
          if (text.startsWith('```json')) text = text.substring(7);
          if (text.startsWith('```')) text = text.substring(3);
          if (text.endsWith('```')) text = text.substring(0, text.length - 3);
          commitments = JSON.parse(text.trim());
        }
      } catch (anthropicError) {
        console.error('Anthropic extraction failed, falling back:', anthropicError);
      }
    }

    // 3. Fallback to Regex-based extraction if AI keys failed/missing
    if (commitments.length === 0) {
      console.log('Using local regex-based fallback extraction');
      commitments = extractCommitmentsRegex(data.emails || [], data.calendarEvents || []);
    }

    // Save to Supabase
    if (commitments.length > 0) {
      const supabase = await createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                request.cookies.set(name, value);
              });
            },
          },
        }
      );

      // Get user's org_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', userId)
        .single();

      if (profile) {
        // Insert commitments
        const formattedCommitments = commitments.map((c: any) => ({
          org_id: profile.org_id,
          task: c.task,
          owner_name: c.owner || 'Me',
          deadline: c.deadline,
          deadline_iso: c.deadlineIso,
          priority: c.priority || 'medium',
          status: 'new',
          notes: `Auto-synced from ${c.source}`,
        }));

        await supabase
          .from('commitments')
          .insert(formattedCommitments);
      }
    }

    return NextResponse.json({
      success: true,
      extractedCount: commitments.length,
      commitments,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    );
  }
}
