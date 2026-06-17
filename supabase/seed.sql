-- Référentiel fixe des pôles (secteurs) au départ — éditable plus tard.
insert into poles (libelle, couleur, icone) values
  ('Méthodes',       '#6366f1', 'ruler'),
  ('Production',     '#10b981', 'cog'),
  ('Qualité',        '#f59e0b', 'shield-check'),
  ('Appro',          '#3b82f6', 'truck'),
  ('Service',        '#ec4899', 'wrench'),
  ('Sous-traitance', '#8b5cf6', 'building')
on conflict (libelle) do nothing;
