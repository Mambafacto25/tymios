-- Lot 1 — Pilotage & coûts.
-- Ajoute un taux horaire par secteur (pour le coût de revient = temps × taux)
-- et une date de fin réelle par pièce (pour mesurer les délais réels vs prévus).

-- 1) Taux horaire (€/h) par secteur. 0 = non renseigné.
alter table poles add column if not exists taux_horaire numeric not null default 0;

-- 2) Date de fin réelle d'une pièce (renseignée au passage en « terminee »).
alter table pieces add column if not exists terminee_at timestamptz;

-- 3) Mise à jour du taux horaire d'un secteur (réservé au chef d'atelier).
create or replace function set_taux_horaire(p_pole bigint, p_taux numeric)
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
  if p_taux is null or p_taux < 0 then
    raise exception 'Taux horaire invalide.';
  end if;
  update poles set taux_horaire = p_taux where id = p_pole;
end;
$$;

grant execute on function set_taux_horaire(bigint, numeric) to authenticated;
