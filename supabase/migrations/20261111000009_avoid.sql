-- Teller – Unverträglichkeiten und Allergien im Profil (gluten, milk, egg, nuts, soy, sesame, fish)

alter table public.profiles
  add column if not exists avoid text[] not null default '{}';
