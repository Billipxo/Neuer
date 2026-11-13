-- Teller – komplette Datenbank-Einrichtung
-- Diese Datei wird automatisch aus supabase/migrations/ erzeugt (npm run db:bundle).
-- In Supabase: SQL Editor → New query → gesamten Inhalt einfügen → Run.
-- Bricht das Einfügen ab („syntax error“), stattdessen setup-teil-1.sql, -2 und -3 nacheinander ausführen.

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

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "profiles_delete_own" on public.profiles;
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
    execute format('drop policy if exists "%1$s_select_own" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_insert_own" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_update_own" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_delete_own" on public.%1$I', t);
    execute format('create policy "%1$s_select_own" on public.%1$I for select using (auth.uid() = user_id)', t);
    execute format('create policy "%1$s_insert_own" on public.%1$I for insert with check (auth.uid() = user_id)', t);
    execute format('create policy "%1$s_update_own" on public.%1$I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('create policy "%1$s_delete_own" on public.%1$I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- Konto löschen: entfernt den eigenen Auth-Nutzer, alle Daten werden per Cascade gelöscht.
-- Nur anlegen, wenn es die Funktion noch nicht gibt: Die Haushalts-Migration ersetzt sie durch eine erweiterte
-- Fassung, und ein erneutes Ausführen dieser Datei soll das nicht zurückdrehen.
do $do$
begin
  if to_regprocedure('public.delete_my_account()') is null then
    create function public.delete_my_account()
    returns void
    language plpgsql
    security definer
    set search_path = public, auth
    as $fn$
    begin
      if auth.uid() is null then
        raise exception 'Nicht angemeldet';
      end if;
      delete from auth.users where id = auth.uid();
    end;
    $fn$;
  end if;
end $do$;

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
-- Die einfachen Regeln nur anlegen, solange es die Regeln für den gemeinsamen Haushalt (spätere Migration) noch
-- nicht gibt – so lässt sich diese Datei gefahrlos erneut ausführen.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'plan_items' and policyname = 'plan_items_select') then
    drop policy if exists "plan_items_select_own" on public.plan_items;
    drop policy if exists "plan_items_insert_own" on public.plan_items;
    drop policy if exists "plan_items_update_own" on public.plan_items;
    drop policy if exists "plan_items_delete_own" on public.plan_items;
    create policy "plan_items_select_own" on public.plan_items for select using (auth.uid() = user_id);
    create policy "plan_items_insert_own" on public.plan_items for insert with check (auth.uid() = user_id);
    create policy "plan_items_update_own" on public.plan_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy "plan_items_delete_own" on public.plan_items for delete using (auth.uid() = user_id);
  end if;
end $$;

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
drop policy if exists "achievements_select_own" on public.achievements;
create policy "achievements_select_own" on public.achievements for select using (auth.uid() = user_id);
drop policy if exists "achievements_insert_own" on public.achievements;
create policy "achievements_insert_own" on public.achievements for insert with check (auth.uid() = user_id);
drop policy if exists "achievements_update_own" on public.achievements;
create policy "achievements_update_own" on public.achievements for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "achievements_delete_own" on public.achievements;
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
drop policy if exists "recipe_variants_select_own" on public.recipe_variants;
create policy "recipe_variants_select_own" on public.recipe_variants for select using (auth.uid() = user_id);
drop policy if exists "recipe_variants_insert_own" on public.recipe_variants;
create policy "recipe_variants_insert_own" on public.recipe_variants for insert with check (auth.uid() = user_id);
drop policy if exists "recipe_variants_update_own" on public.recipe_variants;
create policy "recipe_variants_update_own" on public.recipe_variants for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "recipe_variants_delete_own" on public.recipe_variants;
create policy "recipe_variants_delete_own" on public.recipe_variants for delete using (auth.uid() = user_id);

-- ===== 20261111000008_units_basics.sql =====
-- Teller – Esslöffel und Teelöffel beim Erfassen (z. B. 1 EL Olivenöl)

