-- Étape 4 (suite) — transitions de relais qui touchent une pièce dont on n'est
-- PAS encore propriétaire (acceptation / refus par le destinataire).
-- Faites en SECURITY DEFINER : la fonction valide l'identité (auth.uid()),
-- que le relais est bien adressé à l'appelant, écrit l'événement et applique
-- le transfert de façon atomique — sans dépendre des règles d'UPDATE de pieces.

-- Acceptation : vérifie le PIN, journalise, transfère la propriété.
create or replace function accept_relais(p_piece_id bigint, p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_de uuid;
begin
  if not exists (
    select 1 from users
    where id = auth.uid()
      and pin_hash is not null
      and pin_hash = crypt(p_pin, pin_hash)
  ) then
    raise exception 'PIN incorrect';
  end if;

  select proprietaire_courant_id into v_de
  from pieces
  where id = p_piece_id and relais_vers_id = auth.uid();

  if not found then
    raise exception 'Aucun relais en attente pour vous sur cette pièce';
  end if;

  insert into events (piece_id, type, auteur_id, payload)
  values (p_piece_id, 'acceptation', auth.uid(), jsonb_build_object('de', v_de));

  update pieces
  set proprietaire_courant_id = auth.uid(), relais_vers_id = null
  where id = p_piece_id;
end;
$$;

-- Refus : journalise et renvoie la pièce à son propriétaire (annule le transit).
create or replace function refuse_relais(p_piece_id bigint)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1 from pieces where id = p_piece_id and relais_vers_id = auth.uid()
  ) then
    raise exception 'Aucun relais en attente pour vous sur cette pièce';
  end if;

  insert into events (piece_id, type, auteur_id, payload)
  values (p_piece_id, 'refus', auth.uid(), '{}'::jsonb);

  update pieces set relais_vers_id = null where id = p_piece_id;
end;
$$;

grant execute on function accept_relais(bigint, text) to authenticated;
grant execute on function refuse_relais(bigint) to authenticated;
