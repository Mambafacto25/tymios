-- Suppression DÉFINITIVE réelle d'un compte, même avec historique.
-- Le registre events reste verrouillé pour tous SAUF lors d'une purge explicite
-- déclenchée par delete_user (chef d'atelier), via le drapeau de session app.purge.

-- 1) Le trigger d'immuabilité autorise l'opération si la purge est activée.
create or replace function refuse_event_mutation()
  returns trigger
  language plpgsql
as $$
begin
  if current_setting('app.purge', true) = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  raise exception
    'events est un registre en insertion seule : % interdit', tg_op
    using errcode = 'check_violation';
end;
$$;

-- 2) delete_user purge réellement le compte et ses traces.
create or replace function delete_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (
    select 1 from users
    where id = auth.uid()
      and role ~* 'chef|atelier|responsable|admin'
  ) then
    raise exception 'Action réservée au chef d''atelier.';
  end if;
  if p_user = auth.uid() then
    raise exception 'Impossible de supprimer son propre compte.';
  end if;

  -- Autorise la purge des événements pour cette transaction uniquement.
  perform set_config('app.purge', 'on', true);

  update pieces set proprietaire_courant_id = null where proprietaire_courant_id = p_user;
  update pieces set relais_vers_id = null where relais_vers_id = p_user;
  delete from time_entries where user_id = p_user;
  delete from events where auteur_id = p_user;
  delete from users where id = p_user;
  delete from auth.users where id = p_user;
end;
$$;

grant execute on function delete_user(uuid) to authenticated;
