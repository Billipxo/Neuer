-- Teller – Rezept-Varianten und eigene Rezepte
-- Nährwerte werden nicht gespeichert, sondern in der App aus den Zutaten berechnet.

create table if not exists public.recipe_variants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Rezept aus dem Kochbuch, auf dem die Variante beruht (null = eigenes Rezept)
  base_recipe_id text,
  title text not null,
  chapter text not null default 'vegetarisch',
  meal text[] not null default '{}',
  time_min integer not null default 0 check (time_min >= 0),
  rest_min integer check (rest_min >= 0),
  servings numeric not null default 1 check (servings > 0),
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  airfryer jsonb,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists recipe_variants_user_idx on public.recipe_variants (user_id);

alter table public.recipe_variants enable row level security;
create policy "recipe_variants_select_own" on public.recipe_variants for select using (auth.uid() = user_id);
create policy "recipe_variants_insert_own" on public.recipe_variants for insert with check (auth.uid() = user_id);
create policy "recipe_variants_update_own" on public.recipe_variants for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recipe_variants_delete_own" on public.recipe_variants for delete using (auth.uid() = user_id);
