/* Dupanloup Média : les effets. Tout ici est un supplément :
 * sans ce fichier, ou en mode calme, le site fonctionne de la même façon. */
(function () {
  const racine = document.documentElement;
  const calme = () => racine.classList.contains('calme');
  const souris = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- le bouton « Effets visuels » ---------- */
  const bouton = document.getElementById('effets');
  if (bouton) {
    const dire = () => { bouton.textContent = calme() ? 'Effets visuels : réduits. Les activer' : 'Effets visuels : activés. Les réduire'; };
    bouton.onclick = () => { racine.classList.toggle('calme'); try { localStorage.setItem('media-effets', calme() ? 'calme' : 'plein'); } catch (e) {} dire(); };
    dire();
  }

  /* ---------- la lumière d'ambiance, le relief et la lueur suivent le pointeur ---------- */
  if (souris) {
    let attente = false, dernier = null;
    const RELIEF = '.chaine, .mod, .outil, .carte-m', LUEUR = RELIEF + ', .bloc-m';
    const lacher = el => { if (el) { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); } };
    document.addEventListener('pointermove', e => {
      if (attente || calme()) return; attente = true;
      requestAnimationFrame(() => {
        attente = false;
        racine.style.setProperty('--px', (e.clientX / innerWidth * 2 - 1).toFixed(3));
        racine.style.setProperty('--py', (e.clientY / innerHeight * 2 - 1).toFixed(3));
        const el = e.target.closest && e.target.closest(LUEUR);
        if (el !== dernier) { lacher(dernier); dernier = el; }
        if (!el) return;
        const cible = el.matches('.carte-m') ? el.querySelector('.vignette') || el : el, r = cible.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        if (el.matches(RELIEF)) { el.style.setProperty('--ry', ((x - .5) * 9).toFixed(2) + 'deg'); el.style.setProperty('--rx', ((.5 - y) * 9).toFixed(2) + 'deg'); }
      });
    }, { passive: true });
    document.addEventListener('pointerleave', () => { lacher(dernier); dernier = null; });
  }

  /* ---------- d'une carte à sa fiche : la vignette devient le lecteur ---------- */
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('.carte-m a, a.ecran-mur.actif');
    if (!a || calme()) return;
    const carte = a.closest('.carte-m');
    (carte ? carte.querySelector('.vignette') : a).style.viewTransitionName = 'heros';
  }, true);
  addEventListener('pageswap', e => { if (calme() && e.viewTransition) e.viewTransition.skipTransition(); });
  addEventListener('pageshow', () => document.querySelectorAll('.vignette, .ecran-mur').forEach(el => el.style.removeProperty('view-transition-name')));

  /* ---------- la recherche : tout le site dans une seule boîte ---------- */
  const palette = document.getElementById('palette'), champ = document.getElementById('palette-champ'), liste = document.getElementById('palette-liste');
  let index = null, choix = 0;
  const sansAccent = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  async function preparer() {
    if (index) return index;
    const M = window.MEDIA, esc = M.esc, pages = [
      { t: 'Accueil', s: 'Page', h: 'index.html' }, { t: 'Émissions', s: 'Chaîne', h: 'emissions.html', c: 'emission' }, { t: 'Radio', s: 'Chaîne', h: 'radio.html', c: 'podcast' },
      { t: 'Gazette', s: 'Chaîne', h: 'gazette.html', c: 'gazette' }, { t: 'Se former : devenir reporter', s: 'Formation', h: 'formation.html', c: 'formation' },
      { t: 'Ma carte de presse et mon bilan', s: 'Formation', h: 'formation.html#bilan', c: 'formation' }, { t: 'Publier une production', s: 'Rédaction', h: 'publier.html' },
      { t: 'Salle de rédaction', s: 'Rédaction', h: M.CLUB_DIR + 'redaction.html' }, { t: 'Banc de montage', s: 'Rédaction', h: M.CLUB_DIR + 'banc/' }];
    const noms = { emission: 'Émission', podcast: 'Podcast', gazette: 'Gazette' };
    const prods = (await Promise.all(['emission', 'podcast', 'gazette'].map(M.charger))).flatMap(l => l || [])
      .map(e => ({ t: e.titre, s: noms[e.type], h: M.lien(e), c: e.type, plus: [e.chapo, e.rubrique, (e.equipe || []).map(m => m.prenom).join(' ')].join(' ') }));
    let mods = [];
    try { mods = (await (await fetch(M.CLUB_DIR + 'modules.json')).json()).filter(m => m.pret)
      .map(m => ({ t: (m.type === 'atelier' ? 'Atelier : ' : 'Module ' + m.num + ' : ') + m.titre, s: 'Formation', h: 'module.html?m=' + encodeURIComponent(m.id), c: 'formation', plus: m.chapo })); } catch (e) {}
    index = [...prods, ...mods, ...pages].map(x => Object.assign(x, { cle: sansAccent(x.t + ' ' + x.s + ' ' + (x.plus || '')), html: `<a class="c-${x.c || ''}" href="${esc(x.h)}"><b>${esc(x.t)}</b><span>${esc(x.s)}</span></a>` }));
    return index;
  }
  function montrer() {
    const mots = sansAccent(champ.value).split(/\s+/).filter(Boolean);
    const vus = index.filter(x => mots.every(m => x.cle.includes(m))).slice(0, 9);
    choix = Math.min(choix, Math.max(0, vus.length - 1));
    liste.innerHTML = vus.length ? vus.map((x, i) => `<li aria-selected="${i === choix}">${x.html}</li>`).join('') : '<li><a><b>Rien trouvé</b><span>Essaie un autre mot</span></a></li>';
  }
  async function ouvrir() { if (!palette || palette.open) return; palette.showModal(); champ.value = ''; choix = 0; await preparer(); montrer(); champ.focus(); }
  if (palette) {
    document.getElementById('ouvrir-palette').onclick = ouvrir;
    addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ouvrir(); } });
    champ.addEventListener('input', () => { choix = 0; if (index) montrer(); });
    champ.addEventListener('keydown', e => {
      const n = liste.querySelectorAll('li a[href]').length;
      if (e.key === 'ArrowDown') { choix = Math.min(n - 1, choix + 1); montrer(); e.preventDefault(); }
      if (e.key === 'ArrowUp') { choix = Math.max(0, choix - 1); montrer(); e.preventDefault(); }
      if (e.key === 'Enter') { const a = liste.querySelector('li[aria-selected="true"] a[href]'); if (a) location.href = a.href; }
    });
    palette.addEventListener('click', e => { if (e.target === palette) palette.close(); });
  }
})();