alter table public.foods
  add column if not exists tbsp_g numeric check (tbsp_g is null or tbsp_g > 0),
  add column if not exists tsp_g numeric check (tsp_g is null or tsp_g > 0);

alter table public.log_entries drop constraint if exists log_entries_unit_check;
alter table public.log_entries
  add constraint log_entries_unit_check check (unit in ('g','piece','serving','tbsp','tsp'));

-- ===== 20261111000009_avoid.sql =====
-- Teller – Unverträglichkeiten und Allergien im Profil (gluten, milk, egg, nuts, soy, sesame, fish)

alter table public.profiles
  add column if not exists avoid text[] not null default '{}';

-- ===== 20261111000010_target_weight.sql =====
-- Teller – optionales Zielgewicht für den Fortschritt im Verlauf

alter table public.profiles
  add column if not exists target_weight_kg numeric check (target_weight_kg is null or target_weight_kg > 0);

-- ===== 20261113000011_household.sql =====
-- Teller – Gemeinsamer Haushalt: Wochenplan und Einkaufsliste mit anderen Konten teilen
--
-- Geteilt werden Wochenplan, Einkaufsliste sowie (nur lesend) eigene Rezepte und Gerichte.
-- Protokoll, Gewicht, Wasser, Ziele und Erfolge bleiben privat.

-- Haushalte ---------------------------------------------------------------------
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  -- Einladungscode (Form XXXXX-XXXXX); wer ihn kennt, kann beitreten
  invite_code text not null unique,
  -- Personen am Tisch: Portionen im Plan gelten pro Person, die Einkaufsliste rechnet für alle
  eaters integer not null default 2 check (eaters between 1 and 20),
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
-- Jedes Konto gehört zu höchstens einem Haushalt
create unique index if not exists household_members_user_uniq on public.household_members (user_id);

-- Fehlversuche beim Beitreten (Schutz gegen das Durchprobieren von Codes); für die App nicht lesbar
create table if not exists public.household_join_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index if not exists household_join_attempts_user_idx on public.household_join_attempts (user_id, attempted_at);

-- Plan und Einkaufsliste können zu einem Haushalt gehören (NULL = privat)
alter table public.plan_items add column if not exists household_id uuid references public.households (id) on delete cascade;
alter table public.shopping_items add column if not exists household_id uuid references public.households (id) on delete cascade;
create index if not exists plan_items_household_date_idx on public.plan_items (household_id, date) where household_id is not null;
create index if not exists shopping_items_household_idx on public.shopping_items (household_id) where household_id is not null;

-- Haushalt des angemeldeten Kontos. „security definer“, damit die Regeln unten nicht auf sich selbst verweisen.
create or replace function public.my_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.household_members where user_id = auth.uid()
$$;
-- Auch ohne Anmeldung aufrufbar (liefert dann NULL), damit die Regeln unten für jede Rolle auswertbar bleiben
revoke all on function public.my_household_id() from public;
grant execute on function public.my_household_id() to anon, authenticated;

-- Zugriffsregeln ----------------------------------------------------------------
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_join_attempts enable row level security;

-- Lesen: nur der eigene Haushalt und dessen Mitglieder. Geändert wird ausschließlich über die Funktionen unten.
drop policy if exists "households_select_member" on public.households;
create policy "households_select_member" on public.households for select
  using (id = (select public.my_household_id()));
drop policy if exists "household_members_select_same" on public.household_members;
create policy "household_members_select_same" on public.household_members for select
  using (household_id = (select public.my_household_id()));

