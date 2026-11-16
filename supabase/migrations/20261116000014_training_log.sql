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
