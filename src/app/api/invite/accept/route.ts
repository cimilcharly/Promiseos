import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Token parameter is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'You must be signed in to accept an invitation' }, { status: 401 });
    }

    // Retrieve invitation details
    const { data: invite, error: inviteError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invitation token' }, { status: 400 });
    }

    // Check status
    if (invite.status !== 'pending') {
      return NextResponse.json({ error: `This invitation has already been ${invite.status}` }, { status: 400 });
    }

    // Check expiration
    if (new Date(invite.expires_at) < new Date()) {
      // Update status to expired
      await supabase
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invite.id);

      return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 });
    }

    // Update user's profile org_id and role
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        org_id: invite.org_id,
        role: invite.role
      })
      .eq('id', user.id);

    if (profileUpdateError) {
      throw profileUpdateError;
    }

    // Mark invitation as accepted
    await supabase
      .from('invitations')
      .update({ status: 'accepted' })
      .eq('id', invite.id);

    // Update organization member count
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', invite.org_id);

    await supabase
      .from('organizations')
      .update({ member_count: count || 1 })
      .eq('id', invite.org_id);

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
      orgId: invite.org_id
    });
  } catch (error: any) {
    console.error('Error in accept invite route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
