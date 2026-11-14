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
