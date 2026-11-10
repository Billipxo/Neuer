-- Teller – Ernährungsweise im Profil (für Rezeptvorschläge)

alter table public.profiles
  add column if not exists diet text not null default 'all'
    check (diet in ('all', 'vegetarian', 'vegan'));
