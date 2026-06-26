-- Suppression DÉFINITIVE d'un compte (réservé au chef d'atelier).
-- Refuse si le compte a un historique (registre immuable) — on désactive alors.
-- Sinon : détache ses pièces, supprime ses pointages, puis sa fiche et son accès.
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
  if exists (select 1 from events where auteur_id = p_user) then
    raise exception
      'Ce compte a un historique (registre immuable). Désactivez-le plutôt.';
  end if;

  update pieces set proprietaire_courant_id = null where proprietaire_courant_id = p_user;
  update pieces set relais_vers_id = null where relais_vers_id = p_user;
  delete from time_entries where user_id = p_user;
  delete from users where id = p_user;
  delete from auth.users where id = p_user;
end;
$$;

grant execute on function delete_user(uuid) to authenticated;
