-- Quadrante schema — Postgres / Supabase
-- Row Level Security on every table; owner = auth.uid().
-- This mirrors lib/types.ts so the local store can be swapped for Supabase.

create extension if not exists "pgcrypto";

-- AREAS ----------------------------------------------------------------------
create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slug text not null,
  color text not null,
  icon text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- GOALS ----------------------------------------------------------------------
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  area_id uuid not null references areas (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'active' check (status in ('active','done','paused')),
  target_date date,
  progress int not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now()
);

-- TASKS ----------------------------------------------------------------------
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  area_id uuid not null references areas (id) on delete cascade,
  goal_id uuid references goals (id) on delete set null,
  title text not null,
  notes text,
  status text not null default 'todo' check (status in ('todo','doing','done')),
  priority text not null default 'med' check (priority in ('low','med','high')),
  due_date date,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  google_event_id text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

-- HABITS ---------------------------------------------------------------------
create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  area_id uuid not null references areas (id) on delete cascade,
  title text not null,
  cadence text not null default 'daily' check (cadence in ('daily','weekly','custom')),
  target_time text,
  rrule text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- HABIT LOGS -----------------------------------------------------------------
create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references habits (id) on delete cascade,
  log_date date not null,
  completed boolean not null default true,
  note text,
  unique (habit_id, log_date)
);

-- AREA SCORES ----------------------------------------------------------------
create table if not exists area_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  area_id uuid not null references areas (id) on delete cascade,
  week_start date not null,
  score int not null check (score between 0 and 100),
  note text,
  unique (area_id, week_start)
);

-- REVIEWS --------------------------------------------------------------------
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  reflections jsonb not null default '{}'::jsonb,
  focus text,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- GOOGLE TOKENS --------------------------------------------------------------
create table if not exists user_google_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  calendar_id text not null default 'primary',
  sync_token text,
  updated_at timestamptz not null default now()
);

-- ROW LEVEL SECURITY ---------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'areas','goals','tasks','habits','habit_logs',
    'area_scores','reviews','user_google_tokens'
  ] loop
    execute format('alter table %I enable row level security;', t);
    execute format($f$
      create policy %1$I_owner on %1$I
      for all using (user_id = auth.uid())
      with check (user_id = auth.uid());
    $f$, t);
  end loop;
end $$;

-- Helpful indexes
create index if not exists idx_goals_area on goals (area_id);
create index if not exists idx_tasks_area on tasks (area_id);
create index if not exists idx_tasks_sched on tasks (scheduled_start);
create index if not exists idx_habits_area on habits (area_id);
create index if not exists idx_habit_logs_habit on habit_logs (habit_id, log_date);
create index if not exists idx_area_scores_area on area_scores (area_id, week_start);
