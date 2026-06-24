-- Permet à chacun de modifier SA propre fiche (nom/prénom dans les paramètres).
drop policy if exists users_update_self on users;
create policy users_update_self
  on users for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
