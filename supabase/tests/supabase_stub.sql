-- Nachbau dessen, was ein Supabase-Projekt von Haus aus mitbringt – nur für die Tests in einer leeren PostgreSQL
-- (scripts/db-test.mjs). In einem echten Supabase-Projekt wird diese Datei NICHT ausgeführt.

-- Rollen, unter denen die App auf die Datenbank zugreift (Rollen gelten für den ganzen Datenbank-Server)
do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

-- Neuere Supabase-Projekte geben den API-Rollen auf neue Tabellen und Funktionen im Schema public NICHTS von selbst
-- frei („permission denied for table …“, wenn eine Migration die Rechte nicht ausdrücklich vergibt). Der Nachbau ist
-- deshalb bewusst streng: keine automatischen Rechte – was die App braucht, müssen die Migrationen selbst vergeben.
-- Ältere Projekte geben automatisch alles frei; dort schützt wie hier die Row Level Security.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public revoke execute on functions from public;

-- Anmeldung: Nutzertabelle und die Funktion, die das angemeldete Konto aus dem Zugriffstoken liest
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz not null default now()
);
create function auth.uid() returns uuid
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid
$$;

-- Live-Aktualisierung: Supabase liefert diese (leere) Veröffentlichung mit
create publication supabase_realtime;
