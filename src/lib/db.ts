/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { createClient } from '@/utils/supabase/client';
import { Commitment, Meeting, NotificationLog, TeamMember, Organization } from './types';

const supabase = createClient();

// Keep signatures for Settings page compatibility
export function initFirebase(configStr: string): boolean {
  console.log('Firebase init bypassed. Using Supabase.');
  return true;
}

export function isFirebaseReady(): boolean {
  return true;
}

// Helper: retrieve the active user's profile and org_id
export async function getMyOrgId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    try {
      console.log('Profile/Org not found. Running database healing...');
      const orgName = `${user.user_metadata?.full_name || user.email?.split('@')[0] || 'My'}'s Workspace`;
      
      const { data: orgData, error: orgErr } = await supabase
        .from('organizations')
        .insert([{ name: orgName, plan: 'starter', industry: 'Technology' }])
        .select('id')
        .single();
      
      if (orgErr || !orgData) {
        throw new Error(`Failed to create fallback organization: ${orgErr?.message}`);
      }

      const { error: profileErr } = await supabase
        .from('profiles')
        .insert([{
          id: user.id,
          org_id: orgData.id,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email!,
          role: 'admin'
        }]);

      if (profileErr) {
        throw new Error(`Failed to create fallback profile: ${profileErr.message}`);
      }

      console.log('Database healing completed successfully.');
      return orgData.id;
    } catch (healError) {
      console.warn('Database healing failed:', healError);
      throw new Error('No organization found for the current profile');
    }
  }

  return profile.org_id;
}

// ── Data Mapping Helpers ──
export function mapDbCommitmentToTs(c: any): Commitment {
  return {
    id: c.id,
    task: c.task,
    owner: c.owner_name, // Mapping owner_name to owner
    deadline: c.deadline,
    deadlineIso: c.deadline_iso,
    status: c.status,
    priority: c.priority,
    meetingId: c.meeting_id || undefined,
    meetingTitle: c.meetings?.title || undefined,
    notes: c.notes || undefined,
    createdAt: c.created_at,
    completedAt: c.completed_at || undefined,
    reminderSent: c.reminder_sent,
    escalated: c.escalated,
  };
}

export function mapDbMeetingToTs(m: any): Meeting {
  return {
    id: m.id,
    title: m.title,
    platform: m.platform,
    transcriptText: m.transcript_text,
    uploadedAt: m.uploaded_at,
    processedAt: m.processed_at || undefined,
    commitmentCount: m.commitment_count,
    summary: m.summary || undefined,
  };
}

export function mapDbNotificationToTs(n: any): NotificationLog {
  return {
    id: n.id,
    type: n.type,
    recipient: n.recipient,
    subject: n.subject,
    body: n.body,
    sentAt: n.sent_at,
    commitmentId: n.commitment_id,
  };
}

export function mapDbProfileToTs(p: any): TeamMember {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role,
    avatar: p.avatar_url || undefined,
    reliabilityScore: p.reliability_score,
    totalCommitments: p.total_commitments,
    completedOnTime: p.completed_on_time,
    overdue: p.overdue,
    avgDaysLate: Number(p.avg_days_late),
  };
}

export function mapDbOrgToTs(o: any, memberCount: number): Organization {
  return {
    id: o.id,
    name: o.name,
    plan: o.plan,
    memberCount,
    industry: o.industry || '',
  };
}

// ── Commitments API ──
export async function getCommitmentsDb(): Promise<Commitment[]> {
  const { data, error } = await supabase
    .from('commitments')
    .select('*, meetings(title)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching commitments from Supabase:', error);
    return [];
  }
  return (data || []).map(mapDbCommitmentToTs);
}

export async function saveCommitmentDb(c: Omit<Commitment, 'id' | 'createdAt'> & { id?: string }): Promise<void> {
  try {
    const orgId = await getMyOrgId();
    
    // Resolve owner_id if we have their profile (matching by name)
    let ownerId: string | null = null;
    if (c.owner) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('name', c.owner)
        .limit(1)
        .maybeSingle();
      if (profile) ownerId = profile.id;
    }

    const dbRow: any = {
      org_id: orgId,
      task: c.task,
      owner_id: ownerId,
      owner_name: c.owner,
      deadline: c.deadline,
      deadline_iso: c.deadlineIso,
      status: c.status || 'new',
      priority: c.priority || 'medium',
      meeting_id: c.meetingId || null,
      notes: c.notes || null,
      reminder_sent: c.reminderSent || false,
      escalated: c.escalated || false,
    };

    if (c.id) {
      dbRow.id = c.id;
    }

    const { error } = await supabase
      .from('commitments')
      .upsert([dbRow], { onConflict: 'id' });

    if (error) throw error;
  } catch (error) {
    console.error('Error writing commitment to Supabase:', error);
  }
}

