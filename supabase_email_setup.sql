-- supabase_email_setup.sql
-- Run this in your Supabase SQL Editor to support the Email Intelligence System.

-- Enable Row Level Security (RLS) on all new tables.

-- 1. User Email Consents Table
create table if not exists public.user_email_consents (
    user_id uuid references auth.users on delete cascade primary key,
    gmail_access boolean not null default false,
    ai_processing boolean not null default false,
    task_extraction boolean not null default false,
    continuous_sync boolean not null default false,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_email_consents enable row level security;

create policy "users_manage_own_consent" on public.user_email_consents for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());


-- 2. Synced Emails Table
create table if not exists public.synced_emails (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users on delete cascade not null,
    email_id text not null,
    thread_id text,
    subject text,
    from_address text,
    to_address text,
    snippet text,
    body text,
    date_sent timestamp with time zone,
    category text default 'Personal' not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint unique_user_email_id unique (user_id, email_id)
);

alter table public.synced_emails enable row level security;

create policy "users_manage_own_emails" on public.synced_emails for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());


-- 3. Email Insights Table (Extracts & Summaries)
create table if not exists public.email_insights (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users on delete cascade not null,
    email_uuid uuid references public.synced_emails on delete cascade not null unique,
    summary text,
    dates_extracted jsonb default '[]'::jsonb not null,
    tasks_extracted jsonb default '[]'::jsonb not null,
    order_tracking jsonb default '{}'::jsonb not null,
    financial_alerts jsonb default '{}'::jsonb not null,
    subscriptions jsonb default '{}'::jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.email_insights enable row level security;

create policy "users_manage_own_insights" on public.email_insights for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
