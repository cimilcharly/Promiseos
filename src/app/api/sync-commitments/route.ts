// src/app/api/sync-commitments/route.ts
// API endpoint to sync commitments from Google Calendar/Gmail

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { GoogleMCPServer } from '@/mcp-server/google-calendar-mcp';

const anthropic = require('@anthropic-ai/sdk').default;

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

    // Process with Claude to extract commitments
    const client = new anthropic();
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
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: extractionPrompt,
        },
      ],
    });

    let commitments = [];
    try {
      const content = message.content[0];
      if (content.type === 'text') {
        commitments = JSON.parse(content.text);
      }
    } catch (e) {
      console.error('Failed to parse Claude response:', e);
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
          owner_name: c.owner,
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
