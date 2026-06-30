import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect address
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      const googleAccessToken = data.session?.provider_token
      
      // Determine redirection URL
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      let redirectUrl = `${origin}${next}`
      if (!isLocalEnv && forwardedHost) {
        redirectUrl = `https://${forwardedHost}${next}`
      }

      const response = NextResponse.redirect(redirectUrl)

      if (googleAccessToken) {
        // Save token to secure cookie for session lifetime (1 hour)
        response.cookies.set('google_access_token', googleAccessToken, {
          path: '/',
          maxAge: 3600,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        })

        // Trigger email sync & commitment sync in background
        const payload = {
          userId: data.user.id,
          googleAccessToken,
          consents: {
            gmailAccess: true,
            aiProcessing: true,
            taskExtraction: true,
            continuousSync: true
          }
        }

        fetch(`${origin}/api/sync-commitments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: data.user.id, googleAccessToken }),
        }).catch(() => {})

        fetch(`${origin}/api/sync-emails`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {})
      }

      return response
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not exchange auth code for session`)
}
