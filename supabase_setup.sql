-- supabase_setup.sql
-- Run this script in your Supabase SQL Editor to establish tables, RLS policies, and user creation triggers.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── 1. Create Tables ──

-- Organizations Table
create table if not exists public.organizations (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    plan text not null default 'starter' check (plan in ('starter', 'growth', 'business')),
    stripe_customer_id text,
    stripe_subscription_id text,
    member_count integer not null default 1,
    industry text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Profiles Table (Linked to Supabase auth.users)
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    org_id uuid references public.organizations on delete cascade not null,
    name text not null,
    email text not null,
    role text not null default 'member',
    avatar_url text,
    reliability_score integer not null default 100 check (reliability_score >= 0 and reliability_score <= 100),
    total_commitments integer not null default 0,
    completed_on_time integer not null default 0,
    overdue integer not null default 0,
    avg_days_late numeric(5,2) not null default 0.0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Invitations Table
create table if not exists public.invitations (
    id uuid default gen_random_uuid() primary key,
    org_id uuid references public.organizations on delete cascade not null,
    email text not null,
    role text not null default 'member',
    token text not null unique,
    expires_at timestamp with time zone not null,
    status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Meetings Table
create table if not exists public.meetings (
    id uuid default gen_random_uuid() primary key,
    org_id uuid references public.organizations on delete cascade not null,
    title text not null,
    platform text not null,
    transcript_text text not null,
    summary text,
    commitment_count integer not null default 0,
    uploaded_at date default current_date not null,
    processed_at timestamp with time zone default timezone('utc'::text, now())
);

-- Commitments Table
create table if not exists public.commitments (
    id uuid default gen_random_uuid() primary key,
    org_id uuid references public.organizations on delete cascade not null,
    task text not null,
    owner_id uuid references public.profiles on delete set null,
    owner_name text not null,
    deadline text not null,
    deadline_iso text not null,
    status text not null default 'new',
    priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
    meeting_id uuid references public.meetings on delete set null,
    notes text,
    created_at date default current_date not null,
    completed_at timestamp with time zone,
    reminder_sent boolean not null default false,
    escalated boolean not null default false
);

-- Notification Logs Table
create table if not exists public.notification_logs (
    id uuid default gen_random_uuid() primary key,
    org_id uuid references public.organizations on delete cascade not null,
    commitment_id uuid references public.commitments on delete cascade not null,
    type text not null check (type in ('reminder', 'escalation', 'completion')),
    recipient text not null,
    subject text not null,
    body text not null,
    sent_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ── 2. Enable Row Level Security (RLS) ──

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.invitations enable row level security;
alter table public.meetings enable row level security;
alter table public.commitments enable row level security;
alter table public.notification_logs enable row level security;

-- ── 3. Security Definer Function (prevents RLS recursion on profiles) ──

create or replace function public.get_my_org_id()
returns uuid
language sql
security definer
stable
as $$
  select org_id from public.profiles where id = auth.uid() limit 1;
$$;

-- ── 4. RLS Policies ──

-- Organizations
create policy "org_view" on public.organizations for all
  using (id = public.get_my_org_id());

-- Profiles (uses auth.uid() directly to avoid recursion)
create policy "profile_view" on public.profiles for all
  using (org_id = public.get_my_org_id() or id = auth.uid());

-- Invitations
create policy "invitation_view" on public.invitations for all
  using (org_id = public.get_my_org_id());

-- Meetings
create policy "meeting_view" on public.meetings for all
  using (org_id = public.get_my_org_id());

-- Commitments
create policy "commitment_view" on public.commitments for all
  using (org_id = public.get_my_org_id());

-- Notification Logs
create policy "notification_view" on public.notification_logs for all
  using (org_id = public.get_my_org_id());

-- ── 4. Setup User Registration Trigger ──

-- Trigger function to automatically create organization and profile on sign up
create or replace function public.handle_new_user()
returns trigger as $$
declare
    target_org_id uuid;
    org_name text;
begin
    -- Check if user is joining an existing organization via metadata
    if (new.raw_user_meta_data->>'org_id') is not null then
        target_org_id := (new.raw_user_meta_data->>'org_id')::uuid;
    else
        org_name := coalesce(new.raw_user_meta_data->>'org_name', 'My Workspace');
        insert into public.organizations (name, plan, industry)
        VALUES (org_name, 'starter', 'Technology')
        returning id into target_org_id;
    end if;

    insert into public.profiles (id, org_id, name, email, role)
    values (
        new.id,
        target_org_id,
        coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.email,
        coalesce(new.raw_user_meta_data->>'role', 'admin')
    );
    
    -- Keep organization member_count updated
    update public.organizations 
    set member_count = (select count(*) from public.profiles where org_id = target_org_id)
    where id = target_org_id;
    
    return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();
