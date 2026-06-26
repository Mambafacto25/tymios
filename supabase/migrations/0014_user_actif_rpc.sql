-- Désactiver / réactiver un compte (réservé au chef d'atelier).
-- On ne supprime jamais la ligne (registre sacré) : on bascule `actif`.
create or replace function set_user_actif(p_user uuid, p_actif boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from users
    where id = auth.uid()
      and role ~* 'chef|atelier|responsable|admin'
  ) then
    raise exception 'Action réservée au chef d''atelier.';
  end if;
  update users set actif = p_actif where id = p_user;
end;
$$;

grant execute on function set_user_actif(uuid, boolean) to authenticated;
