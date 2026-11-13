-- Teller – Datenbank-Einrichtung, Teil 2 von 3
-- Erzeugt aus supabase/migrations/ (npm run db:bundle). Die Teile der Reihe nach ausführen:
-- In Supabase: SQL Editor → New query → gesamten Inhalt einfügen → Run. Jeder Teil lässt sich gefahrlos wiederholen.

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
