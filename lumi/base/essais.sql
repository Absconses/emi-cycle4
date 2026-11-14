-- Lümi · essais du schéma sur un PostgreSQL local (hors Supabase).
-- Usage : psql -v ON_ERROR_STOP=1 -d lumi_essai -f essais.sql   (depuis lumi/base/)
-- Les premières lignes imitent ce que Supabase fournit : rôles anon / authenticated, auth.users, auth.uid().
\set QUIET 1
\o /dev/null
drop role if exists anon;
drop role if exists authenticated;
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
-- comme Supabase : tout est accordé par défaut aux deux rôles, le schéma doit donc retirer lui-même
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;

\i schema.sql

create function attendu(p_nom text, p_vrai boolean) returns void language plpgsql as $$
begin
  if p_vrai is not true then raise exception 'ÉCHEC : %', p_nom; end if;
  raise notice 'ok : %', p_nom;
end $$;
grant execute on function attendu(text, boolean) to anon, authenticated;
create function refuse(p_nom text, p_sql text) returns void language plpgsql as $$
begin
  begin execute p_sql; exception when others then raise notice 'ok : % (refusé : %)', p_nom, sqlerrm; return; end;
  raise exception 'ÉCHEC : % aurait dû être refusé', p_nom;
end $$;
grant execute on function refuse(text, text) to anon, authenticated;

insert into auth.users values ('a0000000-0000-0000-0000-000000000001'), ('b0000000-0000-0000-0000-000000000002'), ('c0000000-0000-0000-0000-000000000003');

-- ===== Enseignante A : crée son collège, un parcours, une classe, trois élèves
set role authenticated;
set request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
select creer_compte('Prof A', 'Collège A', 'Ville A') is not null as compte_a \gset
insert into parcours (id, auteur_id, titre, niveau, modules, public) values
  ('aaaaaaaa-0000-0000-0000-000000000001', auth.uid(), 'Parcours privé de A', '5e', '{5e-un,5e-deux}', false),
  ('aaaaaaaa-0000-0000-0000-000000000002', auth.uid(), 'Parcours publié de A', '5e', '{5e-un}', true);
insert into classes (id, enseignant_id, nom, niveau, parcours_id) values
  ('aaaaaaaa-1111-0000-0000-000000000001', auth.uid(), '5e A', '5e', 'aaaaaaaa-0000-0000-0000-000000000001');
insert into eleves (classe_id, numero, code) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 1, 'renard-lune-47'),
  ('aaaaaaaa-1111-0000-0000-000000000001', 2, 'hibou-riviere-12'),
  ('aaaaaaaa-1111-0000-0000-000000000001', 3, 'tilleul-nuage-80');
select code as code_a from classes \gset
select invitation as invit_a from etablissements \gset
select attendu('le code de classe a 6 caractères lisibles', :'code_a' ~ '^[A-HJ-NP-Z2-9]{6}$');
select refuse('un second compte pour le même enseignant', $$select creer_compte('x','y','z')$$);
select refuse('un code élève mal formé', $$insert into eleves (classe_id, numero, code) values ('aaaaaaaa-1111-0000-0000-000000000001', 4, 'Nom Prénom')$$);
select refuse('changer d''établissement à la main', $$update enseignants set etablissement_id = gen_random_uuid()$$);
select refuse('écrire une progression à la place d''un élève', $$insert into progression (eleve_id, module_id) select id, '5e-un' from eleves limit 1$$);

-- ===== Élève (aucun compte) : ouvre, enregistre, reprend
reset role; set role anon; reset request.jwt.claim.sub;
select refuse('un élève lit la table des élèves', $$select * from eleves$$);
select refuse('un élève lit la table des classes', $$select * from classes$$);
select refuse('un élève lit la progression', $$select * from progression$$);
select refuse('un élève appelle la bibliothèque', $$select * from parcours_publics()$$);
select attendu('mauvais code personnel refusé', eleve_ouvrir(:'code_a', 'renard-lune-48') = '{"erreur":"code_inconnu"}');
select attendu('mauvais code de classe refusé', eleve_ouvrir('ZZZZZZ', 'renard-lune-47') = '{"erreur":"code_inconnu"}');
select attendu('ouverture : classe et parcours', (eleve_ouvrir(lower(:'code_a') || ' ', ' Renard-Lune-47'))->'parcours'->>'titre' = 'Parcours privé de A');
select attendu('enregistrement', eleve_enregistrer(:'code_a', 'renard-lune-47', '5e-un', 0.5, 0.8, false, '{"p":1}') = '{"ok":true}');
select attendu('second enregistrement, score plus bas', eleve_enregistrer(:'code_a', 'renard-lune-47', '5e-un', 1, 0.6, true, null) = '{"ok":true}');
select attendu('le meilleur score est gardé', ((eleve_module(:'code_a', 'renard-lune-47', '5e-un'))->>'meilleur')::real = 0.8::real);
select attendu('terminé, et l''état de reprise est gardé', (eleve_module(:'code_a', 'renard-lune-47', '5e-un'))->>'etat' = '{"p":1}' and ((eleve_module(:'code_a', 'renard-lune-47', '5e-un'))->>'termine')::boolean);
select attendu('valeurs hors bornes ramenées entre 0 et 1', eleve_enregistrer(:'code_a', 'hibou-riviere-12', '5e-deux', 7, -3, false, null) = '{"ok":true}');
select attendu('identifiant de module farfelu refusé', eleve_enregistrer(:'code_a', 'hibou-riviere-12', '../x', 0, 0, false, null) = '{"erreur":"donnees_refusees"}');
select attendu('un élève ne voit que sa progression', (select count(*) from jsonb_object_keys((eleve_ouvrir(:'code_a', 'hibou-riviere-12'))->'progression')) = 1);

