-- Teller – komplette Datenbank-Einrichtung
-- Diese Datei wird automatisch aus supabase/migrations/ erzeugt (npm run db:bundle).
-- In Supabase: SQL Editor → New query → gesamten Inhalt einfügen → Run.

-- ===== 20261109000001_core.sql =====
-- Teller – Phase 1: Profil, Lebensmittel, Gerichte, Tagesprotokoll, Wasser, Gewicht
-- Jede Tabelle ist per Row Level Security auf den eingeloggten Nutzer beschränkt.

create extension if not exists "pgcrypto";

-- Profil -------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  age integer check (age is null or (age between 1 and 130)),
  sex text check (sex is null or sex in ('female', 'male')),
  height_cm numeric check (height_cm is null or height_cm > 0),
  weight_kg numeric check (weight_kg is null or weight_kg > 0),
  activity_level text check (activity_level is null or activity_level in ('sedentary','light','moderate','active','very_active')),
  goal text not null default 'maintain' check (goal in ('lose','maintain','gain','custom')),
  kcal_target integer not null default 2000 check (kcal_target >= 0),
  kcal_adjustment integer not null default 0,
  protein_pct integer not null default 25 check (protein_pct between 0 and 100),
  carbs_pct integer not null default 45 check (carbs_pct between 0 and 100),
  fat_pct integer not null default 30 check (fat_pct between 0 and 100),
  water_target_ml integer not null default 2000 check (water_target_ml >= 0),
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

-- Lebensmittel-Bibliothek (eigene + übernommene Open-Food-Facts-Produkte) ----
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  brand text,
  barcode text,
  source text not null default 'custom' check (source in ('custom','off')),
  kcal_100 numeric not null default 0 check (kcal_100 >= 0),
  protein_100 numeric not null default 0 check (protein_100 >= 0),
  carbs_100 numeric not null default 0 check (carbs_100 >= 0),
  fat_100 numeric not null default 0 check (fat_100 >= 0),
  serving_g numeric check (serving_g is null or serving_g > 0),
  piece_g numeric check (piece_g is null or piece_g > 0),
  image_url text,
  is_favorite boolean not null default false,
  last_used_at timestamptz,
  use_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists foods_user_idx on public.foods (user_id, last_used_at desc);
create unique index if not exists foods_user_barcode_uniq on public.foods (user_id, barcode) where barcode is not null;

-- Eigene Gerichte ------------------------------------------------------------
create table if not exists public.dishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  servings numeric not null default 1 check (servings > 0),
  ingredients jsonb not null default '[]'::jsonb,
  is_favorite boolean not null default false,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists dishes_user_idx on public.dishes (user_id);

-- Tagesprotokoll -------------------------------------------------------------
create table if not exists public.log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  meal text not null check (meal in ('breakfast','lunch','dinner','snack')),
  name text not null,
  amount numeric not null default 1,
  unit text not null default 'g' check (unit in ('g','piece','serving')),
  grams numeric,
  kcal numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  food_id uuid references public.foods (id) on delete set null,
  dish_id uuid references public.dishes (id) on delete set null,
  recipe_id text,
  veggies text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists log_entries_user_date_idx on public.log_entries (user_id, date);

-- Wasser -----------------------------------------------------------------------
create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  ml integer not null check (ml > 0),
  created_at timestamptz not null default now()
);
create index if not exists water_logs_user_date_idx on public.water_logs (user_id, date);

-- Gewicht ----------------------------------------------------------------------
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  kg numeric not null check (kg > 0 and kg < 700),
  created_at timestamptz not null default now()
);
create index if not exists weight_logs_user_date_idx on public.weight_logs (user_id, date);

-- RLS für alle Nutzertabellen ----------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['foods','dishes','log_entries','water_logs','weight_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s_select_own" on public.%1$I for select using (auth.uid() = user_id)', t);
    execute format('create policy "%1$s_insert_own" on public.%1$I for insert with check (auth.uid() = user_id)', t);
    execute format('create policy "%1$s_update_own" on public.%1$I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('create policy "%1$s_delete_own" on public.%1$I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- Konto löschen: entfernt den eigenen Auth-Nutzer, alle Daten werden per Cascade gelöscht.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ===== 20261109000002_shopping.sql =====
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
create policy "shopping_items_select_own" on public.shopping_items for select using (auth.uid() = user_id);
create policy "shopping_items_insert_own" on public.shopping_items for insert with check (auth.uid() = user_id);
create policy "shopping_items_update_own" on public.shopping_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "shopping_items_delete_own" on public.shopping_items for delete using (auth.uid() = user_id);

-- ===== 20261109000003_meal_plan.sql =====
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

-- ===== 20261109000004_achievements.sql =====
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

-- ===== 20261110000005_kitchen.sql =====
-- Teller – Küche: Heißluftfritteuse und Lieblingsrezepte im Profil

alter table public.profiles
  add column if not exists has_airfryer boolean not null default true,
  add column if not exists favorite_recipes text[] not null default '{}';

-- ===== 20261110000006_diet.sql =====
-- Teller – Ernährungsweise im Profil (für Rezeptvorschläge)

alter table public.profiles
  add column if not exists diet text not null default 'all'
    check (diet in ('all', 'vegetarian', 'vegan'));

-- ===== 20261111000007_recipe_variants.sql =====
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

-- ===== 20261111000008_units_basics.sql =====
-- Teller – Esslöffel und Teelöffel beim Erfassen (z. B. 1 EL Olivenöl)

alter table public.foods
  add column if not exists tbsp_g numeric check (tbsp_g is null or tbsp_g > 0),
  add column if not exists tsp_g numeric check (tsp_g is null or tsp_g > 0);

alter table public.log_entries drop constraint if exists log_entries_unit_check;
alter table public.log_entries
  add constraint log_entries_unit_check check (unit in ('g','piece','serving','tbsp','tsp'));
