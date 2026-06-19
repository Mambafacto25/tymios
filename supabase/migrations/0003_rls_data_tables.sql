-- Politiques d'accès (RLS) sur les tables de données.
-- Principe : tout utilisateur CONNECTÉ peut lire ; les écritures nécessaires
-- aux étapes suivantes (création de pièce, mise à jour des caches d'état,
-- pointages dérivés) sont autorisées aux utilisateurs connectés.
-- Le registre `events` garde son verrouillage strict (cf. 0002).

alter table poles        enable row level security;
alter table users        enable row level security;
alter table ateliers     enable row level security;
alter table pieces       enable row level security;
alter table time_entries enable row level security;

-- poles : lecture
drop policy if exists poles_select on poles;
create policy poles_select on poles for select to authenticated using (true);

-- users : lecture
drop policy if exists users_select on users;
create policy users_select on users for select to authenticated using (true);

-- ateliers : lecture
drop policy if exists ateliers_select on ateliers;
create policy ateliers_select on ateliers for select to authenticated using (true);

-- pieces : lecture + création + mise à jour (caches statut/propriétaire)
drop policy if exists pieces_select on pieces;
create policy pieces_select on pieces for select to authenticated using (true);
drop policy if exists pieces_insert on pieces;
create policy pieces_insert on pieces for insert to authenticated with check (true);
drop policy if exists pieces_update on pieces;
create policy pieces_update on pieces for update to authenticated using (true) with check (true);

-- time_entries : lecture + insertion (projection des pointages)
drop policy if exists time_entries_select on time_entries;
create policy time_entries_select on time_entries for select to authenticated using (true);
drop policy if exists time_entries_insert on time_entries;
create policy time_entries_insert on time_entries for insert to authenticated with check (true);
