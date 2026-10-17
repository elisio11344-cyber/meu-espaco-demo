do $$ begin
  create type public.currency_code as enum ('AUD', 'BRL', 'USD');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.transaction_type as enum ('income', 'expense');
exception when duplicate_object then null;
end $$;

create table public.bank_institutions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, country_code char(2) not null, currency public.currency_code not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id, name, country_code, currency)
);
create table public.financial_accounts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  institution_id uuid references public.bank_institutions(id), name text not null, currency public.currency_code not null,
  initial_balance_cents bigint not null default 0, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.financial_categories (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, color text not null default '#ffd600', icon text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id, name)
);
create table public.financial_transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.financial_accounts(id), category_id uuid references public.financial_categories(id),
  currency public.currency_code not null, transaction_type public.transaction_type not null,
  description text not null, amount_cents bigint not null check(amount_cents > 0), occurred_at timestamptz not null,
  notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create or replace function public.enforce_transaction_currency()
returns trigger language plpgsql set search_path = '' as $$
declare v_currency public.currency_code; v_user_id uuid; v_category_user uuid;
begin
  select currency, user_id into v_currency, v_user_id from public.financial_accounts where id = new.account_id;
  if v_user_id <> new.user_id or v_currency <> new.currency then raise exception 'account_currency_mismatch'; end if;
  if new.category_id is not null then
    select user_id into v_category_user from public.financial_categories where id = new.category_id;
    if v_category_user <> new.user_id then raise exception 'category_owner_mismatch'; end if;
  end if;
  return new;
end;
$$;
create or replace function public.enforce_account_institution()
returns trigger language plpgsql set search_path = '' as $$
declare v_user_id uuid; v_currency public.currency_code;
begin
  if new.institution_id is null then return new; end if;
  select user_id, currency into v_user_id, v_currency
  from public.bank_institutions where id = new.institution_id;
  if v_user_id is distinct from new.user_id or v_currency is distinct from new.currency then
    raise exception 'institution_owner_or_currency_mismatch';
  end if;
  return new;
end;
$$;
create trigger financial_transaction_currency before insert or update on public.financial_transactions for each row execute function public.enforce_transaction_currency();
create trigger financial_account_institution before insert or update on public.financial_accounts for each row execute function public.enforce_account_institution();
create trigger bank_institutions_updated_at before update on public.bank_institutions for each row execute function public.set_updated_at();
create trigger financial_accounts_updated_at before update on public.financial_accounts for each row execute function public.set_updated_at();
create trigger financial_categories_updated_at before update on public.financial_categories for each row execute function public.set_updated_at();
create trigger financial_transactions_updated_at before update on public.financial_transactions for each row execute function public.set_updated_at();
create trigger financial_accounts_audit after insert or update or delete on public.financial_accounts for each row execute function public.audit_row_change();
create trigger financial_transactions_audit after insert or update or delete on public.financial_transactions for each row execute function public.audit_row_change();

alter table public.bank_institutions enable row level security;
alter table public.financial_accounts enable row level security;
alter table public.financial_categories enable row level security;
alter table public.financial_transactions enable row level security;
create policy "users_manage_own_banks" on public.bank_institutions for all to authenticated using(user_id = auth.uid()) with check(user_id = auth.uid());
create policy "users_manage_own_accounts" on public.financial_accounts for all to authenticated using(user_id = auth.uid()) with check(user_id = auth.uid());
create policy "users_manage_own_financial_categories" on public.financial_categories for all to authenticated using(user_id = auth.uid()) with check(user_id = auth.uid());
create policy "users_manage_own_transactions" on public.financial_transactions for all to authenticated using(user_id = auth.uid()) with check(user_id = auth.uid());

create view public.financial_balances_by_currency with (security_invoker = true) as
with account_totals as (
  select user_id, currency, sum(initial_balance_cents) as initial_cents
  from public.financial_accounts where is_active group by user_id, currency
), transaction_totals as (
  select user_id, currency, sum(case when transaction_type = 'income' then amount_cents else -amount_cents end) as movement_cents
  from public.financial_transactions group by user_id, currency
)
select a.user_id, a.currency, a.initial_cents + coalesce(t.movement_cents, 0) as balance_cents
from account_totals a left join transaction_totals t on t.user_id = a.user_id and t.currency = a.currency;

create index financial_accounts_user_currency_idx on public.financial_accounts(user_id, currency);
create index financial_transactions_user_currency_date_idx on public.financial_transactions(user_id, currency, occurred_at desc);
