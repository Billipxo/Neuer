-- Teller – Einkaufsliste

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  amount numeric,
  unit text,
  category text not null default 'sonstiges'
    check (category in ('obst_gemuese','milch','fleisch_fisch','vorrat','sonstiges')),
  checked boolean not null default false,
  in_stock boolean not null default false,
  source text not null default 'manual' check (source in ('plan','manual')),
  created_at timestamptz not null default now()
);
create index if not exists shopping_items_user_idx on public.shopping_items (user_id);

alter table public.shopping_items enable row level security;
-- Die einfachen Regeln nur anlegen, solange es die Regeln für den gemeinsamen Haushalt (spätere Migration) noch
-- nicht gibt – so lässt sich diese Datei gefahrlos erneut ausführen.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shopping_items' and policyname = 'shopping_items_select') then
    drop policy if exists "shopping_items_select_own" on public.shopping_items;
    drop policy if exists "shopping_items_insert_own" on public.shopping_items;
    drop policy if exists "shopping_items_update_own" on public.shopping_items;
    drop policy if exists "shopping_items_delete_own" on public.shopping_items;
    create policy "shopping_items_select_own" on public.shopping_items for select using (auth.uid() = user_id);
    create policy "shopping_items_insert_own" on public.shopping_items for insert with check (auth.uid() = user_id);
    create policy "shopping_items_update_own" on public.shopping_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy "shopping_items_delete_own" on public.shopping_items for delete using (auth.uid() = user_id);
  end if;
end $$;
