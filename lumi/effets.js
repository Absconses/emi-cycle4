/* Lümi · lumière, verre et mouvements.
 * Règles suivies (plugin audit-suite : web-animation-design, make-interfaces-feel-better, emil-design-engineering) :
 *   - seuls transform et opacity bougent ; rien n'est animé au défilement ;
 *   - la lumière suit le geste de la personne (souris), sinon elle dérive lentement ;
 *   - rien ne s'anime si le système demande moins de mouvement ;
 *   - les effets de survol n'existent que sur les appareils qui ont un vrai survol. */
window.LUMI_FX = (function () {
  const CALME = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SURVOL = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- la lampe : un champ de titres dans l'ombre, qu'une lumière révèle ---------- */
  function lampe(racine, titres) {
    if (!racine) return;
    const VOCABULAIRE = [['source vérifiée', 'v'], ['qui parle ?', ''], ['à vérifier', 'q'], ['fait ou opinion ?', ''], ['ligne éditoriale', ''], ['image retouchée ?', 'q'],
      ['communiqué officiel', 'v'], ['rumeur', 'q'], ['dépêche d’agence', 'v'], ['partagé 12 000 fois', 'q'], ['moteur de recherche', ''], ['IA générative', ''],
      ['droit à l’image', ''], ['citer ses sources', 'v'], ['algorithme', ''], ['traces numériques', ''], ['éditorial', ''], ['reportage', ''], ['article sponsorisé', 'q']];
    const banque = titres.map(t => [t, '']).concat(VOCABULAIRE);
    // un ordre fixe : les deux couches (ombre et lumière) doivent porter exactement les mêmes mots
    const rangs = Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, k) => banque[(r * 7 + k * 5 + r * k) % banque.length]));
    const html = rangs.map(rang => { const mots = rang.map(([t, c]) => `<span${c ? ` class="${c}"` : ''}>${t}</span>`).join(''); return `<div class="l-rang">${mots}${mots}</div>`; }).join('');
    // de bas en haut : les mots dans l'ombre, les mots éclairés, un voile qui garde le texte lisible, la lueur
    racine.innerHTML = `<div class="l-mots l-ombre">${html}</div><div class="l-faisceau"><div class="l-mots l-clair">${html}</div></div><div class="l-voile"></div><div class="l-halo"></div>`;
    const halo = racine.querySelector('.l-halo'), faisceau = racine.querySelector('.l-faisceau'), clair = racine.querySelector('.l-clair');
    const hote = racine.parentElement, porte = hote.querySelector('.l-porte');
    let L = 1, H = 1, R = 190, x = 0, y = 0, cible = null, tourne = false, visible = true, t0 = performance.now();
    const mesurer = () => {
      const r = racine.getBoundingClientRect(); L = r.width; H = r.height; R = L < 700 ? 130 : 200;
      clair.style.width = L + 'px'; clair.style.height = H + 'px';
      faisceau.style.width = faisceau.style.height = 2 * R + 'px';
    };
    const repos = (t) => { const s = t / 1000; return L < 700 ? { x: L * (.5 + .32 * Math.sin(s / 3.7)), y: H * (.2 + .1 * Math.sin(s / 2.6)) } : { x: L * (.6 + .24 * Math.sin(s / 4.3)), y: H * (.48 + .3 * Math.sin(s / 3.1)) }; };
    const poser = () => {
      halo.style.transform = `translate3d(${x}px,${y}px,0)`;
      faisceau.style.transform = `translate3d(${x - R}px,${y - R}px,0)`;
      clair.style.transform = `translate3d(${R - x}px,${R - y}px,0)`;
      if (porte) { // le bord du verre accroche la même lumière
        const p = porte.getBoundingClientRect(), r = racine.getBoundingClientRect();
        porte.style.setProperty('--gx', (x + r.left - p.left).toFixed(0) + 'px'); porte.style.setProperty('--gy', (y + r.top - p.top).toFixed(0) + 'px');
      }
    };
    const pas = (t) => {
      const but = cible || repos(t - t0);
      x += (but.x - x) * .1; y += (but.y - y) * .1; poser();
      tourne = visible && !document.hidden;
      if (tourne) requestAnimationFrame(pas);
    };
    const relancer = () => { if (!tourne && !CALME && visible && !document.hidden) { tourne = true; requestAnimationFrame(pas); } };
    mesurer(); const d = repos(0); x = d.x; y = d.y; poser();
    if (CALME) { x = L * .62; y = H * .42; poser(); }
    else {
      relancer();
      if (SURVOL) {
        hote.addEventListener('pointermove', (e) => { const r = racine.getBoundingClientRect(); cible = { x: e.clientX - r.left, y: e.clientY - r.top }; });
        hote.addEventListener('pointerleave', () => { cible = null; });
      }
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; relancer(); }).observe(racine);
      document.addEventListener('visibilitychange', relancer);
    }
    let attente; addEventListener('resize', () => { clearTimeout(attente); attente = setTimeout(() => { mesurer(); poser(); }, 150); });
    if (document.fonts) document.fonts.ready.then(() => { mesurer(); poser(); });
    // l'allumage ne se joue qu'une fois par visite
    let vu = false; try { vu = sessionStorage.getItem('lumi-allumage') === '1'; sessionStorage.setItem('lumi-allumage', '1'); } catch (e) {}
    if (!vu && !CALME) racine.classList.add('allumage');
  }

  /* ---------- reflet sous la souris, sur les cartes ---------- */
  function reflets(zone, selecteur) {
    if (!zone || CALME || !SURVOL) return;
    zone.addEventListener('pointermove', (e) => {
      const c = e.target.closest(selecteur); if (!c) return;
      const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      c.style.setProperty('--mx', (px * 100).toFixed(1) + '%'); c.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      if (c.classList.contains('carte')) { c.style.setProperty('--ry', ((px - .5) * 5).toFixed(2) + 'deg'); c.style.setProperty('--rx', ((.5 - py) * 5).toFixed(2) + 'deg'); }
    });
    zone.addEventListener('pointerout', (e) => {
      const c = e.target.closest(selecteur); if (!c || c.contains(e.relatedTarget)) return;
      c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg');
    });
  }

  /* ---------- la pastille de navigation glisse d'un onglet à l'autre ---------- */
  function pastille(nav) {
    if (!nav) return () => {};
    const p = document.createElement('span'); p.className = 'l-pilule'; p.setAttribute('aria-hidden', 'true'); nav.prepend(p);
    let pret = false;
    const placer = () => {
      const a = nav.querySelector('[aria-current="page"]');
      if (!a || !nav.offsetWidth) { p.style.opacity = '0'; return; }
      if (!pret) p.style.transition = 'none';
      p.style.opacity = '1';
      p.style.clipPath = `inset(${a.offsetTop}px ${nav.clientWidth - a.offsetLeft - a.offsetWidth}px ${nav.offsetHeight - a.offsetTop - a.offsetHeight}px ${a.offsetLeft}px round 8px)`;
      if (!pret) { p.getBoundingClientRect(); p.style.transition = ''; pret = true; }
    };
    addEventListener('resize', placer);
    if (document.fonts) document.fonts.ready.then(placer);
    return placer;
  }

  /* ---------- un déplacement dans une liste se voit (sauf au clavier, où il doit être immédiat) ---------- */
  function deplacer(liste, cle, changer, anime) {
    if (CALME || !anime) return changer();
    const avant = new Map([...liste.children].map(el => [el.dataset[cle], el.getBoundingClientRect().top]));
    changer();
    [...liste.children].forEach(el => {
      const d = avant.has(el.dataset[cle]) ? avant.get(el.dataset[cle]) - el.getBoundingClientRect().top : null;
      if (d === null) { el.classList.add('arrive'); return; }
      if (!d) return;
      el.style.transition = 'none'; el.style.transform = `translateY(${d}px)`;
      el.getBoundingClientRect();
      el.style.transition = ''; el.style.transform = '';
    });
  }

  /* ---------- changement de vue : un fondu bref, jamais au clavier ni en mode calme ---------- */
  function transition(rendre, anime) {
    if (CALME || !anime || !document.startViewTransition) return rendre();
    try { return document.startViewTransition(rendre).updateCallbackDone; } catch (e) { return rendre(); }
  }

  return { CALME, SURVOL, lampe, reflets, pastille, deplacer, transition };
})();
