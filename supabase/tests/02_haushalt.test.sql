-- Gemeinsamer Haushalt: Wer darf was sehen und ändern?
select test.user('anna');
select test.user('ben');
select test.user('cem');

-- Ausgangslage: Anna und Ben haben private Einträge -------------------------------------------------------
select test.login('anna');
insert into public.plan_items (date, meal, kind, title) values (current_date + 1, 'dinner', 'text', 'Linsensuppe');
insert into public.plan_items (date, meal, kind, title) values (current_date - 7, 'dinner', 'text', 'Chili von letzter Woche');
insert into public.shopping_items (name) values ('Linsen');
insert into public.dishes (name, servings, ingredients) values ('Annas Müsli', 1, '[]');
insert into public.recipe_variants (title, servings, ingredients, steps) values ('Annas Bolognese', 4, '[]', '[]');
insert into public.log_entries (date, meal, name, amount, unit, kcal) values (current_date, 'breakfast', 'Müsli', 1, 'serving', 320);
insert into public.foods (name, kcal_100) values ('Annas Granola', 450);
insert into public.weight_logs (date, kg) values (current_date, 70);
select test.ok(public.my_household() is null, 'Ohne Haushalt liefert my_household nichts');

select test.login('ben');
insert into public.shopping_items (name) values ('Kaffee');
insert into public.plan_items (date, meal, kind, title) values (current_date + 2, 'lunch', 'text', 'Bens Salat');

-- Gründen ---------------------------------------------------------------------------------------------
select test.login('anna');
select public.create_household('  Familie Beispiel ', 'Anna') as h \gset
select (:'h'::jsonb ->> 'invite_code') as code, (:'h'::jsonb ->> 'id') as hid \gset
select test.ok(:'code' ~ '^[0-9A-F]{5}-[0-9A-F]{5}$', 'Der Einladungscode hat die Form XXXXX-XXXXX');
select test.ok(:'h'::jsonb ->> 'name' = 'Familie Beispiel', 'Der Name wird ohne Leerraum am Rand gespeichert');
select test.ok(jsonb_array_length(:'h'::jsonb -> 'members') = 1 and :'h'::jsonb -> 'members' -> 0 ->> 'role' = 'owner', 'Wer gründet, ist erstes Mitglied und Gründerin');
select test.ok((:'h'::jsonb ->> 'eaters')::int = 2, 'Vorgabe: zwei Personen am Tisch');
select test.fails($$select public.create_household('Zweiter', 'Anna')$$, 'P0001', 'Ein Konto kann nur einem Haushalt angehören');
select test.ok(test.rows(format('select * from public.plan_items where household_id = %L', :'hid')) = 1, 'Annas Plan ab heute ist mitgekommen');
select test.ok(test.rows('select * from public.plan_items where household_id is null') = 1, 'Vergangenes bleibt privat');
select test.ok(test.rows(format('select * from public.shopping_items where household_id = %L', :'hid')) = 1, 'Annas Einkaufsliste ist mitgekommen');

-- Außenstehende sehen nichts ----------------------------------------------------------------------------
select test.login('cem');
select test.ok(test.rows('select * from public.plan_items') + test.rows('select * from public.shopping_items') = 0, 'Cem sieht weder Plan noch Einkaufsliste des Haushalts');
select test.ok(test.rows('select * from public.households') + test.rows('select * from public.household_members') = 0, 'Cem sieht weder Haushalt noch Mitglieder');
select test.ok(test.rows('select * from public.dishes') + test.rows('select * from public.recipe_variants') = 0, 'Cem sieht keine Rezepte und Gerichte von Anna');
select test.fails(format('insert into public.plan_items (date, meal, kind, title, household_id) values (current_date, %L, %L, %L, %L)', 'dinner', 'text', 'Eingeschlichen', :'hid'),
  '42501', 'Cem kann nichts in einen fremden Haushalt eintragen');
