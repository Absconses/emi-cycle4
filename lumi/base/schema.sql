-- Lümi · schéma de la base (PostgreSQL, prévu pour Supabase hébergé en Europe)
--
-- À exécuter une seule fois dans l'éditeur SQL du projet Supabase.
-- Principes :
--   1. Un enseignant ne lit et ne modifie que SES classes, SES élèves, SES parcours.
--      La règle est appliquée par la base (sécurité par ligne), pas par le site.
--   2. Les élèves n'ont ni compte ni nom dans la base : un numéro d'ordre et un code.
--      Ils n'accèdent à aucune table ; ils passent par trois fonctions qui exigent
--      le code de la classe ET leur code personnel.
--   3. Un parcours publié est visible de tous les enseignants inscrits, avec le nom
--      de son auteur et de son collège. Rien d'autre ne sort d'un établissement.

-- ---------------------------------------------------------------- outils

-- Code lisible à voix haute : ni 0/O ni 1/I/L.
create or replace function lumi_code(n int) returns text
language sql volatile set search_path = public as $$
  select string_agg(
    substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',
           1 + get_byte(decode(replace(gen_random_uuid()::text, '-', ''), 'hex'),
                        case when i < 6 then i else i + 4 end) % 31, 1), '')
  from generate_series(0, least(n, 12) - 1) as i
$$;

-- ---------------------------------------------------------------- tables

create table etablissements (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (char_length(nom) between 2 and 120),
  ville text not null default '' check (char_length(ville) <= 80),
  invitation text not null unique default lumi_code(8),
  cree_le timestamptz not null default now()
);

create table enseignants (
  id uuid primary key references auth.users (id) on delete cascade,
  etablissement_id uuid not null references etablissements (id) on delete restrict,
  nom text not null check (char_length(nom) between 2 and 80),
  cree_le timestamptz not null default now()
);
create index on enseignants (etablissement_id);