-- Wochenplan und Einkaufsliste: private Zeilen gehören dem Konto, Haushalts-Zeilen allen Mitgliedern
do $$
declare t text;
begin
  foreach t in array array['plan_items', 'shopping_items'] loop
    execute format('drop policy if exists "%1$s_select_own" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_insert_own" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_update_own" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_delete_own" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_select" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_insert" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_update" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_delete" on public.%1$I', t);
    execute format($p$create policy "%1$s_select" on public.%1$I for select using (
      (household_id is null and auth.uid() = user_id) or household_id = (select public.my_household_id()))$p$, t);
    execute format($p$create policy "%1$s_insert" on public.%1$I for insert with check (
      auth.uid() = user_id and (household_id is null or household_id = (select public.my_household_id())))$p$, t);
    execute format($p$create policy "%1$s_update" on public.%1$I for update using (
      (household_id is null and auth.uid() = user_id) or household_id = (select public.my_household_id()))
      with check ((household_id is null and auth.uid() = user_id) or household_id = (select public.my_household_id()))$p$, t);
    execute format($p$create policy "%1$s_delete" on public.%1$I for delete using (
      (household_id is null and auth.uid() = user_id) or household_id = (select public.my_household_id()))$p$, t);
  end loop;
end $$;

-- Wer eine Zeile angelegt hat, lässt sich von der App aus nicht umschreiben
create or replace function public.keep_row_author()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;
drop trigger if exists plan_items_keep_author on public.plan_items;
create trigger plan_items_keep_author before update on public.plan_items
  for each row execute function public.keep_row_author();
drop trigger if exists shopping_items_keep_author on public.shopping_items;
create trigger shopping_items_keep_author before update on public.shopping_items
  for each row execute function public.keep_row_author();

-- Eigene Rezepte und Gerichte: Mitglieder desselben Haushalts dürfen sie lesen (ändern kann nur, wem sie gehören)
drop policy if exists "dishes_select_household" on public.dishes;
create policy "dishes_select_household" on public.dishes for select using (
  exists (select 1 from public.household_members m
          where m.user_id = dishes.user_id and m.household_id = (select public.my_household_id())));
drop policy if exists "recipe_variants_select_household" on public.recipe_variants;
create policy "recipe_variants_select_household" on public.recipe_variants for select using (
  exists (select 1 from public.household_members m
          where m.user_id = recipe_variants.user_id and m.household_id = (select public.my_household_id())));

-- Verlässt das letzte Mitglied den Haushalt, wird er gelöscht; geht die Gründerin oder der Gründer, rückt jemand nach
create or replace function public.household_after_member_left()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.household_members where household_id = old.household_id) then
    delete from public.households where id = old.household_id;
  elsif old.role = 'owner' then
    update public.household_members set role = 'owner'
    where household_id = old.household_id
      and user_id = (select user_id from public.household_members where household_id = old.household_id order by joined_at, user_id limit 1);
  end if;
  return null;
end;
$$;
drop trigger if exists household_members_after_delete on public.household_members;
create trigger household_members_after_delete after delete on public.household_members
  for each row execute function public.household_after_member_left();

-- [Teilgrenze] Hier darf die Einrichtung in einen neuen Teil wechseln (siehe scripts/bundle-sql.mjs)
-- Hilfsfunktionen (nicht für die App freigegeben) ---------------------------------

-- Einladungscode aus 10 zufälligen Zeichen (0-9, A-F), in der Mitte getrennt
create or replace function public.household_new_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare code text;
begin
  loop
    code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    code := substr(code, 1, 5) || '-' || substr(code, 6, 5);
    exit when not exists (select 1 from public.households where invite_code = code);
  end loop;
  return code;
end;
$$;
revoke all on function public.household_new_code() from public, anon, authenticated;

-- Eingetippten Code vereinheitlichen: Großbuchstaben, ohne Trennzeichen, O→0 und I/L→1
create or replace function public.household_normalize_code(p_code text)
returns text
language sql
immutable
as $$
  select case when char_length(c) = 10 then substr(c, 1, 5) || '-' || substr(c, 6, 5) else c end
  from (select translate(regexp_replace(upper(coalesce(p_code, '')), '[^0-9A-Z]', '', 'g'), 'OIL', '011') as c) s
$$;
revoke all on function public.household_normalize_code(text) from public, anon, authenticated;

