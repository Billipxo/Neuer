-- Fingerabdruck des Schemas „public“: Spalten, Regeln, Funktionen (samt Rechten), Trigger, Bedingungen, Indizes.
-- Zwei Datenbanken mit gleichem Fingerabdruck sind für die App gleich eingerichtet (scripts/db-test.mjs).
select md5(string_agg(line, E'\n' order by line))
from (
  select 'spalte ' || table_name || '.' || column_name || ' ' || data_type || ' ' || is_nullable || ' ' || coalesce(column_default, '') as line
  from information_schema.columns where table_schema = 'public'
  union all
  select 'regel ' || tablename || '.' || policyname || ' ' || cmd || ' ' || permissive || ' ' || roles::text || ' ' || coalesce(qual, '') || ' / ' || coalesce(with_check, '')
  from pg_policies where schemaname = 'public'
  union all
  select 'funktion ' || p.oid::regprocedure::text || ' ' || md5(pg_get_functiondef(p.oid)) || ' ' || coalesce(p.proacl::text, '')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prokind = 'f'
  union all
  select 'trigger ' || pg_get_triggerdef(t.oid)
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not t.tgisinternal
  union all
  select 'bedingung ' || c.conrelid::regclass::text || ' ' || c.conname || ' ' || pg_get_constraintdef(c.oid)
  from pg_constraint c join pg_namespace n on n.oid = c.connamespace where n.nspname = 'public'
  union all
  select 'index ' || indexdef from pg_indexes where schemaname = 'public'
  union all
  select 'rls ' || c.relname || ' ' || c.relrowsecurity
  from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'
  union all
  select 'live ' || tablename from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public'
) s;
