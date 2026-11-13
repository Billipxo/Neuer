-- Teller – Wochenplaner

create table if not exists public.plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  meal text not null check (meal in ('breakfast','lunch','dinner','snack')),
  kind text not null check (kind in ('recipe','dish','text')),
  recipe_id text,
  dish_id uuid references public.dishes (id) on delete set null,
  title text not null,
  servings numeric not null default 1 check (servings > 0),
  kcal numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists plan_items_user_date_idx on public.plan_items (user_id, date);

alter table public.plan_items enable row level security;
create policy "plan_items_select_own" on public.plan_items for select using (auth.uid() = user_id);
create policy "plan_items_insert_own" on public.plan_items for insert with check (auth.uid() = user_id);
create policy "plan_items_update_own" on public.plan_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "plan_items_delete_own" on public.plan_items for delete using (auth.uid() = user_id);
