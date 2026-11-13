/* Dupanloup Média : le code commun à toutes les pages.
 * Les productions sont décrites dans trois fichiers :
 *   emissions.json (ici), ../club/podcasts.json (partagé avec la radio du club), gazette.json (ici).
 * Le son et la vidéo restent sur PodEduc (apps.education.fr) : seuls ces lecteurs sont intégrés. */
(function () {
  let choix = null; try { choix = localStorage.getItem('media-effets'); } catch (e) {}
  if (choix === 'calme' || (!choix && matchMedia('(prefers-reduced-motion: reduce)').matches)) document.documentElement.classList.add('calme');
  // la réfraction du verre (un filtre SVG derrière le panneau) n'existe que dans Chrome, Edge et leurs cousins
  if (window.chrome || (navigator.userAgentData && navigator.userAgentData.brands.some(b => /Chromium/.test(b.brand)))) document.documentElement.classList.add('verre-liquide');
})();
window.MEDIA = (function () {
  const COULEUR = { emission: 'abricot', podcast: 'or', gazette: 'or' };
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
  const drapeau = e => e.exemple ? '<span class="drapeau">Maquette</span>' : (enLigne(e) ? '' : '<span class="drapeau">Bientôt</span>');

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
    document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="verre-liquide" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".007 .011" numOctaves="2" seed="7" result="n"/><feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b"/><feDisplacementMap in="b" in2="n" scale="60" xChannelSelector="R" yChannelSelector="G"/></filter></svg>`);
    let entre = true; try { entre = !!sessionStorage.getItem('media-entree'); } catch (e) {}
    if (page === 'accueil' && !entre && !document.documentElement.classList.contains('calme')) rideau();
    document.body.insertAdjacentHTML('afterbegin', `<div class="ambiance" aria-hidden="true"><i></i><i></i><i></i></div><div class="mire" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <header class="barre-media"><div class="barre-verre">
      <a class="marque" href="index.html"><img src="${CLUB_DIR}img/sigle-dupanloup.png" alt="" width="40" height="40"><span><b>Dupanloup Média</b><small>Le média des élèves, fabriqué au CDI</small></span></a>
      <nav class="chaines-nav" aria-label="Les chaînes">${nav.map(([c, h, t]) => `<a class="c-${c}" href="${h}"${page === c ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
      <button type="button" class="son-btn" id="son" aria-pressed="false" title="Allumer ou couper les sons du site"><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span>Son</span></button>
      <button type="button" class="chercher" id="ouvrir-palette" aria-haspopup="dialog"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg><span>Chercher</span><kbd>Ctrl K</kbd></button>
    </div></header>
    <dialog class="palette" id="palette" aria-label="Chercher sur Dupanloup Média"><input type="search" id="palette-champ" placeholder="Une émission, un podcast, un module…" aria-label="Chercher" autocomplete="off"><ul id="palette-liste"></ul><p class="infos">Flèches haut et bas pour choisir, Entrée pour ouvrir, Échap pour fermer.</p></dialog>`);
    document.body.insertAdjacentHTML('beforeend', `<footer class="pied-media"><div class="int">
      <div><b>Dupanloup Média</b><p>Les émissions, les podcasts et la gazette des élèves du collège Dupanloup, à Boulogne. Tout est préparé, enregistré et monté au CDI.</p><p>Aucun compte, aucune publicité. Les sons et les vidéos sont hébergés par l’Éducation nationale.</p></div>
      <div><b>Les chaînes</b><ul><li><a href="emissions.html">Émissions</a></li><li><a href="radio.html">Radio</a></li><li><a href="gazette.html">Gazette</a></li><li><a href="formation.html">Se former au reportage</a></li></ul></div>
      <div><b>La rédaction</b><ul><li><a href="redaction.html">Salle de rédaction</a></li><li><a href="montage.html">Banc de montage</a></li><li><a href="publier.html">Publier une production</a></li><li><a href="enseignant.html">Espace enseignant</a></li><li><button type="button" class="lien-m" id="effets"></button></li></ul></div>
    </div></footer>`);
  }

  /* ---------- le rideau : on entre sur le site comme on passe à l'antenne ----------
   * Une fois par visite, sur l'accueil. Le clic choisit le son, ouvre le rideau et lance l'arrivée de la une
   * (jusque-là en pause : classe « attente »). Les navigateurs n'autorisent le son qu'après ce geste. */
  function rideau() {
    const racine = document.documentElement; racine.classList.add('attente');
    document.body.insertAdjacentHTML('beforeend', `<div class="rideau" id="rideau" role="dialog" aria-modal="true" aria-labelledby="rideau-titre">
      <div class="rideau-pan g"></div><div class="rideau-pan d"></div><div class="lumieres" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="rideau-carte verre-vif">
        <img src="${CLUB_DIR}img/sigle-dupanloup.png" alt="" width="96" height="96">
        <p class="surtitre">Collège Dupanloup · Boulogne</p>
        <h2 id="rideau-titre">Dupanloup Média</h2>
        <p>Le média des élèves, fabriqué au CDI.</p>
        <div class="actions-m"><button type="button" class="btn-m" data-son="oui"><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>Entrer avec le son</button><button type="button" class="btn-m creux" data-son="non">Entrer sans le son</button></div>
        <p class="infos">Le son se coupe à tout moment, en haut de la page.</p>
      </div></div>`);
    const r = document.getElementById('rideau');
    function entrer(avecSon) {
      if (r.classList.contains('ouvre')) return;
      try { sessionStorage.setItem('media-entree', '1'); } catch (e) {}
      if (window.SON) SON.regler(avecSon);
      r.classList.add('ouvre'); setTimeout(() => racine.classList.remove('attente'), 480);
      if (window.SON && avecSon) SON.jouer('ouvre');
      ouverture(true, .5);
      setTimeout(() => r.remove(), 1500);
    }
    r.querySelectorAll('[data-son]').forEach(b => b.onclick = () => entrer(b.dataset.son === 'oui'));
    r.addEventListener('keydown', e => { if (e.key === 'Escape') entrer(false); });
    r.querySelector('[data-son="oui"]').focus();
  }
  /* la bande-son de l'arrivée, calée sur les animations de la une (voir media.css) */
  function ouverture(entiere, d) {
    if (!window.SON || !SON.actif()) return;
    SON.jouer('souffle', d);
    if (entiere) { for (let k = 0; k < 14; k++) SON.jouer('frappe', d + .15 + k * .065); SON.jouer('cloche', d + 1.2); }
    [0, 1, 2].forEach(i => SON.jouer('glisse', d + .5 + i * .2));
    SON.jouer('tampon', d + 2.5);
    if (entiere) SON.jouer('jingle', d + 2.9);
  }

  /* ---------- la une : la manchette du journal, les trois volets du collège, l'édito ---------- */
  const VOLETS = [['college-1.jpg', 'La façade du collège Dupanloup, avec ses fenêtres sculptées.', 'La façade'],
    ['college-2.jpg', 'L’angle du bâtiment principal et son perron.', 'Le perron'],
    ['college-3.jpg', 'La terrasse fleurie et l’aile moderne du collège.', 'La terrasse']];
  function laUne(n) {
    const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    let k = 0;
    const lettres = 'Dupanloup Média'.split(' ').map(mot => `<span class="mot">${[...mot].map(c => `<span style="--k:${k++}">${c}</span>`).join('')}</span>`).join(' ');
    return `<header class="manchette int" id="manchette">
      <p class="manchette-infos"><span>Collège Dupanloup · Boulogne</span><span>Édition du ${date}</span><span>${n ? `${n} production${n > 1 ? 's' : ''} à l’antenne` : 'Bientôt à l’antenne'}</span></p>
      <div class="tete-journal"><img class="sigle" src="${CLUB_DIR}img/sigle-dupanloup.png" alt="Sigle du collège Dupanloup, Boulogne" width="400" height="400">
        <h1 class="titre-journal" aria-label="Dupanloup Média, le média des élèves"><span class="le" aria-hidden="true">Le média des élèves</span><span class="nom" aria-hidden="true">${lettres}</span></h1></div>
      <div class="filets" aria-hidden="true"></div>
    </header>
    <section class="une int" aria-labelledby="titre-edito">
      <figure class="photo-une">
        <div class="triptyque">${VOLETS.map(([f, alt, leg], i) => `<div class="volet" style="--i:${i}"><div class="volet-in"><img src="${CLUB_DIR}img/${f}" alt="${alt}" width="270" height="720"><span class="legende-volet">${leg}</span><i class="reflet" aria-hidden="true"></i></div></div>`).join('')}
          <span class="tampon grand tampon-une" aria-hidden="true">À<br>l’antenne</span></div>
        <figcaption>Le collège Dupanloup, à Boulogne. Photos parues à la une de La Gazette de Dupanloup, n° 1, mai 2026.</figcaption>
      </figure>
      <div class="edito verre-vif">
        <p class="surtitre">Édito</p>
        <h2 id="titre-edito">Ici, ce sont les élèves qui font l’info</h2>
        <p class="chapo">Émissions, podcasts, gazette : tout est préparé, enregistré et monté au CDI par les reporters du collège.</p>
        <div class="actions-m"><a class="btn-m" href="#antenne">Voir les productions</a><a class="btn-m creux" href="formation.html">Devenir reporter</a></div>
      </div>
    </section>`;
  }

  /* ---------- l'accueil ---------- */
  async function accueil(zone) {
    const [em, po, ga] = await Promise.all(['emission', 'podcast', 'gazette'].map(charger));
    const tout = { emission: em || [], podcast: po || [], gazette: ga || [] };
    const tous = [...tout.emission, ...tout.podcast, ...tout.gazette].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const mur = tous.slice(0, 6);
    let h = mur.length ? `<section class="plateau" id="antenne"><div class="lumieres" aria-hidden="true"><i></i><i></i><i></i></div><div class="antenne int"><div class="rayon-tete"><h2>À l’antenne</h2><p class="infos">Les dernières productions</p></div><div class="antenne-texte" id="mur-texte"></div>
        <div class="mur" id="mur" tabindex="0" role="group" aria-roledescription="carrousel" aria-label="Les dernières productions. Flèches gauche et droite pour changer.">
          <div class="mur-scene">${mur.map((e, i) => `<a class="ecran-mur c-${e.type} f-${e.type}" data-i="${i}" href="${lien(e)}" aria-label="${esc(e.titre)}" draggable="false">${visuel(e)}${drapeau(e)}${e.type === 'gazette' ? '' : '<span class="jouer" aria-hidden="true">▶</span>'}</a>`).join('')}</div>
          <div class="mur-cmd"><button type="button" data-pas="-1" aria-label="Production précédente">←</button><span id="mur-compte"></span><button type="button" data-pas="1" aria-label="Production suivante">→</button></div>
        </div></div></section>`
      : `<section class="antenne int" id="antenne"><div class="vide-m"><b>Bientôt à l’antenne</b>Les émissions, les podcasts et la gazette des élèves arrivent ici.</div></section>`;
    const flash = [...tous.slice(0, 4).map(e => `${e.exemple ? 'Maquette' : 'Vient de paraître'} : ${e.titre}`), 'Un bon reporter vérifie toujours ses sources', 'Au micro, personne ne parle sans son accord', 'Un montage ne fait jamais dire à quelqu’un ce qu’il n’a pas dit'];
    const mots = ['Émissions', 'Radio', 'Gazette', 'Se former'];
    h = `<div class="flash" aria-label="Dernière minute"><span class="flash-etiquette">Dernière minute</span><div class="flash-piste"><div class="flash-defile" style="animation-duration:${Math.max(36, flash.join('').length / 7)}s">${[...flash, ...flash].map(t => `<span>${esc(t)}</span>`).join('')}</div></div></div>`
      + laUne(tous.length) + h
      + `<div class="defile-geant" aria-hidden="true"><div class="defile-piste">${[...mots, ...mots, ...mots, ...mots].map((m, i) => `<span class="${i % 2 ? 'plein' : ''}">${m}</span>`).join('')}</div></div>`;
    const compte = (n, un, des) => n ? `${n} ${n > 1 ? des : un}` : 'Bientôt';
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
    h += `<section class="rayon int garanties" aria-labelledby="titre-garanties"><div class="rayon-tete"><h2 id="titre-garanties">Un média encadré</h2><p class="infos">Les règles de la maison</p></div>
      <div class="outils-m">
        <div class="bloc-m garantie"><h3>Rien ne paraît sans validation</h3><p>Chaque émission, chaque podcast et chaque numéro est vérifié au CDI, puis validé par le chef d’établissement avant d’être publié.</p></div>
        <div class="bloc-m garantie"><h3>Les voix et les images restent à l’Éducation nationale</h3><p>Les sons et les vidéos sont hébergés sur PodEduc, la plateforme du ministère. Le site n’en garde aucune copie.</p></div>
        <div class="bloc-m garantie"><h3>Des prénoms, jamais de noms</h3><p>Ni nom de famille, ni classe. Chaque élève enregistré ou filmé a une autorisation signée de ses parents.</p></div>
        <div class="bloc-m garantie"><h3>Ni compte, ni publicité</h3><p>Le site ne demande aucune inscription et ne recueille aucune donnée. La progression d’un élève reste dans son navigateur.</p></div>
      </div></section>`;
    h += `<div class="int"><section class="bande-former"><div><h2>Toi aussi, passe à l’antenne</h2>
        <p>Dix modules pour apprendre le métier : trouver une info, écrire, interviewer, enregistrer, filmer, monter. Les trois premiers te donnent ta carte de presse.</p>
        <a class="btn-m" href="formation.html">${faits ? 'Reprendre ma formation' : 'Commencer la formation'}</a></div>
      <div class="tampons" aria-label="Ma carte de presse">${nums.map(x => `<span class="${x.ok ? 'fait' : ''}">${x.ok ? '✓' : x.n}</span>`).join('')}<p>${faits === total ? 'Ta carte de presse est validée.' : `Ma carte de presse : ${faits} tampon${faits > 1 ? 's' : ''} sur ${total}`}</p></div>
    </section></div>`;
    zone.innerHTML = h;
    monterMur(mur);
    if (!document.documentElement.classList.contains('attente')) ouverture(false, .05);
    // tant que la manchette est à l'écran, la barre n'a pas besoin de répéter le nom du site
    const manchette = document.getElementById('manchette');
    if (manchette && 'IntersectionObserver' in window) new IntersectionObserver(([x]) => document.body.classList.toggle('manchette-vue', x.isIntersecting), { rootMargin: '-70px 0px 0px 0px' }).observe(manchette.querySelector('.tete-journal'));
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
      texte.innerHTML = `<span class="pastille-c">${C.nom}</span><h3 class="titre-prod" aria-label="${esc(e.titre)}">${e.titre.split(/\s+/).map((m, k) => `<span class="mot" aria-hidden="true"><span style="--k:${k}">${esc(m)}</span></span>`).join(' ')}</h3>
        <p class="chapo">${esc(e.chapo)}</p><p class="infos">${infos(e)}</p>
        <div class="actions-m"><a class="btn-m" href="${lien(e)}">${enLigne(e) ? C.verbe : 'Découvrir'}</a><a class="btn-m creux" href="${C.page}">Toute la chaîne ${C.nom}</a></div>`;
      compte.textContent = `${actif + 1} sur ${items.length}`;
      document.documentElement.style.setProperty('--amb', `var(--${COULEUR[e.type]})`);
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
      actif = i; placer(); if (window.SON) SON.jouer('glisse');
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
      ? `<div class="int" style="margin-top:36px"><div class="outils-m"><a class="outil" href="redaction.html"><b>Le prochain numéro s’écrit en ce moment</b><span>Entre dans la salle de rédaction, choisis ton article et écris-le avec ton équipe.</span></a><a class="outil" href="module.html?m=m10-mettre-en-page"><b>Apprendre à mettre en page</b><span>Le module 10 t’apprend à passer d’un texte à une page de journal.</span></a></div></div>`
      : type === 'emission'
        ? `<div class="int" style="margin-top:36px"><div class="outils-m"><a class="outil" href="montage.html"><b>Le banc de montage</b><span>Entraîne-toi à monter un reportage sur le cross : dérushage, coupes, titres et son.</span></a><a class="outil" href="module.html?m=m9-monter-une-emission"><b>Apprendre à monter une émission</b><span>Le module 9 : le conducteur, les rôles, le plateau, la vérification.</span></a></div></div>`
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
        : `<div class="lecteur-m"><div class="attente-m">${e.image ? `<img src="${esc(img(e.image))}" alt="">` : ''}<div><b>${e.exemple ? 'Numéro de démonstration' : 'Bientôt à lire ici'}</b>Le PDF de ce numéro n’est pas encore en ligne.</div></div></div>`;
    } else {
      const src = podeduc(e.podeduc);
      lecteur = `<div class="lecteur-m">${src ? `<iframe src="${esc(src)}" title="Lecteur PodEduc : ${esc(e.titre)}" allowfullscreen loading="lazy"></iframe>`
        : `<div class="attente-m">${e.image ? `<img src="${esc(img(e.image))}" alt="">` : ''}<div><b>${e.exemple ? 'Maquette de démonstration' : 'Bientôt à l’antenne'}</b>${e.exemple ? 'Le lecteur PodEduc s’affichera ici.' : (e.type === 'emission' ? 'La vidéo n’est pas encore en ligne.' : 'Le son n’est pas encore en ligne.')}${e.podeduc && !src ? '<br><small>Le lien indiqué n’est pas un lien PodEduc : il n’est pas affiché.</small>' : ''}</div></div>`}</div>`;
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

  /* ---------- les ateliers du club (salle de rédaction, banc de montage, espace enseignant) ----------
   * Les pages du club ne sont pas modifiées : elles s'ouvrent dans un cadre, sous la barre du média.
   * Comme elles viennent du même site, on peut leur retirer leur propre barre, rendre leur fond transparent
   * et arrondir leurs boutons, pour qu'elles aient l'air d'en faire partie. */
  const ATELIERS = {
    redaction: { titre: 'La salle de rédaction', texte: 'Le chemin de fer du prochain numéro de la gazette, et un pad pour écrire chaque article.', src: CLUB_DIR + 'redaction.html', tete: true },
    montage: { titre: 'Le banc de montage', src: CLUB_DIR + 'banc/', plein: true },
    enseignant: { titre: 'Espace enseignant', src: CLUB_DIR + 'enseignant.html' },
  };
  const HABIT = `html, body { background: transparent !important; }
    .barre, .retour-accueil { display: none !important; }
    .btn, .cta, .lien-btn, .etapes button, .filtres select { border-radius: 999px !important; }
    .btn, .cta { box-shadow: inset 0 1px 0 rgba(255,255,255,.4), 0 12px 24px -12px rgba(0,1,119,.75) !important; }
    .carte, .boite, .chef, .compteur, .depot, .info, .panneau, .tableau-zone, .apercu, .pad, .moniteur, details.pourquoi { border-radius: 18px !important; }
    .carte, .boite, .chef, .compteur, .depot, .panneau { background: rgba(255,253,247,.72) !important; border-color: rgba(255,255,255,.9) !important; box-shadow: inset 0 1px 0 #fff, 0 24px 48px -26px rgba(0,1,119,.5) !important; }
    .moniteur, .tableau-zone, .pad { overflow: hidden; }
    input, select, textarea { border-radius: 12px !important; }`;
  function atelier(nom) {
    const A = ATELIERS[nom], zone = document.getElementById('zone'); if (!A) return;
    habiller('atelier'); document.title = A.titre + ' · Dupanloup Média';
    zone.innerHTML = `${A.tete ? `<div class="int"><header class="tete-chaine"><h1>${A.titre}</h1><p>${A.texte}</p></header></div>` : ''}<iframe class="cadre${A.plein ? ' plein' : ''}" id="cadre" title="${A.titre}" src="${A.src}"></iframe>`;
    const cadre = document.getElementById('cadre');
    cadre.addEventListener('load', () => {
      try {
        const d = cadre.contentDocument, style = d.createElement('style'); style.textContent = HABIT; d.head.appendChild(style);
        if (!A.plein) { const ajuster = () => { cadre.style.height = d.documentElement.scrollHeight + 'px'; }; new ResizeObserver(ajuster).observe(d.body); ajuster(); }
        // un lien vers la une du club ramène à l'accueil du média
        d.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href]'); if (!a) return; const h = a.getAttribute('href');
          if (h === 'index.html' || h === '../index.html' || h === '../') { e.preventDefault(); location.href = 'index.html'; } });
      } catch (e) {}
      cadre.classList.add('pret');
    });
  }

  function demarrer() {
    const page = document.body.dataset.page, zone = document.getElementById('zone');
    habiller(page);
    if (page === 'accueil') accueil(zone);
    else if (CHAINES[page]) chaine(zone, page);
  }
  return { demarrer, atelier, habiller, esc, img, charger, lien, CHAINES, CLUB_DIR };
})();