-- Eigene private Einträge in den Haushalt mitnehmen: Plan ab heute und die ganze Einkaufsliste
create or replace function public.household_bring_items(p_household uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.plan_items set household_id = p_household
  where user_id = p_user and household_id is null and date >= current_date;
  update public.shopping_items set household_id = p_household
  where user_id = p_user and household_id is null;
end;
$$;
revoke all on function public.household_bring_items(uuid, uuid) from public, anon, authenticated;

-- Abschied aus dem Haushalt vorbereiten: auf Wunsch eine private Kopie (Plan ab heute, offene Einkäufe) anlegen;
-- was das Konto selbst eingetragen hat, bleibt dem Haushalt erhalten und geht an ein verbleibendes Mitglied über.
create or replace function public.household_detach_member(p_household uuid, p_user uuid, p_take_copy boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare heir uuid;
begin
  select user_id into heir from public.household_members
  where household_id = p_household and user_id <> p_user
  order by (role = 'owner') desc, joined_at, user_id limit 1;

  if heir is null then
    -- Letztes Mitglied: Der gemeinsame Plan wird wieder der eigene
    update public.plan_items set household_id = null, user_id = p_user where household_id = p_household;
    update public.shopping_items set household_id = null, user_id = p_user where household_id = p_household;
    return;
  end if;

  if p_take_copy then
    insert into public.plan_items (user_id, date, meal, kind, recipe_id, dish_id, title, servings, kcal, protein, carbs, fat)
    select p_user, date, meal, kind, recipe_id, dish_id, title, servings, kcal, protein, carbs, fat
    from public.plan_items where household_id = p_household and date >= current_date;
    insert into public.shopping_items (user_id, name, amount, unit, category, checked, in_stock, source)
    select p_user, name, amount, unit, category, checked, in_stock, source
    from public.shopping_items where household_id = p_household and not checked;
  end if;
  update public.plan_items set user_id = heir where household_id = p_household and user_id = p_user;
  update public.shopping_items set user_id = heir where household_id = p_household and user_id = p_user;
end;
$$;
revoke all on function public.household_detach_member(uuid, uuid, boolean) from public, anon, authenticated;

-- [Teilgrenze] Hier darf die Einrichtung in einen neuen Teil wechseln (siehe scripts/bundle-sql.mjs)
-- Funktionen für die App ----------------------------------------------------------

-- Eigener Haushalt mit Mitgliedern (oder NULL)
create or replace function public.my_household()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', h.id,
    'name', h.name,
    'invite_code', h.invite_code,
    'eaters', h.eaters,
    'created_at', h.created_at,
    'members', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'user_id', m.user_id, 'display_name', m.display_name, 'role', m.role, 'joined_at', m.joined_at
      ) order by m.joined_at, m.user_id), '[]'::jsonb)
      from public.household_members m where m.household_id = h.id)
  )
  from public.households h
  where h.id = (select household_id from public.household_members where user_id = auth.uid())
$$;
revoke all on function public.my_household() from public, anon;
grant execute on function public.my_household() to authenticated;

