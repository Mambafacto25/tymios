-- Relais — « le registre est sacré ».
-- La table events est INSERTION SEULE, garanti par la base (pas seulement le code).
--
-- Deux verrous complémentaires :
--   1. RLS : aucune politique UPDATE/DELETE -> ces commandes sont refusées.
--   2. Trigger : bloque tout UPDATE/DELETE même via un rôle élevé (service_role).
--      Le service_role contourne RLS, d'où la ceinture-bretelles du trigger.

-- ---------------------------------------------------------------------------
-- 1. Row Level Security
-- ---------------------------------------------------------------------------
alter table events enable row level security;

-- Lecture : tout utilisateur connecté peut consulter le journal.
create policy events_select_authenticated
  on events for select
  to authenticated
  using (true);

-- Écriture : insertion seule, et l'auteur doit être l'utilisateur connecté.
create policy events_insert_self
  on events for insert
  to authenticated
  with check (auteur_id = auth.uid());

-- AUCUNE politique UPDATE ni DELETE -> ces opérations sont refusées par RLS.

-- ---------------------------------------------------------------------------
-- 2. Trigger anti-altération (couvre aussi service_role qui contourne RLS)
-- ---------------------------------------------------------------------------
create or replace function refuse_event_mutation()
  returns trigger
  language plpgsql
as $$
begin
  raise exception
    'events est un registre en insertion seule : % interdit', tg_op
    using errcode = 'check_violation';
end;
$$;

create trigger events_no_update
  before update on events
  for each row execute function refuse_event_mutation();

create trigger events_no_delete
  before delete on events
  for each row execute function refuse_event_mutation();
