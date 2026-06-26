-- Réglages globaux de l'application (ligne unique).
create table if not exists app_settings (
  id           smallint primary key default 1,
  relance_auto boolean not null default false,
  constraint app_settings_single check (id = 1)
);
insert into app_settings (id) values (1) on conflict (id) do nothing;

alter table app_settings enable row level security;
drop policy if exists app_settings_select on app_settings;
create policy app_settings_select on app_settings for select to authenticated using (true);
drop policy if exists app_settings_update on app_settings;
create policy app_settings_update on app_settings for update to authenticated using (true) with check (true);
