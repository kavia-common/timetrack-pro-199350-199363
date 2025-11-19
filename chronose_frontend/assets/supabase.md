# Supabase Integration — Chronose Frontend

This frontend uses Supabase for authentication (via src/lib/supabaseClient.js) and for time entry CRUD (via src/services/timeEntries.js).

Environment variables (set in .env):
- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_KEY
- REACT_APP_FEATURE_FLAGS (optional; JSON or CSV; "enableRealData" toggles data usage)

Feature flags:
- enableRealData: if true and Supabase is configured, the UI will use real data.
  Defaults to true when Supabase envs are present; otherwise the data layer returns friendly "Data not available yet".

Expected database schema (Postgres):
Table: time_entries
- id: uuid (PK, default gen_random_uuid())
- user_id: uuid (FK to auth.users.id)
- date: date (NOT NULL)
- project: text NULL
- task: text NULL
- hours: numeric (or float8) NOT NULL
- notes: text NULL
- status: text NOT NULL DEFAULT 'draft'
- created_at: timestamptz DEFAULT now()
- updated_at: timestamptz DEFAULT now()

Example SQL:

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  project text null,
  task text null,
  hours numeric not null,
  notes text null,
  status text not null default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS policies (example):
alter table public.time_entries enable row level security;

create policy "Users can view their time entries"
on public.time_entries for select
using (auth.uid() = user_id);

create policy "Users can insert their time entries"
on public.time_entries for insert
with check (auth.uid() = user_id);

create policy "Users can update their time entries"
on public.time_entries for update
using (auth.uid() = user_id);

create policy "Users can delete their time entries"
on public.time_entries for delete
using (auth.uid() = user_id);

Usage notes:
- The service handles missing table errors and surfaces "Data not available yet" in the UI.
- All UI CRUD goes through src/services/timeEntries.js.
- Authentication is handled via AuthContext and supabaseClient.js (email/password). Microsoft SSO may be enabled later via feature flags.

