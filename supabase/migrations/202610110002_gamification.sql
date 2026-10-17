do $$ begin
  create type public.point_entry_type as enum ('earn', 'spend', 'adjustment');
exception when duplicate_object then null;
end $$;

create table public.point_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_earned integer not null default 0 check (lifetime_earned >= 0),
  updated_at timestamptz not null default now()
);

create table public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_type public.point_entry_type not null,
  amount integer not null check (amount <> 0),
  source_type text not null,
  source_id text not null,
  description text not null,
  created_at timestamptz not null default now(),
  unique (user_id, source_type, source_id)
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  points_cost integer not null check (points_cost > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id uuid not null references public.rewards(id),
  title_snapshot text not null,
  cost_snapshot integer not null check (cost_snapshot > 0),
  redeemed_at timestamptz not null default now()
);

create or replace function public.credit_points(p_amount integer, p_source_type text, p_source_id text, p_description text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_inserted uuid;
  v_balance integer;
begin
  if v_user_id is null or p_amount <= 0 then raise exception 'invalid_credit'; end if;
  insert into public.point_ledger (user_id, entry_type, amount, source_type, source_id, description)
  values (v_user_id, 'earn', p_amount, p_source_type, p_source_id, p_description)
  on conflict (user_id, source_type, source_id) do nothing returning id into v_inserted;
  insert into public.point_wallets(user_id) values (v_user_id) on conflict do nothing;
  if v_inserted is not null then
    update public.point_wallets set balance = balance + p_amount, lifetime_earned = lifetime_earned + p_amount, updated_at = now() where user_id = v_user_id returning balance into v_balance;
  else
    select balance into v_balance from public.point_wallets where user_id = v_user_id;
  end if;
  return v_balance;
end;
$$;

create or replace function public.complete_habit(p_habit_id uuid, p_reference_date date default current_date)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_habit public.habits;
begin
  select * into v_habit from public.habits where id = p_habit_id and user_id = auth.uid() and is_active for update;
  if not found then raise exception 'habit_not_found'; end if;
  insert into public.habit_completions(user_id, habit_id, reference_date) values (auth.uid(), p_habit_id, p_reference_date)
  on conflict (user_id, habit_id, reference_date) do nothing;
  return public.credit_points(v_habit.points_reward, 'habit_completion', p_habit_id::text || ':' || p_reference_date::text, 'Hábito concluído: ' || v_habit.name);
end;
$$;

create or replace function public.complete_goal(p_goal_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_goal public.goals;
begin
  select * into v_goal from public.goals where id = p_goal_id and user_id = auth.uid() for update;
  if not found then raise exception 'goal_not_found'; end if;
  if v_goal.completed_at is null then update public.goals set status = 'completed', current_value = target_value, completed_at = now() where id = p_goal_id; end if;
  return public.credit_points(v_goal.points_reward, 'goal_completion', p_goal_id::text, 'Meta concluída: ' || v_goal.title);
end;
$$;

create or replace function public.purchase_reward(p_reward_id uuid)
returns public.reward_redemptions language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_reward public.rewards; v_wallet public.point_wallets; v_redemption public.reward_redemptions;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  select * into v_reward from public.rewards where id = p_reward_id and user_id = v_user_id and is_active;
  if not found then raise exception 'reward_not_found'; end if;
  insert into public.point_wallets(user_id) values (v_user_id) on conflict do nothing;
  select * into v_wallet from public.point_wallets where user_id = v_user_id for update;
  if v_wallet.balance < v_reward.points_cost then raise exception 'insufficient_points'; end if;
  insert into public.reward_redemptions(user_id, reward_id, title_snapshot, cost_snapshot) values (v_user_id, v_reward.id, v_reward.title, v_reward.points_cost) returning * into v_redemption;
  insert into public.point_ledger(user_id, entry_type, amount, source_type, source_id, description) values (v_user_id, 'spend', -v_reward.points_cost, 'reward_redemption', v_redemption.id::text, 'Compra: ' || v_reward.title);
  update public.point_wallets set balance = balance - v_reward.points_cost, updated_at = now() where user_id = v_user_id;
  return v_redemption;
end;
$$;

alter table public.point_wallets enable row level security;
alter table public.point_ledger enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;
create trigger rewards_updated_at before update on public.rewards for each row execute function public.set_updated_at();
create trigger rewards_audit after insert or update or delete on public.rewards for each row execute function public.audit_row_change();
create policy "users_read_own_wallet" on public.point_wallets for select to authenticated using (user_id = auth.uid());
create policy "users_read_own_ledger" on public.point_ledger for select to authenticated using (user_id = auth.uid());
create policy "users_manage_own_rewards" on public.rewards for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users_read_own_redemptions" on public.reward_redemptions for select to authenticated using (user_id = auth.uid());

revoke execute on function public.credit_points(integer, text, text, text) from public, anon;
revoke execute on function public.complete_habit(uuid, date) from public, anon;
revoke execute on function public.complete_goal(uuid) from public, anon;
revoke execute on function public.purchase_reward(uuid) from public, anon;
grant execute on function public.complete_habit(uuid, date) to authenticated;
grant execute on function public.complete_goal(uuid) to authenticated;
grant execute on function public.purchase_reward(uuid) to authenticated;
