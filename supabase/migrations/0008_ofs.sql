-- Étape 7 — import des OF (ordres de fabrication) depuis l'ERP.
-- Relais ne CRÉE pas les OF, il les CONSOMME : on stocke une liste de référence
-- importée (CSV) dans laquelle l'utilisateur pioche à la création d'une pièce.
create table if not exists ofs (
  id                  bigint generated always as identity primary key,
  numero_of           text not null,
  designation_article text,
  numero_serie        text,
  echeance            date,
  created_at          timestamptz not null default now()
);

create index if not exists ofs_numero_of_idx on ofs (numero_of);

alter table ofs enable row level security;

drop policy if exists ofs_select on ofs;
create policy ofs_select on ofs for select to authenticated using (true);

drop policy if exists ofs_insert on ofs;
create policy ofs_insert on ofs for insert to authenticated with check (true);
