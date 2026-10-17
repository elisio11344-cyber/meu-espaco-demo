begin;

alter table public.profiles
  add column theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  add column onboarding_seen jsonb not null default '{}'::jsonb;

drop view if exists public.financial_balances_by_currency;

alter table public.bank_institutions
  alter column currency type text using currency::text;
alter table public.financial_accounts
  alter column currency type text using currency::text;
alter table public.financial_transactions
  alter column currency type text using currency::text;

alter table public.bank_institutions
  add constraint bank_institutions_currency_format check (currency ~ '^[A-Z]{3}$');
alter table public.financial_accounts
  add constraint financial_accounts_currency_format check (currency ~ '^[A-Z]{3}$');
alter table public.financial_transactions
  add constraint financial_transactions_currency_format check (currency ~ '^[A-Z]{3}$');

create or replace function public.enforce_transaction_currency()
returns trigger language plpgsql set search_path = '' as $$
declare v_currency text; v_user_id uuid; v_category_user uuid;
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
declare v_user_id uuid; v_currency text;
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

create table public.user_currencies (
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null check (code ~ '^[A-Z]{3}$'),
  name text not null check (char_length(name) between 1 and 80),
  country_code char(2) not null check (country_code ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, code)
);

alter table public.user_currencies enable row level security;
create policy "users_manage_own_currencies" on public.user_currencies
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

insert into public.user_currencies (user_id, code, name, country_code)
select users.id, currencies.code, currencies.name, currencies.country_code
from auth.users as users
cross join (values
  ('AUD', 'Dólar australiano', 'AU'),
  ('BRL', 'Real brasileiro', 'BR'),
  ('USD', 'Dólar americano', 'US')
) as currencies(code, name, country_code)
on conflict (user_id, code) do nothing;

alter table public.bank_institutions
  add constraint bank_institutions_user_currency_fk
  foreign key (user_id, currency) references public.user_currencies(user_id, code)
  on update cascade on delete restrict;
alter table public.financial_accounts
  add constraint financial_accounts_user_currency_fk
  foreign key (user_id, currency) references public.user_currencies(user_id, code)
  on update cascade on delete restrict;
alter table public.financial_transactions
  add constraint financial_transactions_user_currency_fk
  foreign key (user_id, currency) references public.user_currencies(user_id, code)
  on update cascade on delete restrict;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC')
  )
  on conflict (user_id) do nothing;

  insert into public.user_currencies (user_id, code, name, country_code)
  values
    (new.id, 'AUD', 'Dólar australiano', 'AU'),
    (new.id, 'BRL', 'Real brasileiro', 'BR'),
    (new.id, 'USD', 'Dólar americano', 'US')
  on conflict (user_id, code) do nothing;
  return new;
end;
$$;

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

commit;
