-- Jeu de données de DÉMO pour l'étape 2 (lecture des pièces).
-- Idempotent : peut être relancé sans créer de doublons.
-- Adapter l'email ci-dessous si le compte connecté est différent.

-- 1. Fiche utilisateur liée au compte Auth connecté
insert into users (id, nom, prenom, email, role, pole_id, actif)
select u.id, 'Serugue', 'Thibaud', u.email, 'Horloger',
       (select id from poles where libelle = 'Qualité'), true
from auth.users u
where u.email = 'thibaudserugue@gmail.com'
on conflict (id) do nothing;

-- 2. Un atelier rattaché au secteur (pôle) Méthodes
insert into ateliers (nom, pole_id)
select 'Établi A', (select id from poles where libelle = 'Méthodes')
where not exists (select 1 from ateliers where nom = 'Établi A');

-- 2 bis. Un atelier par défaut pour CHAQUE secteur (permet de créer une pièce
-- dans n'importe quel secteur depuis le formulaire).
insert into ateliers (nom, pole_id)
select 'Atelier ' || p.libelle, p.id
from poles p
where not exists (select 1 from ateliers a where a.pole_id = p.id);

-- 3. Quelques pièces de démo (statuts / priorités / échéances variés)
insert into pieces (
  numero_serie, numero_of, designation_article, titre_operation,
  atelier_id, priorite, echeance, statut_courant, proprietaire_courant_id
)
select v.numero_serie, v.numero_of, v.designation_article, v.titre_operation,
       (select id from ateliers where nom = 'Établi A' limit 1),
       v.priorite, v.echeance, v.statut_courant::piece_statut,
       (select id from users where email = 'thibaudserugue@gmail.com')
from (values
  ('SN-1001', 'OF-2048', 'Boîtier acier 40 mm',  'Contrôle entrée',     1, current_date + 2, 'a_faire'),
  ('SN-1002', 'OF-2048', 'Cadran émail blanc',   'Pose index',          0, current_date + 5, 'en_cours'),
  ('SN-1003', 'OF-2049', 'Mouvement automatique','Réglage marche',      1, current_date - 1, 'bloquee'),
  ('SN-1004', 'OF-2050', 'Bracelet cuir alligator','Contrôle final',    0, current_date + 9, 'a_faire'),
  ('SN-1005', 'OF-2049', 'Lunette or rose',      'Polissage',           0, current_date + 1, 'terminee')
) as v(numero_serie, numero_of, designation_article, titre_operation, priorite, echeance, statut_courant)
where not exists (
  select 1 from pieces p
  where p.numero_serie = v.numero_serie and p.titre_operation = v.titre_operation
);
