-- Teller – optionales Zielgewicht für den Fortschritt im Verlauf

alter table public.profiles
  add column if not exists target_weight_kg numeric check (target_weight_kg is null or target_weight_kg > 0);
