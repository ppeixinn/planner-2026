-- Planner sync table. Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run again.

create table if not exists public.records (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  tbl        text        not null,
  id         text        not null,
  data       jsonb       not null,
  updated_at bigint      not null,          -- device time of the edit (ms), used for last-write-wins
  deleted    boolean     not null default false,
  server_ts  timestamptz not null default clock_timestamp(),  -- when the server stored it; the pull cursor
  primary key (user_id, tbl, id)
);

create index if not exists records_user_server_ts on public.records (user_id, server_ts);

-- Each person can only ever see and change their own rows.
alter table public.records enable row level security;

drop policy if exists "records: read own" on public.records;
drop policy if exists "records: insert own" on public.records;
drop policy if exists "records: update own" on public.records;
drop policy if exists "records: delete own" on public.records;

create policy "records: read own"   on public.records for select using (auth.uid() = user_id);
create policy "records: insert own" on public.records for insert with check (auth.uid() = user_id);
create policy "records: update own" on public.records for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "records: delete own" on public.records for delete using (auth.uid() = user_id);

-- Keep the newest edit: an upload carrying an older updated_at than what is stored is ignored.
create or replace function public.records_keep_newest()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return old;
  end if;
  new.server_ts := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists records_keep_newest on public.records;
create trigger records_keep_newest
  before insert or update on public.records
  for each row execute function public.records_keep_newest();

-- Live updates between devices.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'records'
  ) then
    alter publication supabase_realtime add table public.records;
  end if;
end;
$$;
