// src/mcp-server/google-calendar-mcp.ts
// MCP Server to fetch Google Calendar & Gmail data

import { google } from 'googleapis';

interface GoogleCredentials {
  accessToken: string;
  refreshToken?: string;
}

export class GoogleMCPServer {
  private calendar;
  private gmail;

  constructor(credentials: GoogleCredentials) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
    });

    this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  }

  // Fetch upcoming calendar events (next 30 days)
  async fetchCalendarEvents() {
    try {
      const now = new Date();
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: thirtyDaysLater.toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Calendar fetch error:', error);
      return [];
    }
  }

  // Fetch recent emails (last 7 days)
  async fetchEmails() {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const query = `after:${Math.floor(sevenDaysAgo.getTime() / 1000)}`;

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 50,
      });

      const messageIds = response.data.messages?.map((m) => m.id) || [];

      // Fetch full message details
      const messages = await Promise.all(
        messageIds.map((id) =>
          this.gmail.users.messages.get({
            userId: 'me',
            id: id!,
            format: 'full',
          })
        )
      );

      return messages.map((m) => m.data);
    } catch (error) {
      console.error('Gmail fetch error:', error);
      return [];
    }
  }

  // Get combined data: calendar events + email
  async fetchAllData() {
    const [events, emails] = await Promise.all([
      this.fetchCalendarEvents(),
      this.fetchEmails(),
    ]);

    return {
      calendarEvents: events,
      emails: emails,
      fetchedAt: new Date().toISOString(),
    };
  }
}