select test.ok(test.affected('update public.shopping_items set checked = true') = 0, 'Cem kann fremde Einkäufe nicht abhaken');
select test.ok(test.affected('delete from public.plan_items') = 0, 'Cem kann den fremden Plan nicht löschen');
select test.fails(format('insert into public.household_members (household_id, user_id) values (%L, %L)', :'hid', test.id('cem')), '42501', 'Niemand kann sich selbst als Mitglied eintragen');
select test.fails($$update public.households set name = 'Gekapert'$$, '42501', 'Haushalte lassen sich nicht direkt ändern');
select test.fails('delete from public.household_members', '42501', 'Mitglieder lassen sich nicht direkt entfernen');
select test.ok((public.join_household('AAAAA-00000', 'Cem') ->> 'status') = 'not_found', 'Ein falscher Code führt nicht in den Haushalt');

-- Beitreten -------------------------------------------------------------------------------------------
select test.login('ben');
select public.join_household('  ' || lower(replace(:'code', '-', ' ')) || ' ', 'Ben') as j \gset
select test.ok(:'j'::jsonb ->> 'status' = 'joined', 'Ben tritt mit klein geschriebenem Code ohne Bindestrich bei');
select test.ok(jsonb_array_length(:'j'::jsonb -> 'household' -> 'members') = 2, 'Der Haushalt hat jetzt zwei Mitglieder');
select test.ok((public.join_household(:'code', 'Ben') ->> 'status') = 'already_member', 'Doppeltes Beitreten wird erkannt');
select test.ok(test.rows(format('select * from public.plan_items where household_id = %L', :'hid')) = 2, 'Ben sieht den gemeinsamen Plan samt seinem mitgebrachten Eintrag');
select test.ok(test.rows(format('select * from public.shopping_items where household_id = %L', :'hid')) = 2, 'Ben sieht die gemeinsame Einkaufsliste');
select test.ok(test.rows('select * from public.plan_items where household_id is null') = 0, 'Annas private Einträge bleiben für Ben unsichtbar');
select test.ok(test.rows('select * from public.households') = 1 and test.rows('select * from public.household_members') = 2, 'Mitglieder sehen Haushalt und Mitgliederliste');

-- Gemeinsam bearbeiten ----------------------------------------------------------------------------------
insert into public.plan_items (date, meal, kind, title, household_id) values (current_date + 3, 'dinner', 'text', 'Bens Curry', :'hid');
select test.ok(test.affected('update public.shopping_items set checked = true where name = ''Linsen''') = 1, 'Ben hakt Annas Einkauf ab');
select test.ok(test.affected('update public.plan_items set servings = 2 where title = ''Linsensuppe''') = 1, 'Ben ändert Annas Planeintrag');
select test.ok(test.affected(format('update public.plan_items set user_id = %L where title = %L', test.id('ben'), 'Linsensuppe')) = 1
  and (select user_id from public.plan_items where title = 'Linsensuppe') = test.id('anna'), 'Wer einen Eintrag angelegt hat, bleibt unverändert');
select test.fails(format('insert into public.plan_items (user_id, date, meal, kind, title, household_id) values (%L, current_date, %L, %L, %L, %L)', test.id('anna'), 'dinner', 'text', 'Untergeschoben', :'hid'),
  '42501', 'Ben kann nichts in Annas Namen eintragen');
select test.fails($$update public.plan_items set household_id = null where title = 'Linsensuppe'$$, '42501', 'Ben kann Annas Eintrag nicht in sein privates Konto ziehen');
select test.ok(test.affected('update public.plan_items set household_id = null where title = ''Bens Curry''') = 1, 'Einen eigenen Eintrag darf Ben wieder privat machen');
select test.ok(test.affected(format('update public.plan_items set household_id = %L where title = %L', :'hid', 'Bens Curry')) = 1, '… und wieder teilen');

-- Lesender Zugriff auf Rezepte und Gerichte, alles andere bleibt privat
select test.ok(test.rows('select * from public.dishes') = 1 and test.rows('select * from public.recipe_variants') = 1, 'Ben sieht Annas Gerichte und eigene Rezepte');
select test.ok(test.affected('update public.dishes set name = ''Umbenannt''') = 0 and test.affected('delete from public.recipe_variants') = 0, 'Ändern oder löschen kann Ben sie nicht');
select test.ok(test.rows('select 1 from public.log_entries union all select 1 from public.foods union all select 1 from public.weight_logs') = 0, 'Protokoll, Lebensmittel und Gewicht von Anna bleiben privat');

