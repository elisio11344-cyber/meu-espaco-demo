create table public.plannings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  category text not null default 'Pessoal',
  kind text not null check (kind in ('financial', 'quantity', 'hours', 'sessions')),
  unit text not null,
  currency text,
  target_amount bigint not null check (target_amount > 0),
  initial_amount bigint not null default 0 check (initial_amount >= 0),
  start_date date not null,
  end_date date not null,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly')),
  registration_granularity text not null default 'period' check (registration_granularity in ('daily', 'period')),
  distribution_mode text not null check (distribution_mode in ('uniform', 'custom', 'sources', 'mixed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  color text not null default '#ffd600',
  icon text not null default '◎',
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  goal_id uuid references public.goals(id) on delete set null,
  account_id uuid references public.financial_accounts(id) on delete set null,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  check ((kind = 'financial' and currency is not null) or kind <> 'financial')
);

create table public.planning_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  planning_id uuid not null references public.plannings(id) on delete cascade,
  name text not null,
  source_type text not null check (source_type in ('gross_income', 'net_income', 'reserved', 'expense_reduction', 'manual')),
  color text not null default '#ffd600',
  icon text not null default '●',
  default_amount bigint not null default 0 check (default_amount >= 0),
  suggested_frequency text not null check (suggested_frequency in ('daily', 'weekly', 'monthly')),
  active boolean not null default true,
  sort_order integer not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.planning_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  planning_id uuid not null references public.plannings(id) on delete cascade,
  period_index integer not null check (period_index >= 0),
  start_date date not null,
  end_date date not null,
  label text not null,
  unavailable boolean not null default false,
  notes text not null default '',
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (planning_id, period_index),
  check (end_date >= start_date)
);

create table public.planning_period_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  planning_id uuid not null references public.plannings(id) on delete cascade,
  period_id uuid not null references public.planning_periods(id) on delete cascade,
  source_id uuid not null references public.planning_sources(id) on delete cascade,
  planned_amount bigint not null default 0 check (planned_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_id, source_id)
);

create table public.planning_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  planning_id uuid not null references public.plannings(id) on delete cascade,
  period_id uuid not null references public.planning_periods(id) on delete cascade,
  source_id uuid not null references public.planning_sources(id) on delete restrict,
  amount bigint not null check (amount >= 0),
  occurred_on date not null,
  notes text not null default '',
  transaction_id uuid references public.financial_transactions(id) on delete set null,
  original_currency text,
  exchange_rate numeric(20, 10),
  exchange_rate_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (exchange_rate is null or exchange_rate > 0)
);

create table public.planning_revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  planning_id uuid not null references public.plannings(id) on delete cascade,
  reason text not null,
  effective_from date not null,
  previous_periods jsonb not null,
  created_at timestamptz not null default now()
);

create trigger plannings_updated_at before update on public.plannings for each row execute function public.set_updated_at();
create trigger planning_sources_updated_at before update on public.planning_sources for each row execute function public.set_updated_at();
create trigger planning_periods_updated_at before update on public.planning_periods for each row execute function public.set_updated_at();
create trigger planning_period_allocations_updated_at before update on public.planning_period_allocations for each row execute function public.set_updated_at();
create trigger planning_entries_updated_at before update on public.planning_entries for each row execute function public.set_updated_at();

alter table public.plannings enable row level security;
alter table public.planning_sources enable row level security;
alter table public.planning_periods enable row level security;
alter table public.planning_period_allocations enable row level security;
alter table public.planning_entries enable row level security;
alter table public.planning_revisions enable row level security;

create policy "users_manage_own_plannings" on public.plannings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users_manage_own_planning_sources" on public.planning_sources for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users_manage_own_planning_periods" on public.planning_periods for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users_manage_own_planning_allocations" on public.planning_period_allocations for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users_manage_own_planning_entries" on public.planning_entries for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users_manage_own_planning_revisions" on public.planning_revisions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create index plannings_user_status_idx on public.plannings(user_id, status, end_date);
create index planning_sources_user_planning_idx on public.planning_sources(user_id, planning_id, sort_order);
create index planning_periods_user_planning_idx on public.planning_periods(user_id, planning_id, period_index);
create index planning_allocations_user_period_idx on public.planning_period_allocations(user_id, period_id);
create index planning_entries_user_planning_date_idx on public.planning_entries(user_id, planning_id, occurred_on desc);
create index planning_revisions_user_planning_idx on public.planning_revisions(user_id, planning_id, created_at desc);
