/* Dupanloup Média : le code commun à toutes les pages.
 * Les productions sont décrites dans trois fichiers :
 *   emissions.json (ici), ../club/podcasts.json (partagé avec la radio du club), gazette.json (ici).
 * Le son et la vidéo restent sur PodEduc (apps.education.fr) : seuls ces lecteurs sont intégrés. */
window.MEDIA = (function () {
  const CLUB_DIR = '../club/';
  const CHAINES = {
    emission: { n: 1, nom: 'Émissions', page: 'emissions.html', fichier: 'emissions.json', verbe: 'Regarder', dernier: 'Dernière émission',
      slogan: 'Les émissions et les reportages filmés par les élèves.', vide: 'La première émission est en tournage.' },
    podcast: { n: 2, nom: 'Radio', page: 'radio.html', fichier: CLUB_DIR + 'podcasts.json', verbe: 'Écouter', dernier: 'Dernier podcast',
      slogan: 'Chroniques, interviews et reportages sonores, au micro du CDI.', vide: 'Le premier podcast est en préparation.' },
    gazette: { n: 3, nom: 'Gazette', page: 'gazette.html', fichier: 'gazette.json', verbe: 'Lire', dernier: 'Dernier numéro',
      slogan: 'La Gazette de Dupanloup, le journal écrit par les reporters du club.', vide: 'Le premier numéro arrive.' },
  };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const img = s => !s ? '' : (/^(https:\/\/|\.\.\/|gazette\/)/.test(s) ? s : CLUB_DIR + s);
  const dateFr = d => {
    if (!d) return '';
    const court = /^\d{4}-\d{2}$/.test(d), x = new Date((court ? d + '-01' : d) + 'T12:00:00');
    return isNaN(x) ? '' : x.toLocaleDateString('fr-FR', court ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const infos = e => [dateFr(e.date), e.duree, e.rubrique].filter(Boolean).map(esc).join(', ');
  const lien = e => CHAINES[e.type].page + '?e=' + encodeURIComponent(e.id);

  // Seuls les lecteurs PodEduc sont intégrés : la voix et l'image des élèves restent chez le ministère.
  function podeduc(url) {
    let u;
    try { u = new URL(url); } catch (e) { return ''; }
    if (u.protocol !== 'https:' || !/(^|\.)apps\.education\.fr$/.test(u.hostname)) return '';
    u.searchParams.set('is_iframe', 'true');
    return u.href;
  }
  // Un numéro de la gazette : un PDF rangé dans le dossier gazette/ du site, ou un lien https.
  const pdfLocal = s => /^gazette\/[\w.-]+\.pdf$/i.test(s || '') ? s : '';
  const pdfLien = s => /^https:\/\//.test(s || '') ? s : '';
  const enLigne = e => e.type === 'gazette' ? !!(pdfLocal(e.pdf) || pdfLien(e.pdf)) : !!podeduc(e.podeduc);

  async function charger(type) {
    try {
      const r = await fetch(CHAINES[type].fichier, { cache: 'no-cache' });
      const liste = await r.json();
      return liste.filter(e => e && e.id && e.titre).map(e => Object.assign({}, e, { type }))
        .sort((a, b) => String(b.date).localeCompare(String(a.date)) || (b.numero || 0) - (a.numero || 0));
    } catch (e) { return null; }
  }
  const drapeau = e => e.exemple ? '<span class="drapeau">Exemple</span>' : (enLigne(e) ? '' : '<span class="drapeau">Bientôt</span>');

  function carte(e) {
    const vignette = e.type === 'gazette'
      ? `<div class="une-gazette"><b>La Gazette</b><span>n° ${esc(e.numero || '')}, ${esc(dateFr(e.date))}</span>${e.image ? `<img src="${esc(img(e.image))}" alt="" loading="lazy" style="object-fit:cover">` : ''}</div>`
      : `${e.image ? `<img src="${esc(img(e.image))}" alt="" loading="lazy">` : ''}${e.numero ? `<span class="numero">n° ${esc(e.numero)}</span>` : ''}`;
    return `<article class="carte-m c-${e.type}">
      <div class="vignette">${vignette}${drapeau(e)}</div>
      <h3><a href="${lien(e)}">${esc(e.titre)}</a></h3>
      <p class="infos">${infos(e)}</p>
      ${e.chapo ? `<p class="chapo">${esc(e.chapo)}</p>` : ''}</article>`;
  }
  const classeGrille = t => t === 'podcast' ? 'grille pochettes' : t === 'gazette' ? 'grille pages' : 'grille';

  /* ---------- la barre et le pied, communs à toutes les pages ---------- */
  function habiller(page) {
    const nav = [['emission', 'emissions.html', 'Émissions'], ['podcast', 'radio.html', 'Radio'], ['gazette', 'gazette.html', 'Gazette'], ['formation', 'formation.html', 'Se former']];
    document.body.insertAdjacentHTML('afterbegin', `<header class="barre-media"><div class="int">
      <a class="marque" href="index.html"><img src="${CLUB_DIR}img/sigle-dupanloup.png" alt="" width="40" height="40"><span><b>Dupanloup Média</b><small>Le média des élèves, fabriqué au CDI</small></span></a>
      <nav class="chaines-nav" aria-label="Les chaînes">${nav.map(([c, h, t]) => `<a class="c-${c}" href="${h}"${page === c ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
    </div><div class="mire" aria-hidden="true"><i></i><i></i><i></i><i></i></div></header>`);
    document.body.insertAdjacentHTML('beforeend', `<footer class="pied-media"><div class="int">
      <div><b>Dupanloup Média</b><p>Les émissions, les podcasts et la gazette des élèves du collège Dupanloup, à Boulogne. Tout est préparé, enregistré et monté au CDI.</p><p>Aucun compte, aucune publicité. Les sons et les vidéos sont hébergés par l’Éducation nationale.</p></div>
      <div><b>Les chaînes</b><ul><li><a href="emissions.html">Émissions</a></li><li><a href="radio.html">Radio</a></li><li><a href="gazette.html">Gazette</a></li><li><a href="formation.html">Se former au reportage</a></li></ul></div>
      <div><b>La rédaction</b><ul><li><a href="${CLUB_DIR}redaction.html">Salle de rédaction</a></li><li><a href="${CLUB_DIR}banc/">Banc de montage</a></li><li><a href="publier.html">Publier une production</a></li><li><a href="${CLUB_DIR}enseignant.html">Espace enseignant</a></li></ul></div>
    </div></footer>`);
  }

  /* ---------- l'accueil ---------- */
  async function accueil(zone) {
    const [em, po, ga] = await Promise.all(['emission', 'podcast', 'gazette'].map(charger));
    const tout = { emission: em || [], podcast: po || [], gazette: ga || [] };
    const tous = [...tout.emission, ...tout.podcast, ...tout.gazette].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const une = tous.find(e => enLigne(e) && !e.exemple) || tout.emission[0] || tous[0];
    let h = '';
    if (une) {
      const C = CHAINES[une.type];
      h += `<section class="antenne int c-${une.type}">
        <div><span class="pastille-c">${C.dernier}</span>
          <h1>${esc(une.titre)}</h1>
          <p class="chapo">${esc(une.chapo)}</p><p class="infos">${infos(une)}</p>
          <div class="actions-m"><a class="btn-m" href="${lien(une)}">${enLigne(une) ? C.verbe : 'Découvrir'}</a><a class="btn-m creux" href="${C.page}">Toute la chaîne ${C.nom}</a></div></div>
        <a class="ecran" href="${lien(une)}" tabindex="-1" aria-hidden="true">${une.image ? `<img src="${esc(img(une.image))}" alt="">` : ''}${drapeau(une)}<span class="jouer">▶</span></a>
      </section>`;
    } else {
      h += `<section class="antenne int"><div><h1>Dupanloup Média</h1><p class="chapo">Les émissions, les podcasts et la gazette des élèves arrivent ici.</p></div></section>`;
    }
    const compte = (n, un, des) => n ? `${n} ${n > 1 ? des : un}` : 'Bientôt';
    h += `<nav class="chaines int" aria-label="Choisir une chaîne">
      <a class="chaine c-emission" href="emissions.html"><span class="canal" aria-hidden="true">1</span><span class="combien">${compte(tout.emission.length, 'émission', 'émissions')}</span><h2>Émissions</h2><p>${CHAINES.emission.slogan}</p></a>
      <a class="chaine c-podcast" href="radio.html"><span class="canal" aria-hidden="true">2</span><span class="combien">${compte(tout.podcast.length, 'podcast', 'podcasts')}</span><h2>Radio</h2><p>${CHAINES.podcast.slogan}</p></a>
      <a class="chaine c-gazette" href="gazette.html"><span class="canal" aria-hidden="true">3</span><span class="combien">${compte(tout.gazette.length, 'numéro', 'numéros')}</span><h2>Gazette</h2><p>${CHAINES.gazette.slogan}</p></a>
    </nav>`;
    for (const t of ['emission', 'podcast', 'gazette']) {
      const C = CHAINES[t], liste = tout[t].filter(e => e !== une).slice(0, t === 'emission' ? 3 : 4);
      if (!liste.length) continue;
      h += `<section class="rayon int c-${t}"><div class="rayon-tete"><h2>${C.nom}</h2><a href="${C.page}">Tout voir</a></div><div class="${classeGrille(t)}">${liste.map(carte).join('')}</div></section>`;
    }
    // la bande « Se former » : la carte de presse de l'élève, lue dans son navigateur
    let faits = 0, total = 3, nums = [1, 2, 3];
    try {
      const mods = await (await fetch(CLUB_DIR + 'modules.json')).json(), prog = window.CLUB ? CLUB.lire() : {};
      const tronc = mods.filter(m => m.type === 'livre' && m.partie === 'A');
      total = tronc.length; nums = tronc.map(m => ({ n: m.num, ok: !!(prog[m.id] && prog[m.id].termine) })); faits = nums.filter(x => x.ok).length;
    } catch (e) { nums = nums.map(n => ({ n, ok: false })); }
    h += `<div class="int"><section class="bande-former"><div><h2>Toi aussi, passe à l’antenne</h2>
        <p>Dix modules pour apprendre le métier : trouver une info, écrire, interviewer, enregistrer, filmer, monter. Les trois premiers te donnent ta carte de presse.</p>
        <a class="btn-m" href="formation.html">${faits ? 'Reprendre ma formation' : 'Commencer la formation'}</a></div>
      <div class="tampons" aria-label="Ma carte de presse">${nums.map(x => `<span class="${x.ok ? 'fait' : ''}">${x.ok ? '✓' : x.n}</span>`).join('')}<p>${faits === total ? 'Ta carte de presse est validée.' : `Ma carte de presse : ${faits} tampon${faits > 1 ? 's' : ''} sur ${total}`}</p></div>
    </section></div>`;
    zone.innerHTML = h;
  }

  /* ---------- une chaîne : la liste, ou la fiche d'une production ---------- */
  async function chaine(zone, type) {
    const C = CHAINES[type], liste = await charger(type);
    if (!liste) { zone.innerHTML = `<div class="int"><div class="vide-m" style="margin-top:40px"><b>Cette chaîne ne répond pas</b>Le fichier ${esc(C.fichier.replace(CLUB_DIR, 'club/'))} est introuvable ou mal écrit. Ouvre-le sur GitHub et reviens à la version d’avant.</div></div>`; return; }
    const id = new URLSearchParams(location.search).get('e');
    if (id) return fiche(zone, liste.find(e => e.id === id), C);
    const rubriques = [...new Set(liste.map(e => e.rubrique).filter(Boolean))];
    let filtre = '';
    const extra = type === 'gazette'
      ? `<div class="int" style="margin-top:36px"><div class="outils-m"><a class="outil" href="${CLUB_DIR}redaction.html"><b>Le prochain numéro s’écrit en ce moment</b><span>Entre dans la salle de rédaction, choisis ton article et écris-le avec ton équipe.</span></a><a class="outil" href="module.html?m=m10-mettre-en-page"><b>Apprendre à mettre en page</b><span>Le module 10 t’apprend à passer d’un texte à une page de journal.</span></a></div></div>`
      : type === 'emission'
        ? `<div class="int" style="margin-top:36px"><div class="outils-m"><a class="outil" href="${CLUB_DIR}banc/"><b>Le banc de montage</b><span>Entraîne-toi à monter un reportage sur le cross : dérushage, coupes, titres et son.</span></a><a class="outil" href="module.html?m=m9-monter-une-emission"><b>Apprendre à monter une émission</b><span>Le module 9 : le conducteur, les rôles, le plateau, la vérification.</span></a></div></div>`
        : `<div class="int" style="margin-top:36px"><div class="outils-m"><a class="outil" href="module.html?m=m7-le-podcast"><b>Apprendre à faire un podcast</b><span>Le module 7 : préparer, enregistrer et monter ta chronique.</span></a><a class="outil" href="module.html?m=m5-l-art-de-l-interview"><b>L’art de l’interview</b><span>Le module 5 : préparer ses questions et écouter les réponses.</span></a></div></div>`;
    function dessiner() {
      const vus = liste.filter(e => !filtre || e.rubrique === filtre);
      zone.innerHTML = `<div class="int c-${type}"><header class="tete-chaine"><h1>${C.nom}</h1><p>${C.slogan}</p></header>
        ${rubriques.length > 1 ? `<div class="filtres-m" role="group" aria-label="Choisir une rubrique"><button type="button" data-r="" aria-pressed="${!filtre}">Tout</button>${rubriques.map(r => `<button type="button" data-r="${esc(r)}" aria-pressed="${filtre === r}">${esc(r)}</button>`).join('')}</div>` : ''}
        ${liste.length ? `<div class="${classeGrille(type)}">${vus.map(carte).join('')}</div>` : `<div class="vide-m"><b>${C.vide}</b>En attendant, apprends comment on la fabrique dans « Se former ».</div>`}</div>${extra}`;
      zone.querySelectorAll('.filtres-m button').forEach(b => b.onclick = () => { filtre = b.dataset.r; dessiner(); });
    }
    dessiner();
  }

  const REFLEXES = {
    emission: 'Je ne publie rien sans avoir tout vérifié, et un montage ne fait jamais dire à quelqu’un ce qu’il n’a pas dit.',
    podcast: 'Au micro, je ne fais parler personne sans son accord, et je ne coupe jamais une phrase pour lui faire dire autre chose.',
    gazette: 'Je ne publie pas ce que je n’ai pas vérifié, et je signe ce que j’écris.',
  };
  function fiche(zone, e, C) {
    if (!e) { zone.innerHTML = `<div class="int"><div class="vide-m" style="margin-top:40px"><b>Cette page n’existe plus</b><a href="${C.page}">Revenir à la chaîne ${C.nom}</a></div></div>`; return; }
    document.title = e.titre + ' · Dupanloup Média';
    let lecteur;
    if (e.type === 'gazette') {
      const local = pdfLocal(e.pdf), dist = pdfLien(e.pdf);
      lecteur = local ? `<div class="lecteur-m pdf"><iframe src="${esc(local)}" title="${esc(e.titre)}, à feuilleter"></iframe></div><p><a class="btn-m" href="${esc(local)}" target="_blank" rel="noopener">Ouvrir le numéro en grand</a></p>`
        : dist ? `<div class="lecteur-m"><div class="attente-m">${e.image ? `<img src="${esc(img(e.image))}" alt="">` : ''}<div><b>Le numéro est prêt</b><a class="btn-m" href="${esc(dist)}" target="_blank" rel="noopener">Lire le numéro</a></div></div></div>`
        : `<div class="lecteur-m"><div class="attente-m">${e.image ? `<img src="${esc(img(e.image))}" alt="">` : ''}<div><b>${e.exemple ? 'Numéro d’exemple' : 'Bientôt à lire ici'}</b>Le PDF de ce numéro n’est pas encore en ligne.</div></div></div>`;
    } else {
      const src = podeduc(e.podeduc);
      lecteur = `<div class="lecteur-m">${src ? `<iframe src="${esc(src)}" title="Lecteur PodEduc : ${esc(e.titre)}" allowfullscreen loading="lazy"></iframe>`
        : `<div class="attente-m">${e.image ? `<img src="${esc(img(e.image))}" alt="">` : ''}<div><b>${e.exemple ? 'Production d’exemple' : 'Bientôt à l’antenne'}</b>${e.exemple ? 'Le lecteur PodEduc s’affichera ici.' : (e.type === 'emission' ? 'La vidéo n’est pas encore en ligne.' : 'Le son n’est pas encore en ligne.')}${e.podeduc && !src ? '<br><small>Le lien indiqué n’est pas un lien PodEduc : il n’est pas affiché.</small>' : ''}</div></div>`}</div>`;
    }
    const liste = (titre, lignes) => (lignes || []).length ? `<details class="depliant"><summary>${titre}</summary><div>${lignes.map(p => `<p>${esc(p)}</p>`).join('')}</div></details>` : '';
    zone.innerHTML = `<div class="int c-${e.type}"><div class="fiche-m">
      <div>
        <span class="pastille-c">${esc(C.nom)}${e.numero ? ', n° ' + esc(e.numero) : ''}</span>
        <h1>${esc(e.titre)}</h1><p class="infos">${infos(e)}</p>
        <p class="chapo">${esc(e.chapo)}</p>
        ${lecteur}
        ${liste('Lire la transcription', e.transcription)}
      </div>
      <aside class="cote-m">
        ${(e.conducteur || []).length ? `<div class="bloc-m"><h2>Le conducteur</h2><ol class="conducteur">${e.conducteur.map(c => `<li><time>${esc(c.t)}</time><span>${esc(c.titre)}</span></li>`).join('')}</ol></div>` : ''}
        ${(e.sommaire || []).length ? `<div class="bloc-m"><h2>Au sommaire</h2><ol class="conducteur">${e.sommaire.map(c => `<li><time>p. ${esc(c.page)}</time><span>${esc(c.titre)}</span></li>`).join('')}</ol></div>` : ''}
        ${(e.equipe || []).length ? `<div class="bloc-m"><h2>L’équipe</h2><ul class="equipe-m">${e.equipe.map(m => `<li><b>${esc(m.prenom)}</b><span>${esc(m.role)}</span></li>`).join('')}</ul></div>` : ''}
        ${e.article && /^https:\/\//.test(e.article) ? `<div class="bloc-m"><h2>À lire aussi</h2><p><a href="${esc(e.article)}">L’article de la Gazette sur le même sujet</a></p></div>` : ''}
        ${e.sources ? `<div class="bloc-m"><h2>Sources et autorisations</h2><p>${esc(e.sources)}</p></div>` : ''}
        <div class="bloc-m"><h2>Le réflexe du reporter</h2><p class="reflexe-m">${REFLEXES[e.type]}</p></div>
      </aside></div>
      <a class="retour-m" href="${C.page}">Revenir à la chaîne ${C.nom}</a></div>`;
  }

  function demarrer() {
    const page = document.body.dataset.page, zone = document.getElementById('zone');
    habiller(page);
    if (page === 'accueil') accueil(zone);
    else if (CHAINES[page]) chaine(zone, page);
  }
  return { demarrer, habiller, esc, img, CHAINES, CLUB_DIR };
})();
