-- Hilfen für die Datenbank-Tests: Testkonten, Anmelden als Konto, Prüfungen.
create schema test;
grant usage on schema test to authenticated, anon;

create table test.users (name text primary key, id uuid not null);
create sequence test.checks;
grant usage on sequence test.checks to authenticated, anon;

/** Testkonto anlegen (oder vorhandenes liefern) */
create function test.user(p_name text) returns uuid
language plpgsql as $$
declare uid uuid;
begin
  select u.id into uid from test.users u join auth.users a on a.id = u.id where u.name = p_name;
  if uid is null then
    -- neu anlegen – auch wenn ein früherer Test das Konto gelöscht hat
    delete from test.users where name = p_name;
    insert into auth.users (email) values (p_name || '-' || gen_random_uuid() || '@example.com') returning id into uid;
    insert into test.users values (p_name, uid);
  end if;
  return uid;
end $$;

/** ID eines Testkontos – auch als angemeldetes Konto lesbar */
create function test.id(p_name text) returns uuid
language sql stable security definer set search_path = test
as $$ select id from test.users where name = p_name $$;

/** Als Testkonto anmelden: Die folgenden Befehle laufen mit den Rechten der App (Rolle authenticated, RLS aktiv) */
create function test.login(p_name text) returns void
language plpgsql as $$
declare uid uuid := test.id(p_name);
begin
  if uid is null then raise exception 'Unbekanntes Testkonto %', p_name; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
  execute 'set role authenticated';
end $$;

/** Ohne Anmeldung (Rolle anon) */
create function test.anonymous() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', false);
  execute 'set role anon';
end $$;

/** Zurück zum Datenbank-Verwalter (ohne RLS) */
create function test.admin() returns void
language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', false);
end $$;

create function test.ok(p_cond boolean, p_msg text) returns text
language plpgsql as $$
begin
  if p_cond is not true then raise exception 'FEHLGESCHLAGEN: %', p_msg; end if;
  perform nextval('test.checks');
  return 'ok – ' || p_msg;
end $$;

/** Anzahl der Zeilen, die eine Abfrage mit den aktuellen Rechten liefert */
create function test.rows(p_query text) returns bigint
language plpgsql as $$
declare n bigint;
begin
  execute format('select count(*) from (%s) q', p_query) into n;
  return n;
end $$;

/** Anzahl der Zeilen, die ein ändernder Befehl (insert/update/delete) mit den aktuellen Rechten trifft */
create function test.affected(p_statement text) returns bigint
language plpgsql as $$
declare n bigint;
begin
  execute p_statement;
  get diagnostics n = row_count;
  return n;
end $$;

/** Der Befehl muss mit dem genannten Fehler scheitern (SQLSTATE, z. B. 42501 = keine Berechtigung) */
create function test.fails(p_statement text, p_state text, p_msg text) returns text
language plpgsql as $$
begin
  begin
    execute p_statement;
  exception when others then
    if sqlstate = p_state then
      perform nextval('test.checks');
      return 'ok – ' || p_msg;
    end if;
    raise exception 'FEHLGESCHLAGEN: % (erwartet Fehler %, bekommen %: %)', p_msg, p_state, sqlstate, sqlerrm;
  end;
  raise exception 'FEHLGESCHLAGEN: % (Befehl lief ohne Fehler durch)', p_msg;
end $$;

grant execute on all functions in schema test to authenticated, anon;
