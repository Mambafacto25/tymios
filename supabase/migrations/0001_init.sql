-- Relais — schéma initial v1 (étape 1 du plan)
-- 6 entités : users, poles, ateliers, pieces, events (le journal), time_entries (dérivé).
-- Le verrouillage « insertion seule » de events est dans 0002_events_immutable_rls.sql.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type piece_statut as enum ('a_faire', 'en_cours', 'bloquee', 'terminee');

create type event_type as enum (
  'creation',
  'envoi_relais',
  'acceptation',
  'refus',
  'annulation_envoi',
  'changement_statut',
  'pointage',
  'pointage_manuel',
  'correction_temps',
  'mise_sous_traitance',
  'retour_sous_traitance'
);

-- ---------------------------------------------------------------------------
-- poles (secteurs) — référentiel
-- ---------------------------------------------------------------------------
create table poles (
  id          bigint generated always as identity primary key,
  libelle     text not null unique,
  couleur     text,
  icone       text
);

-- ---------------------------------------------------------------------------
-- users (établis / personnes) — lié à auth.users de Supabase
-- ---------------------------------------------------------------------------
create table users (
  id          uuid primary key references auth.users (id) on delete cascade,
  nom         text not null,
  prenom      text not null,
  email       text not null unique,
  role        text,
  pole_id     bigint references poles (id),
  -- Le PIN n'est jamais stocké en clair : hash applicatif (bcrypt/argon2).
  pin_hash    text,
  actif       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ateliers
-- ---------------------------------------------------------------------------
create table ateliers (
  id          bigint generated always as identity primary key,
  nom         text not null,
  pole_id     bigint not null references poles (id)
);

-- ---------------------------------------------------------------------------
-- pieces (objet central — une opération sur une pièce / un OF)
-- Les colonnes "courant" sont des CACHES dérivés des events (perf).
-- ---------------------------------------------------------------------------
create table pieces (
  id                      bigint generated always as identity primary key,
  numero_serie            text,
  numero_of               text,
  designation_article     text,
  titre_operation         text not null,
  atelier_id              bigint references ateliers (id),
  priorite                smallint not null default 0,
  echeance                date,
  -- Caches dérivés (recalculés depuis events) :
  statut_courant          piece_statut not null default 'a_faire',
  proprietaire_courant_id uuid references users (id),
  sous_traitant           text,
  retour_prevu_le         date,
  created_at              timestamptz not null default now()
);

create index pieces_numero_of_idx on pieces (numero_of);
create index pieces_numero_serie_idx on pieces (numero_serie);
create index pieces_proprietaire_idx on pieces (proprietaire_courant_id);

-- ---------------------------------------------------------------------------
-- events (LE journal — le cœur). Insertion seule (cf. 0002).
-- ---------------------------------------------------------------------------
create table events (
  id         bigint generated always as identity primary key,
  piece_id   bigint not null references pieces (id),
  type       event_type not null,
  auteur_id  uuid not null references users (id),
  created_at timestamptz not null default now(),
  payload    jsonb not null default '{}'::jsonb
);

create index events_piece_id_idx on events (piece_id, created_at);
create index events_auteur_idx on events (auteur_id);

-- ---------------------------------------------------------------------------
-- time_entries — DÉRIVÉ des events de pointage (cohérent avec « registre sacré »).
-- Présent comme cache/projection requêtable ; reconstructible à 100 %.
-- ---------------------------------------------------------------------------
create table time_entries (
  id          bigint generated always as identity primary key,
  piece_id    bigint not null references pieces (id),
  user_id     uuid not null references users (id),
  -- event source qui a produit cette projection (traçabilité) :
  source_event_id bigint references events (id),
  duree_sec   integer not null,
  debut       timestamptz,
  fin         timestamptz,
  created_at  timestamptz not null default now()
);

create index time_entries_piece_idx on time_entries (piece_id);
