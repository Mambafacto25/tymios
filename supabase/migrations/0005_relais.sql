-- Étape 4 — le relais.
-- Cache dérivé : destinataire d'un relais EN ATTENTE (la pièce est « en transit »
-- tant que ce champ est rempli). Recalculable depuis le journal events.
alter table pieces add column if not exists relais_vers_id uuid references users (id);

-- PIN sécurisé : jamais stocké en clair (hash bcrypt via pgcrypto).
-- Sur Supabase, pgcrypto vit dans le schéma `extensions` : on l'inclut dans
-- le search_path des fonctions pour résoudre crypt()/gen_salt().
create extension if not exists pgcrypto with schema extensions;

-- Définir / mettre à jour SON propre PIN.
create or replace function set_my_pin(p_pin text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  update users set pin_hash = crypt(p_pin, gen_salt('bf'))
  where id = auth.uid();
$$;

-- Vérifier SON propre PIN (renvoie vrai/faux).
create or replace function verify_my_pin(p_pin text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from users
    where id = auth.uid()
      and pin_hash is not null
      and pin_hash = crypt(p_pin, pin_hash)
  );
$$;

grant execute on function set_my_pin(text) to authenticated;
grant execute on function verify_my_pin(text) to authenticated;
