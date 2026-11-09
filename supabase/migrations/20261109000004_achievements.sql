-- Teller – Erfolge

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  unlocked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, key)
);

alter table public.achievements enable row level security;
create policy "achievements_select_own" on public.achievements for select using (auth.uid() = user_id);
create policy "achievements_insert_own" on public.achievements for insert with check (auth.uid() = user_id);
create policy "achievements_update_own" on public.achievements for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "achievements_delete_own" on public.achievements for delete using (auth.uid() = user_id);
