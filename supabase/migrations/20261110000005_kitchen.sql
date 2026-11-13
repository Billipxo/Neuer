-- Teller – Küche: Heißluftfritteuse und Lieblingsrezepte im Profil

alter table public.profiles
  add column if not exists has_airfryer boolean not null default true,
  add column if not exists favorite_recipes text[] not null default '{}';
