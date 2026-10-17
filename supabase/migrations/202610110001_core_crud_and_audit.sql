create extension if not exists pgcrypto;

do $$ begin
  create type public.goal_status as enum ('not_started', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  frequency text not null,
  target_value numeric(12,2) not null check (target_value > 0),
  unit text not null,
  points_reward integer not null default 10 check (points_reward >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  reference_date date not null,
  completed_value numeric(12,2),
  completed_at timestamptz not null default now(),
  unique (user_id, habit_id, reference_date)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  target_value numeric(14,2) not null check (target_value > 0),
  current_value numeric(14,2) not null default 0,
  deadline timestamptz,
  status public.goal_status not null default 'not_started',
  points_reward integer not null default 100 check (points_reward >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.note_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_note_id uuid not null references public.notes(id) on delete cascade,
  target_note_id uuid not null references public.notes(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (source_note_id <> target_note_id),
  unique (user_id, source_note_id, target_note_id)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := coalesce(new.user_id, old.user_id);
  v_entity_id uuid := coalesce(new.id, old.id);
begin
  if auth.uid() is not null and v_user_id <> auth.uid() then
    raise exception 'forbidden';
  end if;
  insert into public.audit_events (user_id, entity_type, entity_id, action, old_data, new_data)
  values (v_user_id, tg_table_name, v_entity_id, lower(tg_op), case when tg_op <> 'INSERT' then to_jsonb(old) end, case when tg_op <> 'DELETE' then to_jsonb(new) end);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.enforce_note_link_ownership()
returns trigger language plpgsql set search_path = '' as $$
declare v_source_user uuid; v_target_user uuid;
begin
  select user_id into v_source_user from public.notes where id = new.source_note_id;
  select user_id into v_target_user from public.notes where id = new.target_note_id;
  if v_source_user <> new.user_id or v_target_user <> new.user_id then raise exception 'note_owner_mismatch'; end if;
  return new;
end;
$$;

create trigger habits_updated_at before update on public.habits for each row execute function public.set_updated_at();
create trigger goals_updated_at before update on public.goals for each row execute function public.set_updated_at();
create trigger notes_updated_at before update on public.notes for each row execute function public.set_updated_at();
create trigger habits_audit after insert or update or delete on public.habits for each row execute function public.audit_row_change();
create trigger goals_audit after insert or update or delete on public.goals for each row execute function public.audit_row_change();
create trigger notes_audit after insert or update or delete on public.notes for each row execute function public.audit_row_change();
create trigger note_links_ownership before insert or update on public.note_links for each row execute function public.enforce_note_link_ownership();

alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;
alter table public.goals enable row level security;
alter table public.notes enable row level security;
alter table public.note_links enable row level security;
alter table public.audit_events enable row level security;

create policy "users_manage_own_habits" on public.habits for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users_read_own_habit_completions" on public.habit_completions for select to authenticated using (user_id = auth.uid());
create policy "users_manage_own_goals" on public.goals for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users_manage_own_notes" on public.notes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users_manage_own_note_links" on public.note_links for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users_read_own_audit" on public.audit_events for select to authenticated using (user_id = auth.uid());

create index habits_user_id_idx on public.habits(user_id);
create index goals_user_id_idx on public.goals(user_id);
create index notes_user_id_idx on public.notes(user_id);
create index audit_events_entity_idx on public.audit_events(user_id, entity_type, entity_id, created_at desc);
