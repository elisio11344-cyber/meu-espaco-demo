create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(display_name) <= 80),
  check (char_length(timezone) between 1 and 64)
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "users_manage_own_profile" on public.profiles
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

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
  return new;
end;
$$;

create trigger create_profile_after_signup
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

insert into public.profiles (user_id, display_name, timezone)
select
  id,
  coalesce(raw_user_meta_data ->> 'display_name', ''),
  coalesce(raw_user_meta_data ->> 'timezone', 'UTC')
from auth.users
on conflict (user_id) do nothing;
