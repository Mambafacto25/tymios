-- Diffusion temps réel des pointages : un temps saisi sur un poste se reflète
-- en direct sur les autres écrans (cumul de temps, règle de relais).
alter publication supabase_realtime add table time_entries;