-- Haushalt gründen
create or replace function public.create_household(p_name text, p_display_name text default '', p_bring boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare h uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'Du bist bereits in einem Haushalt.' using errcode = 'P0001';
  end if;
  insert into public.households (name, invite_code)
  values (btrim(p_name), public.household_new_code())
  returning id into h;
  insert into public.household_members (household_id, user_id, display_name, role)
  values (h, auth.uid(), left(btrim(coalesce(p_display_name, '')), 40), 'owner');
  if p_bring then
    perform public.household_bring_items(h, auth.uid());
  end if;
  return public.my_household();
end;
$$;
revoke all on function public.create_household(text, text, boolean) from public, anon;
grant execute on function public.create_household(text, text, boolean) to authenticated;

-- Mit Einladungscode beitreten. Liefert {status: joined | not_found | too_many_attempts | already_member | full}
create or replace function public.join_household(p_code text, p_display_name text default '', p_bring boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  h uuid;
  code text := public.household_normalize_code(p_code);
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    return jsonb_build_object('status', 'already_member');
  end if;
  delete from public.household_join_attempts where attempted_at < now() - interval '1 day';
  if (select count(*) from public.household_join_attempts
      where user_id = auth.uid() and attempted_at > now() - interval '1 hour') >= 10 then
    return jsonb_build_object('status', 'too_many_attempts');
  end if;
  select id into h from public.households where invite_code = code;
  if h is null then
    insert into public.household_join_attempts (user_id) values (auth.uid());
    return jsonb_build_object('status', 'not_found');
  end if;
  if (select count(*) from public.household_members where household_id = h) >= 8 then
    return jsonb_build_object('status', 'full');
  end if;
  insert into public.household_members (household_id, user_id, display_name)
  values (h, auth.uid(), left(btrim(coalesce(p_display_name, '')), 40));
  update public.households set eaters = greatest(eaters, (select count(*) from public.household_members where household_id = h))
  where id = h;
  if p_bring then
    perform public.household_bring_items(h, auth.uid());
  end if;
  return jsonb_build_object('status', 'joined', 'household', public.my_household());
end;
$$;
revoke all on function public.join_household(text, text, boolean) from public, anon;
grant execute on function public.join_household(text, text, boolean) to authenticated;

-- Haushalt verlassen
create or replace function public.leave_household(p_take_copy boolean default true)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare h uuid;
begin
  select household_id into h from public.household_members where user_id = auth.uid();
  if h is null then
    return;
  end if;
  perform public.household_detach_member(h, auth.uid(), p_take_copy);
  delete from public.household_members where household_id = h and user_id = auth.uid();
end;
$$;
revoke all on function public.leave_household(boolean) from public, anon;
grant execute on function public.leave_household(boolean) to authenticated;

-- Mitglied entfernen (nur Gründerin oder Gründer); das Mitglied behält eine private Kopie
create or replace function public.remove_household_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare h uuid;
begin
  select household_id into h from public.household_members where user_id = auth.uid() and role = 'owner';
  if h is null then
    raise exception 'Nur wer den Haushalt gegründet hat, kann Mitglieder entfernen.' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Zum Austreten bitte „Haushalt verlassen“ verwenden.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.household_members where household_id = h and user_id = p_user_id) then
    return;
  end if;
  perform public.household_detach_member(h, p_user_id, true);
  delete from public.household_members where household_id = h and user_id = p_user_id;
end;
$$;
revoke all on function public.remove_household_member(uuid) from public, anon;
grant execute on function public.remove_household_member(uuid) to authenticated;

-- Haushalt ändern: Name, eigener Anzeigename, Personen am Tisch, neuer Einladungscode
create or replace function public.update_household(
  p_name text default null,
  p_display_name text default null,
  p_eaters integer default null,
  p_new_code boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare h uuid;
begin
  select household_id into h from public.household_members where user_id = auth.uid();
  if h is null then
    raise exception 'Du bist in keinem Haushalt.' using errcode = 'P0001';
  end if;
  if p_name is not null then
    update public.households set name = btrim(p_name) where id = h;
  end if;
  if p_eaters is not null then
    update public.households set eaters = p_eaters where id = h;
  end if;
  if p_new_code then
    update public.households set invite_code = public.household_new_code() where id = h;
  end if;
  if p_display_name is not null then
    update public.household_members set display_name = left(btrim(p_display_name), 40)
    where household_id = h and user_id = auth.uid();
  end if;
  return public.my_household();
end;
$$;
revoke all on function public.update_household(text, text, integer, boolean) from public, anon;
grant execute on function public.update_household(text, text, integer, boolean) to authenticated;

-- Konto löschen: Gemeinsame Einträge bleiben dem Haushalt erhalten
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare h uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;
  select household_id into h from public.household_members where user_id = auth.uid();
  if h is not null and exists (select 1 from public.household_members where household_id = h and user_id <> auth.uid()) then
    perform public.household_detach_member(h, auth.uid(), false);
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Live-Aktualisierung (Supabase Realtime): Änderungen an Plan, Einkaufsliste und Mitgliedern melden
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['plan_items', 'shopping_items', 'household_members', 'households'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
