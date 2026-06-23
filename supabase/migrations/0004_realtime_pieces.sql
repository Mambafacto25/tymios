-- Active la diffusion temps réel (Supabase Realtime) sur la table pieces :
-- les écrans abonnés reçoivent les créations / changements de statut en direct.
-- La sécurité reste assurée par les politiques RLS (0003).
alter publication supabase_realtime add table pieces;
