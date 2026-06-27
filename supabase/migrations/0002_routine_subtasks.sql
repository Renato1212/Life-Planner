-- Subtasks on tasks + the Daily Blueprint (routine_blocks).

-- Subtasks: a small checklist stored inline on each task.
alter table tasks
  add column if not exists subtasks jsonb not null default '[]'::jsonb;

-- ROUTINE BLOCKS — the user's "normal working day" template ----------------
create table if not exists routine_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  start_time text not null,        -- "HH:MM"
  end_time text,                   -- "HH:MM"
  area_id uuid references areas (id) on delete set null,
  note text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table routine_blocks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'routine_blocks'
      and policyname = 'routine_blocks_owner'
  ) then
    create policy routine_blocks_owner on routine_blocks
      for all using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

create index if not exists idx_routine_blocks_user
  on routine_blocks (user_id, sort_order);
