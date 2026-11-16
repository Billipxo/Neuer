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
