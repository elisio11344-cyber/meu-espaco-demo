create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  tag text not null default 'Pessoal',
  color text not null default '#ffd600',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at >= start_at)
);

create trigger calendar_events_updated_at before update on public.calendar_events
  for each row execute function public.set_updated_at();
create trigger calendar_events_audit after insert or update or delete on public.calendar_events
  for each row execute function public.audit_row_change();

alter table public.calendar_events enable row level security;
create policy "users_manage_own_calendar_events" on public.calendar_events
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create index calendar_events_user_start_idx on public.calendar_events(user_id, start_at);
