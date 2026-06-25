-- Mise à jour du référentiel des secteurs : couleurs, renommage, ajout, retrait.

update poles set couleur = '#74D6E3' where libelle = 'Méthodes';
update poles set couleur = '#59BA69' where libelle = 'Production';
update poles set couleur = '#FEFF00' where libelle = 'Qualité';
update poles set couleur = '#DA72FC' where libelle = 'Sous-traitance';

-- Appro -> Logistique
update poles set libelle = 'Logistique', couleur = '#FFB700' where libelle = 'Appro';

-- Nouveau secteur Décoration
insert into poles (libelle, couleur, icone)
select 'Décoration', '#FF595A', 'palette'
where not exists (select 1 from poles where libelle = 'Décoration');

-- Retrait du secteur Service (et de ses ateliers sans pièce, si aucune référence)
delete from ateliers a
using poles p
where a.pole_id = p.id
  and p.libelle = 'Service'
  and not exists (select 1 from pieces pc where pc.atelier_id = a.id);

delete from poles
where libelle = 'Service'
  and not exists (select 1 from ateliers a where a.pole_id = poles.id)
  and not exists (select 1 from users u where u.pole_id = poles.id);