create table parcours (
  id uuid primary key default gen_random_uuid(),
  auteur_id uuid not null references enseignants (id) on delete cascade,
  titre text not null check (char_length(titre) between 3 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  niveau text not null check (niveau in ('5e', '4e', '3e')),
  modules text[] not null check (cardinality(modules) between 1 and 40),
  public boolean not null default false,
  origine_id uuid references parcours (id) on delete set null,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);
create index on parcours (auteur_id);
create index on parcours (public) where public;

create or replace function lumi_dater() returns trigger
language plpgsql set search_path = public as $$
begin new.maj_le := now(); return new; end $$;
create trigger parcours_dater before update on parcours
  for each row execute function lumi_dater();

create table classes (
  id uuid primary key default gen_random_uuid(),
  enseignant_id uuid not null references enseignants (id) on delete cascade,
  nom text not null check (char_length(nom) between 1 and 30),
  niveau text not null check (niveau in ('5e', '4e', '3e')),
  code text not null unique default lumi_code(6),
  -- sans parcours choisi, la classe suit tous les modules de son niveau
  parcours_id uuid references parcours (id) on delete set null,
  cree_le timestamptz not null default now()
);
create index on classes (enseignant_id);

create table eleves (
  id uuid primary key default gen_random_uuid(),
  classe_id uuid not null references classes (id) on delete cascade,
  numero int not null check (numero between 1 and 60),
  code text not null check (code ~ '^[a-z]{3,10}-[a-z]{3,10}-[0-9]{2}$'),
  cree_le timestamptz not null default now(),
  unique (classe_id, code),
  unique (classe_id, numero)
);

create table progression (
  eleve_id uuid not null references eleves (id) on delete cascade,
  module_id text not null check (module_id ~ '^[a-z0-9-]{3,80}$'),
  avance real not null default 0 check (avance between 0 and 1),
  score real not null default 0 check (score between 0 and 1),
  meilleur real not null default 0 check (meilleur between 0 and 1),
  commence_le timestamptz not null default now(),
  vu_le timestamptz not null default now(),
  termine_le timestamptz,
  -- état de reprise du module (là où l'élève s'est arrêté), opaque pour la base
  etat text check (octet_length(etat) <= 300000),
  primary key (eleve_id, module_id)
);

-- Essais de codes ratés, par classe et par heure : freine la recherche d'un code au hasard.
create table tentatives (
  classe_id uuid not null references classes (id) on delete cascade,
  heure timestamptz not null,
  echecs int not null default 0,
  primary key (classe_id, heure)
);

-- ---------------------------------------------------------------- droits

revoke all on etablissements, enseignants, parcours, classes, eleves, progression, tentatives
  from public, anon, authenticated;

grant select on etablissements to authenticated;
grant update (nom, ville) on etablissements to authenticated;
grant select on enseignants to authenticated;
grant update (nom) on enseignants to authenticated;
grant select, insert, delete on parcours to authenticated;
grant update (titre, description, niveau, modules, public) on parcours to authenticated;
grant select, insert, delete on classes to authenticated;
grant update (nom, niveau, parcours_id) on classes to authenticated;
grant select, insert, delete on eleves to authenticated;
grant select, delete on progression to authenticated;
-- « anon » (les élèves) : aucun droit sur les tables.

alter table etablissements enable row level security;
alter table enseignants enable row level security;
alter table parcours enable row level security;
alter table classes enable row level security;
alter table eleves enable row level security;
alter table progression enable row level security;
alter table tentatives enable row level security;

create or replace function mon_etablissement() returns uuid
language sql stable security definer set search_path = public as $$
  select etablissement_id from enseignants where id = auth.uid()
$$;

create policy etab_lire on etablissements for select to authenticated
  using (id = mon_etablissement());
create policy etab_modifier on etablissements for update to authenticated
  using (id = mon_etablissement()) with check (id = mon_etablissement());

create policy ens_lire on enseignants for select to authenticated
  using (etablissement_id = mon_etablissement());
create policy ens_modifier on enseignants for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy parcours_lire on parcours for select to authenticated
  using (auteur_id = auth.uid() or public);
create policy parcours_creer on parcours for insert to authenticated
  with check (auteur_id = auth.uid());
create policy parcours_modifier on parcours for update to authenticated
  using (auteur_id = auth.uid()) with check (auteur_id = auth.uid());
create policy parcours_supprimer on parcours for delete to authenticated
  using (auteur_id = auth.uid());

-- Une classe ne suit qu'un parcours de son enseignant : pour utiliser celui
-- d'un collègue, on le duplique d'abord (il ne changera pas sous les élèves).
create policy classes_lire on classes for select to authenticated
  using (enseignant_id = auth.uid());
create policy classes_creer on classes for insert to authenticated
  with check (enseignant_id = auth.uid() and (parcours_id is null or exists (
    select 1 from parcours p where p.id = parcours_id and p.auteur_id = auth.uid())));
create policy classes_modifier on classes for update to authenticated
  using (enseignant_id = auth.uid())
  with check (enseignant_id = auth.uid() and (parcours_id is null or exists (
    select 1 from parcours p where p.id = parcours_id and p.auteur_id = auth.uid())));
create policy classes_supprimer on classes for delete to authenticated
  using (enseignant_id = auth.uid());

create policy eleves_lire on eleves for select to authenticated
  using (exists (select 1 from classes c where c.id = classe_id and c.enseignant_id = auth.uid()));
create policy eleves_creer on eleves for insert to authenticated
  with check (exists (select 1 from classes c where c.id = classe_id and c.enseignant_id = auth.uid()));
create policy eleves_supprimer on eleves for delete to authenticated
  using (exists (select 1 from classes c where c.id = classe_id and c.enseignant_id = auth.uid()));

create policy progression_lire on progression for select to authenticated
  using (exists (select 1 from eleves e join classes c on c.id = e.classe_id
                 where e.id = eleve_id and c.enseignant_id = auth.uid()));
create policy progression_supprimer on progression for delete to authenticated
  using (exists (select 1 from eleves e join classes c on c.id = e.classe_id
                 where e.id = eleve_id and c.enseignant_id = auth.uid()));

-- ---------------------------------------------------------------- comptes enseignants

-- Premier enseignant d'un collège : crée l'établissement et s'y rattache.
create or replace function creer_compte(p_nom text, p_etablissement text, p_ville text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_etab uuid;
begin
  if auth.uid() is null then raise exception 'non_connecte'; end if;
  if exists (select 1 from enseignants where id = auth.uid()) then raise exception 'deja_inscrit'; end if;
  insert into etablissements (nom, ville) values (btrim(p_etablissement), btrim(coalesce(p_ville, '')))
    returning id into v_etab;
  insert into enseignants (id, etablissement_id, nom) values (auth.uid(), v_etab, btrim(p_nom));
  return v_etab;
end $$;

-- Collègue du même collège : se rattache avec le code d'invitation de l'établissement.
create or replace function rejoindre_etablissement(p_nom text, p_invitation text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_etab uuid;
begin
  if auth.uid() is null then raise exception 'non_connecte'; end if;
  if exists (select 1 from enseignants where id = auth.uid()) then raise exception 'deja_inscrit'; end if;
  select id into v_etab from etablissements where invitation = upper(btrim(p_invitation));
  if v_etab is null then raise exception 'invitation_inconnue'; end if;
  insert into enseignants (id, etablissement_id, nom) values (auth.uid(), v_etab, btrim(p_nom));
  return v_etab;
end $$;

-- ---------------------------------------------------------------- parcours partagés

-- La bibliothèque : les parcours publiés par les autres enseignants, avec auteur et collège.
create or replace function parcours_publics()
returns table (id uuid, titre text, description text, niveau text, modules text[],
               maj_le timestamptz, auteur text, etablissement text, ville text, reprises bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.titre, p.description, p.niveau, p.modules, p.maj_le,
         e.nom, t.nom, t.ville,
         (select count(*) from parcours d where d.origine_id = p.id)
  from parcours p
  join enseignants e on e.id = p.auteur_id
  join etablissements t on t.id = e.etablissement_id
  where p.public and p.auteur_id <> auth.uid() and auth.uid() is not null
  order by p.maj_le desc
$$;

-- Dupliquer un parcours publié (ou l'un des siens) : la copie appartient à l'enseignant.
create or replace function dupliquer_parcours(p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not exists (select 1 from enseignants where id = auth.uid()) then raise exception 'non_inscrit'; end if;
  insert into parcours (auteur_id, titre, description, niveau, modules, public, origine_id)
    select auth.uid(), p.titre, p.description, p.niveau, p.modules, false, p.id
    from parcours p where p.id = p_id and (p.public or p.auteur_id = auth.uid())
    returning id into v_id;
  if v_id is null then raise exception 'parcours_introuvable'; end if;
  return v_id;
end $$;

-- ---------------------------------------------------------------- élèves (sans compte)

-- Retrouve l'élève à partir des deux codes. Renvoie null si l'un des deux est faux,
-- et compte l'échec (au-delà de 200 échecs par heure sur une classe, tout est refusé).
create or replace function lumi_eleve(p_classe text, p_code text, out v_eleve uuid, out v_classe uuid, out v_erreur text)
language plpgsql security definer set search_path = public as $$
declare v_heure timestamptz := date_trunc('hour', now());
begin
  select id into v_classe from classes where code = upper(btrim(coalesce(p_classe, '')));
  if v_classe is null then v_erreur := 'code_inconnu'; return; end if;
  if coalesce((select echecs from tentatives where classe_id = v_classe and heure = v_heure), 0) >= 200 then
    v_classe := null; v_erreur := 'trop_de_tentatives'; return;
  end if;
  select id into v_eleve from eleves
    where classe_id = v_classe and code = lower(btrim(coalesce(p_code, '')));
  if v_eleve is null then
    insert into tentatives (classe_id, heure, echecs) values (v_classe, v_heure, 1)
      on conflict (classe_id, heure) do update set echecs = tentatives.echecs + 1;
    delete from tentatives where heure < now() - interval '2 days';
    v_classe := null; v_erreur := 'code_inconnu';
  end if;
end $$;

-- Ouvre la séance de l'élève : sa classe, son parcours, où il en est.
create or replace function eleve_ouvrir(p_classe text, p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select * into r from lumi_eleve(p_classe, p_code);
  if r.v_eleve is null then return jsonb_build_object('erreur', r.v_erreur); end if;
  return (
    select jsonb_build_object(
      'numero', e.numero,
      'classe', jsonb_build_object('nom', c.nom, 'niveau', c.niveau),
      'parcours', (select jsonb_build_object('titre', p.titre, 'description', p.description, 'modules', to_jsonb(p.modules))
                   from parcours p where p.id = c.parcours_id),
      'progression', coalesce((select jsonb_object_agg(g.module_id, jsonb_build_object(
                        'avance', g.avance, 'score', g.score, 'meilleur', g.meilleur,
                        'termine', g.termine_le is not null, 'vu', g.vu_le))
                      from progression g where g.eleve_id = e.id), '{}'::jsonb))
    from eleves e join classes c on c.id = e.classe_id where e.id = r.v_eleve);
end $$;

-- L'état de reprise d'un module (peut être volumineux : demandé seulement à l'ouverture du module).
create or replace function eleve_module(p_classe text, p_code text, p_module text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select * into r from lumi_eleve(p_classe, p_code);
  if r.v_eleve is null then return jsonb_build_object('erreur', r.v_erreur); end if;
  return coalesce((
    select jsonb_build_object('avance', g.avance, 'score', g.score, 'meilleur', g.meilleur,
                              'termine', g.termine_le is not null, 'etat', g.etat)
    from progression g where g.eleve_id = r.v_eleve and g.module_id = p_module), '{}'::jsonb);
end $$;

-- Enregistre l'avancée. Le meilleur score ne baisse jamais ; « terminé » ne se défait pas.
create or replace function eleve_enregistrer(p_classe text, p_code text, p_module text,
  p_avance real, p_score real, p_termine boolean, p_etat text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r record; v_avance real := least(1, greatest(0, coalesce(p_avance, 0)));
        v_score real := least(1, greatest(0, coalesce(p_score, 0)));
begin
  select * into r from lumi_eleve(p_classe, p_code);
  if r.v_eleve is null then return jsonb_build_object('erreur', r.v_erreur); end if;
  if p_module !~ '^[a-z0-9-]{3,80}$' or octet_length(coalesce(p_etat, '')) > 300000 then
    return jsonb_build_object('erreur', 'donnees_refusees');
  end if;
  insert into progression (eleve_id, module_id, avance, score, meilleur, termine_le, etat)
    values (r.v_eleve, p_module, v_avance, v_score, v_score, case when p_termine then now() end, p_etat)
  on conflict (eleve_id, module_id) do update set
    avance = greatest(progression.avance, excluded.avance),
    score = excluded.score,
    meilleur = greatest(progression.meilleur, excluded.meilleur),
    termine_le = coalesce(progression.termine_le, excluded.termine_le),
    etat = coalesce(excluded.etat, progression.etat),
    vu_le = now();
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- qui peut appeler quoi

revoke all on function lumi_code(int), mon_etablissement(), lumi_eleve(text, text),
  creer_compte(text, text, text), rejoindre_etablissement(text, text),
  parcours_publics(), dupliquer_parcours(uuid),
  eleve_ouvrir(text, text), eleve_module(text, text, text),
  eleve_enregistrer(text, text, text, real, real, boolean, text), lumi_dater()
  from public, anon, authenticated;

grant execute on function mon_etablissement(), creer_compte(text, text, text),
  rejoindre_etablissement(text, text), parcours_publics(), dupliquer_parcours(uuid) to authenticated;
grant execute on function lumi_code(int) to authenticated;
grant execute on function eleve_ouvrir(text, text), eleve_module(text, text, text),
  eleve_enregistrer(text, text, text, real, real, boolean, text) to anon, authenticated;
