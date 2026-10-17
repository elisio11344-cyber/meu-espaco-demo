alter table public.notes
  add column is_pinned boolean not null default false,
  add column is_important boolean not null default false;

create unique index notes_one_pinned_per_user_idx
  on public.notes(user_id)
  where is_pinned;

create index notes_user_important_idx
  on public.notes(user_id, is_important)
  where is_important;
