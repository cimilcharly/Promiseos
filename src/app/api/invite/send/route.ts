import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { email, role } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Retrieve sender's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id, role, name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify user is an admin
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can invite new members' }, { status: 403 });
    }

    // Generate secure token and set expiration to 7 days from now
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Insert invitation record
    const { error: inviteError } = await supabase
      .from('invitations')
      .insert({
        org_id: profile.org_id,
        email,
        role: role || 'member',
        token,
        expires_at: expiresAt,
        status: 'pending'
      });

    if (inviteError) {
      throw inviteError;
    }

    // Try to get organization details
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', profile.org_id)
      .single();

    const orgName = org?.name || 'their workspace';

    // Dispatch email (use Resend API Key if configured, else simulate)
    const resendKey = process.env.RESEND_API_KEY || '';
    const inviteUrl = `${new URL(req.url).origin}/invite?token=${token}`;
    const subject = `📧 You have been invited to join ${orgName} on PromiseOS`;
    const bodyText = `Hi there,\n\n${profile.name} has invited you to join the organization "${orgName}" as a ${role || 'member'} on PromiseOS.\n\nClick the link below to accept the invitation and set up your account:\n${inviteUrl}\n\nThis invitation link will expire in 7 days.`;

    if (resendKey && resendKey !== 'mock-key') {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'PromiseOS <onboarding@resend.dev>',
          to: email,
          subject,
          text: bodyText,
        }),
      });

      if (!res.ok) {
        console.error('Resend API failed to send invitation email:', await res.text());
      } else {
        console.log(`Invitation email successfully sent to ${email}`);
      }
    } else {
      console.log(`✉️ Simulated Invite Email (no Resend Key configured):\nTo: ${email}\nSubj: ${subject}\nBody:\n${bodyText}`);
    }

    return NextResponse.json({ success: true, message: 'Invitation sent successfully' });
  } catch (error: any) {
    console.error('Error in send invite route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
