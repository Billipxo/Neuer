-- Jedes Konto sieht und ändert nur die eigenen Daten.
select test.user('anna');
select test.user('ben');

select test.login('anna');
insert into public.profiles (id, name) values (test.id('anna'), 'Anna');
insert into public.foods (name, kcal_100) values ('Haferflocken', 372);
insert into public.dishes (name, servings, ingredients) values ('Müsli', 1, '[]');
insert into public.log_entries (date, meal, name, amount, unit, kcal) values ('2026-11-13', 'breakfast', 'Haferflocken', 40, 'g', 149);
insert into public.log_entries (date, meal, name, amount, unit, kcal) values ('2026-11-13', 'lunch', 'Olivenöl', 1, 'tbsp', 88);
insert into public.water_logs (date, ml) values ('2026-11-13', 250);
insert into public.weight_logs (date, kg) values ('2026-11-13', 82);
insert into public.plan_items (date, meal, kind, title) values ('2026-11-16', 'dinner', 'text', 'Linsensuppe');
insert into public.shopping_items (name) values ('Kaffee');
insert into public.achievements (key) values ('first_entry');
insert into public.recipe_variants (title, servings, ingredients, steps) values ('Bolognese light', 4, '[]', '[]');

select test.ok(test.rows('select * from public.log_entries') = 2, 'Anna sieht ihre Einträge');
select test.fails($$insert into public.achievements (key) values ('first_entry')$$, '23505', 'Jedes Abzeichen gibt es je Konto nur einmal');
select test.fails($$insert into public.foods (name, barcode) values ('A', '123'), ('B', '123')$$, '23505', 'Ein Barcode kommt je Konto nur einmal vor');
select test.fails($$insert into public.log_entries (date, meal, name, amount, unit, kcal) values ('2026-11-13', 'lunch', 'x', 1, 'becher', 1)$$, '23514', 'Unbekannte Einheiten werden abgelehnt');

select test.login('ben');
select test.ok(test.rows('select * from public.profiles') = 0, 'Ben sieht Annas Profil nicht');
select test.ok(
  test.rows('select 1 from public.foods union all select 1 from public.dishes union all select 1 from public.log_entries
             union all select 1 from public.water_logs union all select 1 from public.weight_logs union all select 1 from public.plan_items
             union all select 1 from public.shopping_items union all select 1 from public.achievements union all select 1 from public.recipe_variants') = 0,
  'Ben sieht keine einzige Zeile von Anna');
select test.ok(test.affected('update public.log_entries set kcal = 1') = 0, 'Ben kann Annas Einträge nicht ändern');
select test.ok(test.affected('delete from public.shopping_items') = 0, 'Ben kann Annas Einkaufsliste nicht leeren');
select test.fails(format('insert into public.log_entries (user_id, date, meal, name, amount, unit, kcal) values (%L, %L, %L, %L, 1, %L, 1)', test.id('anna'), '2026-11-13', 'lunch', 'Untergeschoben', 'g'),
  '42501', 'Ben kann Anna keine Einträge unterschieben');
select test.fails(format('insert into public.profiles (id, name) values (%L, %L)', test.id('anna'), 'Übernahme'), '42501', 'Ben kann kein fremdes Profil anlegen');
insert into public.foods (name, barcode) values ('Skyr', '123');
select test.ok(test.rows('select * from public.foods') = 1, 'Derselbe Barcode ist in einem anderen Konto erlaubt');

select test.anonymous();
select test.ok(test.rows('select 1 from public.foods union all select 1 from public.log_entries union all select 1 from public.profiles') = 0, 'Ohne Anmeldung ist nichts lesbar');
select test.fails('select public.delete_my_account()', '42501', 'Ohne Anmeldung lässt sich kein Konto löschen');

-- Konto löschen entfernt alles
select test.login('anna');
select public.delete_my_account();
select test.admin();
select test.ok((select count(*) from auth.users where id = test.id('anna')) = 0, 'Annas Konto ist gelöscht');
select test.ok(
  (select count(*) from public.log_entries) + (select count(*) from public.profiles) + (select count(*) from public.plan_items)
  + (select count(*) from public.shopping_items) + (select count(*) from public.recipe_variants) + (select count(*) from public.achievements)
  + (select count(*) from public.dishes) + (select count(*) from public.water_logs) + (select count(*) from public.weight_logs) = 0,
  'Mit dem Konto sind alle Daten von Anna gelöscht');
select test.ok((select count(*) from public.foods) = 1, 'Bens Daten bleiben unberührt');