select test.login('anna');
select test.ok(test.rows(format('select * from public.plan_items where household_id = %L', :'hid')) = 3, 'Anna sieht Bens Einträge');
select test.ok(test.rows('select * from public.plan_items') = 4, 'Annas private Einträge sind für sie weiter da');
select test.ok((select checked from public.shopping_items where name = 'Linsen'), 'Anna sieht, dass Ben abgehakt hat');
select test.ok(test.affected('delete from public.plan_items where title = ''Bens Salat''') = 1, 'Anna kann Bens gemeinsamen Eintrag löschen');

-- Einstellungen ---------------------------------------------------------------------------------------
select public.update_household(p_name => 'WG Sonnenallee', p_display_name => 'Anna B.', p_eaters => 3, p_new_code => true) as u \gset
select (:'u'::jsonb ->> 'invite_code') as code2 \gset
select test.ok(:'u'::jsonb ->> 'name' = 'WG Sonnenallee' and (:'u'::jsonb ->> 'eaters')::int = 3, 'Name und Personenzahl lassen sich ändern');
select test.ok(:'code2' <> :'code', 'Ein neuer Einladungscode ersetzt den alten');
select test.fails($$select public.update_household(p_eaters => 0)$$, '23514', 'Mindestens eine Person am Tisch');
select test.login('cem');
select test.ok((public.join_household(:'code', 'Cem') ->> 'status') = 'not_found', 'Der alte Code gilt nicht mehr');
select test.fails($$select public.update_household(p_name => 'x')$$, 'P0001', 'Ohne Haushalt gibt es nichts zu ändern');

-- Zu viele Fehlversuche ---------------------------------------------------------------------------------
select public.join_household('00000-0000' || g, 'Cem') from generate_series(1, 8) g;
select test.ok((public.join_household(:'code2', 'Cem') ->> 'status') = 'too_many_attempts', 'Nach zehn Fehlversuchen ist für eine Stunde Schluss – auch mit richtigem Code');
select test.fails('select * from public.household_join_attempts', '42501', 'Die Liste der Fehlversuche ist für die App nicht lesbar');
select test.admin();
delete from public.household_join_attempts;

-- Mitglied entfernen ------------------------------------------------------------------------------------
select test.login('ben');
select test.fails(format('select public.remove_household_member(%L)', test.id('anna')), '42501', 'Nur die Gründerin kann Mitglieder entfernen');
select test.login('anna');
select test.fails(format('select public.remove_household_member(%L)', test.id('anna')), 'P0001', 'Sich selbst entfernt man über „Verlassen“');
select public.remove_household_member(test.id('ben'));
select test.ok(jsonb_array_length(public.my_household() -> 'members') = 1, 'Ben ist kein Mitglied mehr');
select test.ok((select user_id from public.plan_items where title = 'Bens Curry' and household_id = :'hid') = test.id('anna'), 'Bens Einträge bleiben dem Haushalt erhalten');
select test.login('ben');
select test.ok(public.my_household() is null, 'Ben hat keinen Haushalt mehr');
select test.ok(test.rows('select * from public.plan_items where household_id is not null') = 0, 'Ben sieht den gemeinsamen Plan nicht mehr');
select test.ok(test.rows('select * from public.plan_items') = 2, 'Ben behält eine private Kopie des Plans ab heute');
select test.ok(test.rows('select * from public.shopping_items') = 1 and (select name from public.shopping_items) = 'Kaffee', 'Ben behält eine Kopie der offenen Einkäufe');
select test.ok(test.rows('select * from public.dishes') = 0, 'Annas Gerichte sieht Ben nicht mehr');

