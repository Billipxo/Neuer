-- Teller – Datenbank-Einrichtung, Teil 4 von 4
-- Erzeugt aus supabase/migrations/ (npm run db:bundle). Die Teile der Reihe nach ausführen:
-- In Supabase: SQL Editor → New query → gesamten Inhalt einfügen → Run. Jeder Teil lässt sich gefahrlos wiederholen.

-- ===== 20261116000013_activity.sql =====
-- Teller – Sport & Bewegung
--
-- Sporteinheiten mit Dauer (oder Schritten) und geschätztem Verbrauch; auf Wunsch rechnet die App den Verbrauch aufs
-- Tagesziel an (Einstellung im Profil). Jeder sieht nur die eigenen Einträge – auch im gemeinsamen Haushalt.
-- Die Datei lässt sich gefahrlos mehrfach ausführen.

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  -- Sportart aus dem Katalog der App („joggen“, „schritte“ …) oder „eigene“
  kind text not null check (char_length(kind) between 1 and 40),
  name text not null check (char_length(name) between 1 and 80),
  minutes integer check (minutes is null or (minutes > 0 and minutes <= 1440)),
  steps integer check (steps is null or (steps > 0 and steps <= 200000)),
  -- geschätzter zusätzlicher Verbrauch (ohne Grundumsatz) oder selbst eingetragen, z. B. von der Uhr
  kcal integer not null check (kcal >= 0 and kcal <= 10000),
  created_at timestamptz not null default now()
);
create index if not exists activity_logs_user_date_idx on public.activity_logs (user_id, date);

alter table public.activity_logs enable row level security;
drop policy if exists "activity_logs_select_own" on public.activity_logs;
drop policy if exists "activity_logs_insert_own" on public.activity_logs;
drop policy if exists "activity_logs_update_own" on public.activity_logs;
drop policy if exists "activity_logs_delete_own" on public.activity_logs;
create policy "activity_logs_select_own" on public.activity_logs for select using (auth.uid() = user_id);
create policy "activity_logs_insert_own" on public.activity_logs for insert with check (auth.uid() = user_id);
create policy "activity_logs_update_own" on public.activity_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "activity_logs_delete_own" on public.activity_logs for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.activity_logs to authenticated;

-- Profil: Sport aufs Tagesziel anrechnen (Voreinstellung: nein – das Aktivitätsniveau steckt schon im Tagesziel)
alter table public.profiles add column if not exists activity_in_budget boolean not null default false;

-- ===== 20261116000014_training_log.sql =====
-- Teller – Eigenes Training (Trainingstagebuch)
--
-- Zu einer Sporteinheit lassen sich die Übungen mit Sätzen, Wiederholungen, Gewicht oder Zeit speichern
-- (z. B. Bankdrücken 3 × 10 mit 60 kg). Vorhandene Einträge bleiben unverändert.
-- Die Datei lässt sich gefahrlos mehrfach ausführen.

alter table public.activity_logs add column if not exists details jsonb;

alter table public.activity_logs drop constraint if exists activity_logs_details_check;
alter table public.activity_logs add constraint activity_logs_details_check
  check (details is null or (jsonb_typeof(details) = 'object' and octet_length(details::text) <= 40000));

-- Neue Spalte sofort für die App sichtbar machen
notify pgrst, 'reload schema';

-- ===== 20261117000015_training_plan.sql =====
-- Teller – Training planen
--
-- Trainings im Wochenplan, passend zu den Mahlzeiten: ein Vorschlag der App (Ort, Schwerpunkt, Level und eine
-- Zufallszahl – daraus entsteht immer wieder dasselbe Training), ein früheres eigenes Training als Vorlage oder einfach
-- eine Sportart mit Dauer. Ob ein geplantes Training erledigt ist, leitet die App aus dem eingetragenen Sport des Tages
-- ab. Trainingspläne sind persönlich: Jeder sieht nur die eigenen – auch im gemeinsamen Haushalt.
-- Die Datei lässt sich gefahrlos mehrfach ausführen.

create table if not exists public.training_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  -- Sportart aus dem Katalog der App („krafttraining“, „joggen“ …) oder „eigene“
  kind text not null check (char_length(kind) between 1 and 40),
  title text not null check (char_length(title) between 1 and 80),
  minutes integer check (minutes is null or (minutes > 0 and minutes <= 1440)),
  -- Vorschlag (Ort, Schwerpunkt, Level, Zufallszahl) oder die Übungen einer Vorlage
  details jsonb check (details is null or (jsonb_typeof(details) = 'object' and octet_length(details::text) <= 40000)),
  created_at timestamptz not null default now()
);
create index if not exists training_plans_user_date_idx on public.training_plans (user_id, date);

alter table public.training_plans enable row level security;
drop policy if exists "training_plans_select_own" on public.training_plans;
drop policy if exists "training_plans_insert_own" on public.training_plans;
drop policy if exists "training_plans_update_own" on public.training_plans;
drop policy if exists "training_plans_delete_own" on public.training_plans;
create policy "training_plans_select_own" on public.training_plans for select using (auth.uid() = user_id);
create policy "training_plans_insert_own" on public.training_plans for insert with check (auth.uid() = user_id);
create policy "training_plans_update_own" on public.training_plans for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "training_plans_delete_own" on public.training_plans for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.training_plans to authenticated;

-- Neue Tabelle sofort für die App sichtbar machen
notify pgrst, 'reload schema';
