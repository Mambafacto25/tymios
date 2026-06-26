-- Référentiel des secteurs (pôles). Éditable.
insert into poles (libelle, couleur, icone) values
  ('Méthodes',       '#74D6E3', 'ruler'),
  ('Production',     '#59BA69', 'cog'),
  ('Qualité',        '#FEFF00', 'shield-check'),
  ('Logistique',     '#FFB700', 'truck'),
  ('Sous-traitance', '#DA72FC', 'building'),
  ('Décoration',     '#FF595A', 'palette'),
  ('Horlogerie',     '#F700AE', 'watch')
on conflict (libelle) do nothing;