-- Verlassen: Gründung geht über, der letzte nimmt den Plan mit -------------------------------------------------
select test.ok((public.join_household(:'code2', 'Ben', false) ->> 'status') = 'joined', 'Ben tritt wieder bei, ohne seine Einträge mitzubringen');
select test.ok(test.rows(format('select * from public.plan_items where household_id = %L', :'hid')) = 2, 'Im Haushalt stehen weiter nur die gemeinsamen Einträge');
select test.login('anna');
select public.leave_household(false);
select test.ok(public.my_household() is null, 'Anna hat den Haushalt verlassen');
select test.ok(test.rows('select * from public.plan_items') = 1, 'Ohne Kopie bleibt Anna nur ihr privater Eintrag');
select public.leave_household();
select test.login('ben');
select test.ok(public.my_household() -> 'members' -> 0 ->> 'role' = 'owner', 'Ben rückt als Gründer nach');
select test.ok(test.rows(format('select * from public.plan_items where household_id = %L and user_id = %L', :'hid', test.id('ben'))) = 2, 'Annas gemeinsame Einträge gehören jetzt Ben');
select public.leave_household();
select test.ok(public.my_household() is null, 'Ben hat als Letzter den Haushalt verlassen');
select test.ok(test.rows('select * from public.plan_items') = 4 and test.rows('select * from public.plan_items where household_id is not null') = 0, 'Der gemeinsame Plan ist wieder Bens eigener');
select test.admin();
select test.ok((select count(*) from public.households) = 0, 'Der leere Haushalt ist gelöscht');

-- Konto löschen: Gemeinsames bleibt den anderen erhalten ---------------------------------------------------
select test.login('anna');
select public.create_household('Zu zweit', 'Anna', false) ->> 'invite_code' as code3 \gset
select public.my_household() ->> 'id' as hid3 \gset
insert into public.plan_items (date, meal, kind, title, household_id) values (current_date + 1, 'dinner', 'text', 'Annas Auflauf', :'hid3');
insert into public.shopping_items (name, household_id) values ('Käse', :'hid3');
select test.login('ben');
select test.ok((public.join_household(:'code3', 'Ben', false) ->> 'status') = 'joined', 'Ben tritt dem neuen Haushalt bei');
select test.login('anna');
select public.delete_my_account();
select test.login('ben');
select test.ok(jsonb_array_length(public.my_household() -> 'members') = 1 and public.my_household() -> 'members' -> 0 ->> 'role' = 'owner', 'Nach Annas Kontolöschung führt Ben den Haushalt');
select test.ok(test.rows(format('select * from public.plan_items where household_id = %L', :'hid3')) = 1
  and test.rows(format('select * from public.shopping_items where household_id = %L', :'hid3')) = 1, 'Annas gemeinsame Einträge sind noch da');
select public.delete_my_account();
select test.admin();
select test.ok((select count(*) from public.households) + (select count(*) from public.household_members) = 0, 'Löscht das letzte Mitglied sein Konto, verschwindet der Haushalt');
select test.ok((select count(*) from public.plan_items where household_id is not null) = 0, 'Mit dem Haushalt sind seine Einträge gelöscht');

-- Höchstens acht Mitglieder -------------------------------------------------------------------------------
select test.user('m' || g) from generate_series(1, 9) g;
select test.login('m1');
select public.create_household('Große WG', 'M1', false) ->> 'invite_code' as code4 \gset
select test.admin();
select set_config('test.code4', :'code4', false);
do $$
declare g int;
begin
  for g in 2..8 loop
    perform test.login('m' || g);
    perform test.ok((public.join_household(current_setting('test.code4'), 'M' || g, false) ->> 'status') = 'joined', 'Mitglied ' || g || ' tritt bei');
    perform test.admin();
  end loop;
end $$;
select test.login('m9');
select test.ok((public.join_household(:'code4', 'M9') ->> 'status') = 'full', 'Der neunte Beitritt wird abgelehnt');
select test.login('m1');
select test.ok((public.my_household() ->> 'eaters')::int = 8, 'Die Personenzahl wächst mit den Mitgliedern');

-- Ohne Anmeldung ------------------------------------------------------------------------------------------
select test.anonymous();
select test.fails($$select public.my_household()$$, '42501', 'Ohne Anmeldung ist der Haushalt nicht abrufbar');
select test.fails($$select public.join_household('AAAAA-00000')$$, '42501', 'Ohne Anmeldung kann niemand beitreten');
select test.fails('select * from public.plan_items', '42501', 'Ohne Anmeldung ist der Plan nicht lesbar');
select test.fails('select * from public.shopping_items', '42501', 'Ohne Anmeldung ist die Einkaufsliste nicht lesbar');
select test.fails('select * from public.households', '42501', 'Ohne Anmeldung sind Haushalte nicht lesbar');
