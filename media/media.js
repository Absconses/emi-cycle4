/* Dupanloup Média : le code commun à toutes les pages.
 * Les productions sont décrites dans trois fichiers :
 *   emissions.json (ici), ../club/podcasts.json (partagé avec la radio du club), gazette.json (ici).
 * Le son et la vidéo restent sur PodEduc (apps.education.fr) : seuls ces lecteurs sont intégrés. */
(function () {
  let choix = null; try { choix = localStorage.getItem('media-effets'); } catch (e) {}
  if (choix === 'calme' || (!choix && matchMedia('(prefers-reduced-motion: reduce)').matches)) document.documentElement.classList.add('calme');
})();
window.MEDIA = (function () {
  const COULEUR = { emission: 'corail', podcast: 'jaune', gazette: 'papier' };
  let ambMur = 'var(--corail)', voyageActif = false;
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

  const visuel = e => e.type === 'gazette'
    ? `<div class="une-gazette"><b>La Gazette</b><span>n° ${esc(e.numero || '')}, ${esc(dateFr(e.date))}</span>${e.image ? `<img src="${esc(img(e.image))}" alt="" loading="lazy" style="object-fit:cover">` : ''}</div>`
    : (e.image ? `<img src="${esc(img(e.image))}" alt="" loading="lazy">` : '');
  const geste = e => `<span class="geste" aria-hidden="true">${e.type === 'gazette' ? 'Lire' : e.type === 'podcast' ? '▶ Écouter' : '▶ Regarder'}</span>`;
  function carte(e) {
    return `<article class="carte-m c-${e.type}">
      <div class="vignette">${visuel(e)}${e.type !== 'gazette' && e.numero ? `<span class="numero">n° ${esc(e.numero)}</span>` : ''}${drapeau(e)}${geste(e)}</div>
      <h3><a href="${lien(e)}">${esc(e.titre)}</a></h3>
      <p class="infos">${infos(e)}</p>
      ${e.chapo ? `<p class="chapo">${esc(e.chapo)}</p>` : ''}</article>`;
  }
  const classeGrille = t => t === 'podcast' ? 'grille pochettes' : t === 'gazette' ? 'grille pages' : 'grille';

  /* ---------- la barre et le pied, communs à toutes les pages ---------- */
  function habiller(page) {
    const nav = [['emission', 'emissions.html', 'Émissions'], ['podcast', 'radio.html', 'Radio'], ['gazette', 'gazette.html', 'Gazette'], ['formation', 'formation.html', 'Se former']];
    let vu = true; try { vu = !!sessionStorage.getItem('media-antenne'); sessionStorage.setItem('media-antenne', '1'); } catch (e) {}
    if (page === 'accueil' && !vu && !document.documentElement.classList.contains('calme')) {
      document.body.insertAdjacentHTML('afterbegin', `<div class="generique" id="generique" aria-hidden="true"><i></i><i></i><i></i><i></i><div><img src="${CLUB_DIR}img/sigle-dupanloup.png" alt="" width="120" height="120"><b>Dupanloup Média</b><span>À l’antenne</span></div></div>`);
      const g = document.getElementById('generique'), finir = () => g.remove();
      g.addEventListener('animationend', e => { if (e.animationName === 'generique-fin') finir(); });
      g.addEventListener('click', finir); addEventListener('keydown', finir, { once: true }); setTimeout(finir, 3600);
    }
    document.body.insertAdjacentHTML('afterbegin', `<div class="ambiance" aria-hidden="true"><i></i><i></i><i></i></div><div class="mire" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <header class="barre-media"><div class="barre-verre">
      <a class="marque" href="index.html"><img src="${CLUB_DIR}img/sigle-dupanloup.png" alt="" width="40" height="40"><span><b>Dupanloup Média</b><small>Le média des élèves, fabriqué au CDI</small></span></a>
      <nav class="chaines-nav" aria-label="Les chaînes">${nav.map(([c, h, t]) => `<a class="c-${c}" href="${h}"${page === c ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
      <button type="button" class="chercher" id="ouvrir-palette" aria-haspopup="dialog"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg><span>Chercher</span><kbd>Ctrl K</kbd></button>
    </div></header>
    <dialog class="palette" id="palette" aria-label="Chercher sur Dupanloup Média"><input type="search" id="palette-champ" placeholder="Une émission, un podcast, un module…" aria-label="Chercher" autocomplete="off"><ul id="palette-liste"></ul><p class="infos">Flèches haut et bas pour choisir, Entrée pour ouvrir, Échap pour fermer.</p></dialog>`);
    document.body.insertAdjacentHTML('beforeend', `<footer class="pied-media"><div class="int">
      <div><b>Dupanloup Média</b><p>Les émissions, les podcasts et la gazette des élèves du collège Dupanloup, à Boulogne. Tout est préparé, enregistré et monté au CDI.</p><p>Aucun compte, aucune publicité. Les sons et les vidéos sont hébergés par l’Éducation nationale.</p></div>
      <div><b>Les chaînes</b><ul><li><a href="emissions.html">Émissions</a></li><li><a href="radio.html">Radio</a></li><li><a href="gazette.html">Gazette</a></li><li><a href="formation.html">Se former au reportage</a></li></ul></div>
      <div><b>La rédaction</b><ul><li><a href="${CLUB_DIR}redaction.html">Salle de rédaction</a></li><li><a href="${CLUB_DIR}banc/">Banc de montage</a></li><li><a href="publier.html">Publier une production</a></li><li><a href="${CLUB_DIR}enseignant.html">Espace enseignant</a></li><li><button type="button" class="lien-m" id="effets"></button></li></ul></div>
    </div></footer>`);
  }

  /* ---------- l'accueil ---------- */
  async function accueil(zone) {
    const [em, po, ga] = await Promise.all(['emission', 'podcast', 'gazette'].map(charger));
    const tout = { emission: em || [], podcast: po || [], gazette: ga || [] };
    const tous = [...tout.emission, ...tout.podcast, ...tout.gazette].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const mur = tous.slice(0, 6);
    let h = mur.length ? `<section class="antenne int"><div class="antenne-texte" id="mur-texte"></div>
        <div class="mur" id="mur" tabindex="0" role="group" aria-roledescription="carrousel" aria-label="Les dernières productions. Flèches gauche et droite pour changer.">
          <div class="mur-scene">${mur.map((e, i) => `<a class="ecran-mur c-${e.type} f-${e.type}" data-i="${i}" href="${lien(e)}" aria-label="${esc(e.titre)}" draggable="false">${visuel(e)}${drapeau(e)}${e.type === 'gazette' ? '' : '<span class="jouer" aria-hidden="true">▶</span>'}</a>`).join('')}</div>
          <div class="mur-cmd"><button type="button" data-pas="-1" aria-label="Production précédente">←</button><span id="mur-compte"></span><button type="button" data-pas="1" aria-label="Production suivante">→</button></div>
        </div></section>`
      : `<section class="antenne int"><div><h1>Dupanloup Média</h1><p class="chapo">Les émissions, les podcasts et la gazette des élèves arrivent ici.</p></div></section>`;
    const compte = (n, un, des) => n ? `${n} ${n > 1 ? des : un}` : 'Bientôt';
    h += `<section class="voyage" id="voyage" aria-label="Les trois chaînes"><div class="voyage-cadre">
      ${['emission', 'podcast', 'gazette'].map((t, i) => { const C = CHAINES[t], P = [[30, -26, 260], [36, 24, 120], [12, 2, -160]];
        return `<div class="voyage-scene c-${t}" data-type="${t}">
          <span class="v-canal" aria-hidden="true">${C.n}</span>
          ${tout[t].slice(0, 3).map((e, k) => `<a class="v-carte f-${t}" href="${lien(e)}" style="--x:${P[k][0]}vw;--y:${P[k][1]}vh;--z:${P[k][2]}px" aria-label="${esc(e.titre)}" tabindex="-1">${visuel(e)}</a>`).join('')}
          <div class="v-texte"><p class="v-compte">${compte(tout[t].length, t === 'gazette' ? 'numéro' : t === 'podcast' ? 'podcast' : 'émission', t === 'gazette' ? 'numéros' : t === 'podcast' ? 'podcasts' : 'émissions')}</p><h2>${C.nom}</h2><p>${C.slogan}</p><a class="btn-m" href="${C.page}">Entrer dans la chaîne</a></div>
        </div>`; }).join('')}
      <div class="voyage-jauge" aria-hidden="true"><i></i><i></i><i></i></div>
      <p class="voyage-indice" aria-hidden="true">Continue de descendre</p>
    </div></section>`;
    h += `<nav class="chaines int" aria-label="Choisir une chaîne">
      <a class="chaine c-emission" href="emissions.html"><span class="canal" aria-hidden="true">1</span><span class="combien">${compte(tout.emission.length, 'émission', 'émissions')}</span><h2>Émissions</h2><p>${CHAINES.emission.slogan}</p></a>
      <a class="chaine c-podcast" href="radio.html"><span class="canal" aria-hidden="true">2</span><span class="combien">${compte(tout.podcast.length, 'podcast', 'podcasts')}</span><h2>Radio</h2><p>${CHAINES.podcast.slogan}</p></a>
      <a class="chaine c-gazette" href="gazette.html"><span class="canal" aria-hidden="true">3</span><span class="combien">${compte(tout.gazette.length, 'numéro', 'numéros')}</span><h2>Gazette</h2><p>${CHAINES.gazette.slogan}</p></a>
    </nav>`;
    for (const t of ['emission', 'podcast', 'gazette']) {
      const C = CHAINES[t], liste = tout[t].slice(0, t === 'emission' ? 3 : 4);
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
    monterMur(mur);
    monterVoyage();
  }

  /* Le voyage : la section est très haute, son cadre reste collé à l'écran,
   * et la descente de la page fait avancer la caméra à travers les trois chaînes. */
  function monterVoyage() {
    const section = document.getElementById('voyage'); if (!section) return;
    const scenes = [...section.querySelectorAll('.voyage-scene')], points = [...section.querySelectorAll('.voyage-jauge i')];
    const indice = section.querySelector('.voyage-indice'), racine = document.documentElement, N = scenes.length;
    const palier = x => { const f = Math.floor(x), r = x - f, u = Math.min(1, Math.max(0, (r - .28) / .44)); return f + u * u * (3 - 2 * u); };
    let prevu = false;
    function dessiner() {
      prevu = false;
      if (racine.classList.contains('calme')) { voyageActif = false; return; }
      const r = section.getBoundingClientRect(), p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
      const pos = palier(p * (N - 1) * .999), proche = Math.round(pos);
      scenes.forEach((sc, i) => { const d = i - pos, o = d >= 0 ? 1 - d * 1.15 : 1 + d * 2.6;
        sc.style.transform = `translate3d(0,0,${(-d * 1700).toFixed(1)}px)`;
        sc.style.opacity = Math.max(0, Math.min(1, o)).toFixed(3);
        sc.style.visibility = o <= 0 ? 'hidden' : 'visible';
        const ici = Math.abs(d) < .25; sc.style.pointerEvents = ici ? 'auto' : 'none'; sc.inert = !ici; });
      points.forEach((pt, i) => pt.classList.toggle('ici', i === proche));
      indice.style.opacity = p > .93 ? 0 : 1;
      const dedans = r.top < innerHeight * .45 && r.bottom > innerHeight * .55;
      voyageActif = dedans;
      racine.style.setProperty('--amb', dedans ? `var(--${COULEUR[scenes[proche].dataset.type]})` : ambMur);
    }
    const demander = () => { if (!prevu) { prevu = true; requestAnimationFrame(dessiner); } };
    addEventListener('scroll', demander, { passive: true }); addEventListener('resize', demander);
    dessiner();
  }

  /* Le mur de la régie : les dernières productions en profondeur.
   * On change à la flèche, au clavier, au doigt, ou en touchant un écran du fond. */
  function monterMur(items) {
    const mur = document.getElementById('mur'); if (!mur) return;
    const ecrans = [...mur.querySelectorAll('.ecran-mur')], texte = document.getElementById('mur-texte'), compte = document.getElementById('mur-compte');
    const boutons = [...mur.querySelectorAll('[data-pas]')];
    let actif = 0, glisse = null, aGlisse = false;
    function ecrire() {
      const e = items[actif], C = CHAINES[e.type];
      texte.className = 'antenne-texte c-' + e.type;
      texte.innerHTML = `<span class="pastille-c">${C.nom}</span><h1 aria-label="${esc(e.titre)}">${e.titre.split(/\s+/).map((m, k) => `<span class="mot" aria-hidden="true"><span style="--k:${k}">${esc(m)}</span></span>`).join(' ')}</h1>
        <p class="chapo">${esc(e.chapo)}</p><p class="infos">${infos(e)}</p>
        <div class="actions-m"><a class="btn-m" href="${lien(e)}">${enLigne(e) ? C.verbe : 'Découvrir'}</a><a class="btn-m creux" href="${C.page}">Toute la chaîne ${C.nom}</a></div>`;
      compte.textContent = `${actif + 1} sur ${items.length}`;
      ambMur = `var(--${COULEUR[e.type]})`; if (!voyageActif) document.documentElement.style.setProperty('--amb', ambMur);
    }
    function placer() {
      ecrans.forEach((el, i) => { const d = i - actif;
        el.style.setProperty('--d', d); el.style.setProperty('--ad', Math.abs(d)); el.style.zIndex = 10 - Math.abs(d);
        el.classList.toggle('actif', d === 0); el.classList.toggle('passe', d < 0); el.classList.toggle('loin', d > 2);
        el.tabIndex = d === 0 ? 0 : -1; el.setAttribute('aria-hidden', d === 0 ? 'false' : 'true'); });
      boutons[0].disabled = actif === 0; boutons[1].disabled = actif === items.length - 1;
    }
    function aller(i) {
      i = Math.max(0, Math.min(items.length - 1, i)); if (i === actif) return;
      actif = i; placer();
      if (document.documentElement.classList.contains('calme')) return ecrire();
      texte.classList.add('change'); setTimeout(() => { ecrire(); texte.classList.remove('change'); }, 170);
    }
    boutons.forEach(b => b.onclick = () => aller(actif + Number(b.dataset.pas)));
    mur.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { aller(actif + 1); e.preventDefault(); } if (e.key === 'ArrowLeft') { aller(actif - 1); e.preventDefault(); } });
    mur.addEventListener('pointerdown', e => { glisse = e.clientX; aGlisse = false; });
    mur.addEventListener('pointerup', e => { if (glisse == null) return; const dx = e.clientX - glisse; glisse = null;
      if (Math.abs(dx) > 45) { aGlisse = true; aller(actif + (dx < 0 ? 1 : -1)); } });
    mur.addEventListener('click', e => { const el = e.target.closest('.ecran-mur'); if (!el) return;
      if (aGlisse) { e.preventDefault(); aGlisse = false; return; }
      const i = Number(el.dataset.i); if (i !== actif) { e.preventDefault(); aller(i); } });
    placer(); ecrire();
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
  return { demarrer, habiller, esc, img, charger, lien, CHAINES, CLUB_DIR };
})();
