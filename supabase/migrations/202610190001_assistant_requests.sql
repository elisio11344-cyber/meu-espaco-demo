create table public.assistant_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('gemini')),
  model text not null,
  action_type text not null check (action_type in ('transaction', 'note', 'event', 'clarification', 'error')),
  input_characters integer not null check (input_characters between 0 and 500),
  status text not null check (status in ('completed', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.assistant_requests enable row level security;

create policy "users_read_own_assistant_requests"
  on public.assistant_requests for select to authenticated
  using (user_id = auth.uid());

create policy "users_create_own_assistant_requests"
  on public.assistant_requests for insert to authenticated
  with check (user_id = auth.uid());

create index assistant_requests_user_created_idx
  on public.assistant_requests(user_id, created_at desc);
