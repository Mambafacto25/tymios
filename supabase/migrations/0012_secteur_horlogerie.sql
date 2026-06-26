-- Nouveau secteur Horlogerie.
insert into poles (libelle, couleur, icone)
select 'Horlogerie', '#F700AE', 'watch'
where not exists (select 1 from poles where libelle = 'Horlogerie');