export async function updateCommitmentDb(id: string, updates: Partial<Commitment>): Promise<void> {
  try {
    const dbUpdates: any = {};
    if (updates.task !== undefined) dbUpdates.task = updates.task;
    if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
    if (updates.deadlineIso !== undefined) dbUpdates.deadline_iso = updates.deadlineIso;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
    if (updates.reminderSent !== undefined) dbUpdates.reminder_sent = updates.reminderSent;
    if (updates.escalated !== undefined) dbUpdates.escalated = updates.escalated;

    // Resolve owner_id if owner_name is changing
    if (updates.owner !== undefined) {
      dbUpdates.owner_name = updates.owner;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('name', updates.owner)
        .limit(1)
        .maybeSingle();
      dbUpdates.owner_id = profile ? profile.id : null;
    }

    const { error } = await supabase
      .from('commitments')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating commitment in Supabase:', error);
  }
}

export async function deleteCommitmentDb(id: string): Promise<void> {
  const { error } = await supabase
    .from('commitments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting commitment in Supabase:', error);
  }
}

// ── Meetings API ──
export async function getMeetingsDb(): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .order('uploaded_at', { ascending: false });

  if (error) {
    console.error('Error fetching meetings from Supabase:', error);
    return [];
  }
  return (data || []).map(mapDbMeetingToTs);
}

export async function saveMeetingDb(m: Omit<Meeting, 'id' | 'uploadedAt'> & { id?: string }): Promise<void> {
  try {
    const orgId = await getMyOrgId();

    const dbRow: any = {
      org_id: orgId,
      title: m.title,
      platform: m.platform,
      transcript_text: m.transcriptText,
      summary: m.summary || null,
      commitment_count: m.commitmentCount,
      processed_at: m.processedAt || null,
    };

    if (m.id) {
      dbRow.id = m.id;
    }

    const { error } = await supabase
      .from('meetings')
      .upsert([dbRow], { onConflict: 'id' });

    if (error) throw error;
  } catch (error) {
    console.error('Error writing meeting to Supabase:', error);
  }
}

// ── Notifications API ──
export async function getNotificationsDb(): Promise<NotificationLog[]> {
  const { data, error } = await supabase
    .from('notification_logs')
    .select('*')
    .order('sent_at', { ascending: false });

  if (error) {
    console.error('Error fetching notifications from Supabase:', error);
    return [];
  }
  return (data || []).map(mapDbNotificationToTs);
}

export async function saveNotificationDb(n: Omit<NotificationLog, 'id' | 'sentAt'> & { id?: string }): Promise<void> {
  try {
    const orgId = await getMyOrgId();

    const dbRow: any = {
      org_id: orgId,
      commitment_id: n.commitmentId,
      type: n.type,
      recipient: n.recipient,
      subject: n.subject,
      body: n.body,
    };

    if (n.id) {
      dbRow.id = n.id;
    }

    const { error } = await supabase
      .from('notification_logs')
      .upsert([dbRow], { onConflict: 'id' });

    if (error) throw error;
  } catch (error) {
    console.error('Error writing notification to Supabase:', error);
  }
}

// ── Profiles (Members) API ──
export async function getMembersDb(): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching members from Supabase:', error);
    return [];
  }
  return (data || []).map(mapDbProfileToTs);
}

// ── Organizations API ──
export async function getOrganizationDb(): Promise<Organization | null> {
  try {
    const orgId = await getMyOrgId();
    
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (orgError || !org) throw orgError || new Error('Organization not found');

    const { count, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);

    return mapDbOrgToTs(org, count || 1);
  } catch (error) {
    console.warn('Error fetching organization from Supabase:', error);
    return null;
  }
}

// ── Update Organization ──
export async function updateOrganizationDb(updates: { name?: string; industry?: string; plan?: string }): Promise<void> {
  try {
    const orgId = await getMyOrgId();
    const { error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', orgId);
    if (error) throw error;
  } catch (error) {
    console.error('Error updating organization in Supabase:', error);
  }
}

// ── Notification Settings (persisted to localStorage) ──
export interface NotificationSettings {
  emailReminders: boolean;
  escalations: boolean;
  slackAlerts: boolean;
  weeklyDigest: boolean;
  overdueThreshold: number;  // days
  reminderHoursBefore: number;
}

const NOTIF_SETTINGS_KEY = 'promiseos_notif_settings';

export function getNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') {
    return { emailReminders: true, escalations: true, slackAlerts: false, weeklyDigest: true, overdueThreshold: 2, reminderHoursBefore: 24 };
  }
  try {
    const raw = localStorage.getItem(NOTIF_SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as NotificationSettings;
  } catch { /* ignore */ }
  return { emailReminders: true, escalations: true, slackAlerts: false, weeklyDigest: true, overdueThreshold: 2, reminderHoursBefore: 24 };
}

export function saveNotificationSettings(s: NotificationSettings): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(s));
  }
}

// ── AI Extraction Settings (persisted to localStorage) ──
export interface AISettings {
  model: 'gemini-1.5-flash' | 'gemini-2.0-flash' | 'gemini-1.5-pro';
  confidenceThreshold: number; // 0–1
}

const AI_SETTINGS_KEY = 'promiseos_ai_settings';

export function getAISettings(): AISettings {
  if (typeof window === 'undefined') {
    return { model: 'gemini-2.0-flash', confidenceThreshold: 0.75 };
  }
  try {
    const raw = localStorage.getItem(AI_SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as AISettings;
  } catch { /* ignore */ }
  return { model: 'gemini-2.0-flash', confidenceThreshold: 0.75 };
}

export function saveAISettings(s: AISettings): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(s));
  }
}