-- ===== Enseignant B, autre collège : ne voit rien de A, sauf le parcours publié
reset role; set role authenticated;
set request.jwt.claim.sub = 'b0000000-0000-0000-0000-000000000002';
select creer_compte('Prof B', 'Collège B', 'Ville B') is not null as compte_b \gset
select attendu('B ne voit aucune classe de A', (select count(*) from classes) = 0);
select attendu('B ne voit aucun élève de A', (select count(*) from eleves) = 0);
select attendu('B ne voit aucune progression de A', (select count(*) from progression) = 0);
select attendu('B ne voit que son établissement', (select count(*) from etablissements) = 1 and (select nom from etablissements) = 'Collège B');
select attendu('B ne voit pas les enseignants de A', (select count(*) from enseignants) = 1);
select attendu('B voit le parcours publié de A, pas le privé', (select count(*) from parcours) = 1 and (select titre from parcours) = 'Parcours publié de A');
select attendu('bibliothèque : auteur et collège affichés', (select auteur || ' / ' || etablissement from parcours_publics()) = 'Prof A / Collège A');
select refuse('B modifie le parcours de A', $q$do $x$ begin update parcours set titre = 'piraté' where id = 'aaaaaaaa-0000-0000-0000-000000000002'; if not found then raise exception 'aucune ligne touchée'; end if; end $x$$q$);
select refuse('B ajoute un élève dans la classe de A', $$insert into eleves (classe_id, numero, code) values ('aaaaaaaa-1111-0000-0000-000000000001', 9, 'pirate-pirate-00')$$);
select refuse('B crée une classe au nom de A', $$insert into classes (enseignant_id, nom, niveau) values ('a0000000-0000-0000-0000-000000000001', 'x', '5e')$$);
select refuse('B attache sa classe au parcours de A sans le dupliquer', $$insert into classes (enseignant_id, nom, niveau, parcours_id) values (auth.uid(), '5e B', '5e', 'aaaaaaaa-0000-0000-0000-000000000002')$$);
select refuse('B duplique le parcours privé de A', $$select dupliquer_parcours('aaaaaaaa-0000-0000-0000-000000000001')$$);
select dupliquer_parcours('aaaaaaaa-0000-0000-0000-000000000002') as copie_b \gset
select attendu('la copie appartient à B et reste privée', (select auteur_id = auth.uid() and not public from parcours where id = :'copie_b'));
insert into classes (enseignant_id, nom, niveau, parcours_id) values (auth.uid(), '5e B', '5e', :'copie_b');
select attendu('B attache sa classe à sa copie', (select count(*) from classes) = 1);
delete from eleves; delete from progression; -- B tente de tout supprimer : vérifié plus bas, côté A

-- ===== Collègue C : rejoint le collège A par invitation, ne voit pas pour autant les classes de A
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000003';
select refuse('invitation fausse', $$select rejoindre_etablissement('Prof C', 'AAAAAAAA')$$);
select rejoindre_etablissement('Prof C', lower(:'invit_a')) is not null as compte_c \gset
select attendu('C voit son collège et sa collègue', (select nom from etablissements) = 'Collège A' and (select count(*) from enseignants) = 2);
select attendu('C ne voit pas les classes de A', (select count(*) from classes) = 0);

-- ===== A retrouve tout ; le compteur de reprises ; la suppression en cascade
set request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
select attendu('A voit toujours ses 3 élèves et 2 lignes de progression (B n''a rien pu supprimer)', (select count(*) from eleves) = 3 and (select count(*) from progression) = 2);
select attendu('A ne voit pas la copie privée de B', (select count(*) from parcours) = 2);
update parcours set titre = 'Parcours publié de A (v2)' where id = 'aaaaaaaa-0000-0000-0000-000000000002';
select attendu('la date de mise à jour suit', (select maj_le >= cree_le from parcours where id = 'aaaaaaaa-0000-0000-0000-000000000002'));

-- ===== Frein aux essais de codes
reset role; set role anon; reset request.jwt.claim.sub;
select count(*) as essais from generate_series(1, 199) g, lateral eleve_ouvrir(:'code_a', 'faux-faux-' || lpad((g % 100)::text, 2, '0')) \gset
select attendu('après 200 échecs dans l''heure, même le bon code est refusé', eleve_ouvrir(:'code_a', 'renard-lune-47') = '{"erreur":"trop_de_tentatives"}');
reset role;
select attendu('les échecs sont comptés par classe', (select echecs from tentatives) = 200);
delete from tentatives;
set role anon;
select attendu('une fois le compteur remis à zéro, le bon code repasse', (eleve_ouvrir(:'code_a', 'renard-lune-47'))->>'numero' = '1');

-- ===== Fin d'année : A supprime sa classe, tout part avec elle
reset role; set role authenticated;
set request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
delete from classes;
reset role;
select attendu('élèves et progression de A supprimés avec la classe', (select count(*) from eleves) = 0 and (select count(*) from progression) = 0);
select attendu('la classe de B est intacte', (select count(*) from classes) = 1);
delete from auth.users where id = 'b0000000-0000-0000-0000-000000000002';
select attendu('compte B supprimé : sa classe et sa copie partent, le parcours de A reste', (select count(*) from classes) = 0 and (select count(*) from parcours) = 2);
\o
\echo TOUS LES ESSAIS SONT PASSÉS
