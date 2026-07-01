import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const { title, date, time, venue, summary } = await request.json();
    const activeToken = request.cookies.get('google_access_token')?.value;

    if (!activeToken) {
      console.log('Calendar sync: falling back to simulated sync (no Google token)');
      return NextResponse.json({
        success: true,
        source: 'mock',
        message: `Simulated Calendar Sync: "${title}" added to primary calendar (Demo Mode).`,
      });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials({ access_token: activeToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Format Date & Time for Google Calendar API
    // If no time is provided, set a default (e.g. 09:00 AM)
    const cleanTime = time && time !== 'TBD' ? time : '09:00';
    const startDateTime = new Date(`${date}T${cleanTime}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration default

    const event = {
      summary: title,
      location: venue || 'Online / Google Meet',
      description: summary || 'Synced automatically by PromiseOS.',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'UTC',
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return NextResponse.json({
      success: true,
      source: 'live',
      eventId: response.data.id,
      message: `Event "${title}" has been successfully synced directly to your Google Calendar!`,
    });
  } catch (err: any) {
    console.error('Google Calendar direct sync error:', err);
    return NextResponse.json({ error: err.message || 'Calendar sync failed' }, { status: 500 });
  }
}
