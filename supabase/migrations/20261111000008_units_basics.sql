-- Teller – Esslöffel und Teelöffel beim Erfassen (z. B. 1 EL Olivenöl)

alter table public.foods
  add column if not exists tbsp_g numeric check (tbsp_g is null or tbsp_g > 0),
  add column if not exists tsp_g numeric check (tsp_g is null or tsp_g > 0);

alter table public.log_entries drop constraint if exists log_entries_unit_check;
alter table public.log_entries
  add constraint log_entries_unit_check check (unit in ('g','piece','serving','tbsp','tsp'));
