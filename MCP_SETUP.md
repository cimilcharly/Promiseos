# MCP Integration Setup Guide

## What's Been Added

1. **MCP Server** (`src/mcp-server/google-calendar-mcp.ts`)
   - Fetches Google Calendar events (30 days)
   - Fetches Gmail messages (7 days)
   - Returns structured data

2. **Sync API** (`src/app/api/sync-commitments/route.ts`)
   - Processes calendar/email with Claude
   - Extracts commitments automatically
   - Saves to Supabase

3. **Auth Integration** (`src/app/auth/callback/route.ts`)
   - Triggers sync after Google login
   - Passes Google access token to MCP server

---

## Setup Instructions

### **STEP 1: Install Dependencies**

Run this command:
```bash
npm install googleapis @anthropic-ai/sdk
```

### **STEP 2: Add Environment Variables**

Add to `.env.local`:

```
# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/callback

# Anthropic API for commitment extraction
ANTHROPIC_API_KEY=your-api-key-here
```

### **STEP 3: Configure Google OAuth Scopes**

In Google Cloud Console → OAuth Consent Screen:
- Add scopes:
  - `https://www.googleapis.com/auth/calendar.readonly`
  - `https://www.googleapis.com/auth/gmail.readonly`

### **STEP 4: Update Supabase Auth Provider**

In Supabase Dashboard → Authentication → Providers → Google:
- Make sure Google OAuth is enabled
- Verify client ID and secret match Google Cloud Console

---

## What Happens on Login

1. User clicks "Continue with Google"
2. Google OAuth login happens
3. Supabase exchanges code for session + `provider_token` (Google access token)
4. Auth callback (`/auth/callback`) receives the token
5. Automatically calls `/api/sync-commitments`
6. MCP server fetches:
   - Calendar events (next 30 days)
   - Emails (last 7 days)
7. Claude extracts commitments
8. Automatically saved to Supabase `commitments` table

---

## Test It

1. Login with Google on the deployed site
2. Check Supabase:
   - Go to `commitments` table
   - Should see new entries with `status: 'new'` and `notes: 'Auto-synced from calendar|email'`

---

## Next Steps

- [ ] Add `googleapis` & `@anthropic-ai/sdk` to package.json
- [ ] Set environment variables on Vercel
- [ ] Update Google Cloud OAuth scopes
- [ ] Test on local with `npm run dev`
- [ ] Deploy to Vercel
