-- Sauvegarde des préférences d'affichage sur le compte (multi-appareils).
alter table users add column if not exists prefs jsonb not null default '{}'::jsonb;
