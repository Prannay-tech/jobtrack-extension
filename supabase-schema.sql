-- ── JobTrack Database Schema ──────────────────────────────────────────────────
-- Run this in your Supabase SQL editor

-- Applications table
create table if not exists applications (
  id           uuid    default gen_random_uuid() primary key,
  user_id      uuid    references auth.users(id) on delete cascade not null,
  date         date    not null default current_date,
  company      text    not null default '',
  title        text    not null default '',
  url          text    default '',
  job_site     text    default '',
  location     text    default '',
  status       text    default 'Applied',
  notes        text    default '',
  brief        text    default '',
  yoe          text    default '',
  skills       text    default '',
  job_description text default '',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Row Level Security — users can only see/edit their own data
alter table applications enable row level security;

create policy "Users manage their own applications"
  on applications for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Indexes
create index if not exists applications_user_id_idx on applications(user_id);
create index if not exists applications_date_idx    on applications(user_id, date desc);
create index if not exists applications_status_idx  on applications(user_id, status);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger applications_updated_at
  before update on applications
  for each row execute function update_updated_at();

-- Extension tokens table (links extension to user account)
create table if not exists extension_tokens (
  id         uuid    default gen_random_uuid() primary key,
  user_id    uuid    references auth.users(id) on delete cascade not null,
  token      text    not null unique,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '1 year')
);

alter table extension_tokens enable row level security;

create policy "Users manage their own tokens"
  on extension_tokens for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role can validate tokens (called from Cloudflare Worker)
create policy "Service role can read all tokens"
  on extension_tokens for select
  using (true);
