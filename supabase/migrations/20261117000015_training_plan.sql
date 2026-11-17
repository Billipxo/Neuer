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
