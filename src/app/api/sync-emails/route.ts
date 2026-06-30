import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { google } from 'googleapis';
import { classifyEmailAndExtractInsights } from '@/lib/email_classifier';
import { getMockEmails } from '@/lib/mock_emails';

export async function POST(request: NextRequest) {
  try {
    const { userId, googleAccessToken, consents } = await request.json();

    const activeToken = googleAccessToken || request.cookies.get('google_access_token')?.value;

    const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    // Supabase server client
    const supabase = createServerClient(
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

    // Save consents if userId is available
    if (userId && consents) {
      await supabase
        .from('user_email_consents')
        .upsert({
          user_id: userId,
          gmail_access: consents.gmailAccess,
          ai_processing: consents.aiProcessing,
          task_extraction: consents.taskExtraction,
          continuous_sync: consents.continuousSync,
          updated_at: new Date().toISOString(),
        });
    }

    // If no Google Access Token or Gmail Consent is denied, return mock emails (Demo mode behavior)
    if (!activeToken || !consents?.gmailAccess) {
      console.log('Sync-emails falling back to mock dataset (no token or consent denied)');
      const mockList = getMockEmails();
      return NextResponse.json({
        success: true,
        source: 'mock',
        emails: mockList,
      });
    }

    // Initialize Google API Client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: activeToken,
    });

    const gmailClient = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fetch message list with a relevant query filter to target only intelligence items
    const messageListResponse = await gmailClient.users.messages.list({
      userId: 'me',
      q: 'invoice OR bill OR payment OR order OR shipped OR tracking OR renewal OR subscription OR meeting OR calendar OR scheduled OR flight OR ticket OR "action required"',
      maxResults: 50,
    });

    const messagesMetadata = messageListResponse.data.messages || [];
    const emailsFetched = [];

    for (const msg of messagesMetadata) {
      if (!msg.id) continue;

      // Fetch full message
      const fullMsg = await gmailClient.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      const data = fullMsg.data;
      const headers = data.payload?.headers || [];
      const subject = headers.find((h) => h.name?.toLowerCase() === 'subject')?.value || 'No Subject';
      const from = headers.find((h) => h.name?.toLowerCase() === 'from')?.value || 'Unknown';
      const to = headers.find((h) => h.name?.toLowerCase() === 'to')?.value || 'Unknown';
      const snippet = data.snippet || '';

      // Extracted text content from body parts
      let bodyText = snippet;
      const parts = data.payload?.parts;
      if (parts && parts.length > 0) {
        const textPart = parts.find((p) => p.mimeType === 'text/plain');
        if (textPart && textPart.body?.data) {
          bodyText = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
        }
      }

      const dateSentStr = headers.find((h) => h.name?.toLowerCase() === 'date')?.value;
      const dateSent = dateSentStr ? new Date(dateSentStr).toISOString() : new Date().toISOString();

      // Process insights (Gemini or local mock fallback)
      let insights;
      if (consents.aiProcessing) {
        insights = await classifyEmailAndExtractInsights(subject, bodyText.slice(0, 3000), geminiKey || null);
      } else {
        insights = {
          category: 'Personal communication',
          summary: snippet,
          dates: [],
          tasks: [],
          tracking: {},
          financials: { alert: false },
          subscription: {},
        };
      }

      const emailRecord = {
        emailId: msg.id,
        threadId: data.threadId || '',
        subject,
        fromAddress: from,
        toAddress: to,
        snippet,
        body: bodyText.slice(0, 10000),
        dateSent,
        category: insights.category,
      };

      // Try inserting into DB
      let dbEmailId = null;
      try {
        const { data: inserted, error: insertError } = await supabase
          .from('synced_emails')
          .upsert(
            {
              user_id: userId,
              ...emailRecord,
            },
            { onConflict: 'user_id, email_id' }
          )
          .select('id')
          .single();

        if (!insertError && inserted) {
          dbEmailId = inserted.id;

          // Insert insights if task extraction allowed
          if (consents.taskExtraction) {
            await supabase
              .from('email_insights')
              .upsert(
                {
                  user_id: userId,
                  email_uuid: dbEmailId,
                  summary: insights.summary,
                  dates_extracted: insights.dates,
                  tasks_extracted: insights.tasks,
                  order_tracking: insights.tracking,
                  financial_alerts: insights.financials,
                  subscriptions: insights.subscription,
                },
                { onConflict: 'email_uuid' }
              );
          }
        }
      } catch (dbError) {
        console.warn('Could not write email to database. Skipping DB persist.', dbError);
      }

      emailsFetched.push({
        id: dbEmailId || msg.id,
        emailId: msg.id,
        subject,
        fromAddress: from,
        toAddress: to,
        snippet,
        body: bodyText,
        dateSent,
        insights,
      });
    }

    return NextResponse.json({
      success: true,
      source: 'api',
      emails: emailsFetched,
    });
  } catch (error: any) {
    console.error('Sync-emails error:', error);
    return NextResponse.json(
      { error: 'Failed to sync emails', details: String(error) },
      { status: 500 }
    );
  }
}
