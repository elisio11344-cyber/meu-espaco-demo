alter table public.goals
  add column is_important boolean not null default false;

create index goals_user_important_idx
  on public.goals(user_id, is_important)
  where is_important;
