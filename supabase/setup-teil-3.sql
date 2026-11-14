-- Teller – Datenbank-Einrichtung, Teil 3 von 3
-- Erzeugt aus supabase/migrations/ (npm run db:bundle). Die Teile der Reihe nach ausführen:
-- In Supabase: SQL Editor → New query → gesamten Inhalt einfügen → Run. Jeder Teil lässt sich gefahrlos wiederholen.

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

-- ===== 20261113000012_grants.sql =====
-- Teller – Zugriffsrechte ausdrücklich vergeben
--
-- Neuere Supabase-Projekte geben angemeldeten Nutzern auf neue Tabellen nichts mehr von selbst frei; ohne diese Datei
-- meldet die App „permission denied for table …“. Welche Zeilen jemand sehen und ändern darf, regeln weiterhin die
-- Schutzregeln (Row Level Security) der einzelnen Tabellen – hier geht es nur darum, dass die App überhaupt zugreifen darf.
-- Ohne Anmeldung (Rolle anon) gibt es keinen Zugriff.

grant usage on schema public to authenticated;

-- Eigene Daten: lesen, anlegen, ändern, löschen (jeweils nur die eigenen Zeilen bzw. die des eigenen Haushalts)
grant select, insert, update, delete on
  public.profiles,
  public.foods,
  public.dishes,
  public.log_entries,
  public.water_logs,
  public.weight_logs,
  public.shopping_items,
  public.plan_items,
  public.achievements,
  public.recipe_variants
to authenticated;

-- Haushalt und Mitglieder: nur lesen – geändert wird ausschließlich über die geprüften Funktionen
grant select on public.households, public.household_members to authenticated;

-- Funktionen, die die App aufruft
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.my_household() to authenticated;
grant execute on function public.create_household(text, text, boolean) to authenticated;
grant execute on function public.join_household(text, text, boolean) to authenticated;
grant execute on function public.leave_household(boolean) to authenticated;
grant execute on function public.remove_household_member(uuid) to authenticated;
grant execute on function public.update_household(text, text, integer, boolean) to authenticated;
-- wird von den Schutzregeln für Plan und Einkaufsliste gebraucht
grant execute on function public.my_household_id() to anon, authenticated;
