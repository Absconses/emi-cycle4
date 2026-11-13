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
    let attente = false, dernier = null, ecoutent = [], lusA = -1e4;
    const RELIEF = '.chaine, .mod, .outil, .carte-m', LUEUR = RELIEF + ', .bloc-m';
    const lacher = el => { if (el) { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); } };
    document.addEventListener('pointermove', e => {
      if (attente || calme()) return; attente = true;
      requestAnimationFrame(() => {
        attente = false;
        // la position du pointeur n'est donnée qu'aux quelques blocs qui s'en servent : posée sur la racine,
        // elle obligerait le navigateur à recalculer toute la page à chaque image
        const px = (e.clientX / innerWidth * 2 - 1).toFixed(3), py = (e.clientY / innerHeight * 2 - 1).toFixed(3);
        if (e.timeStamp - lusA > 800) { lusA = e.timeStamp; ecoutent = document.querySelectorAll('.ambiance, .lumieres, .triptyque, .mur, .verre-vif, .antenne-texte'); }
        for (const el of ecoutent) { el.style.setProperty('--px', px); el.style.setProperty('--py', py); }
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

  /* ---------- le son : le bouton de la barre, et les petits bruits de l'interface ---------- */
  const S = window.SON, bSon = document.getElementById('son');
  if (S && bSon) {
    const dire = () => { bSon.setAttribute('aria-pressed', S.actif()); bSon.classList.toggle('joue', S.actif()); };
    bSon.onclick = () => { S.regler(!S.actif()); if (S.actif()) S.jouer('jingle'); dire(); };
    document.addEventListener('son-change', dire); dire();
    const TOUCHE = 'a, button, summary, .carte-m, .mod, .ecran-mur';
    let sous = null;
    if (souris) document.addEventListener('pointerover', e => { const el = e.target.closest && e.target.closest(TOUCHE); if (el && el !== sous) S.jouer('survol'); sous = el; }, { passive: true });
    document.addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest(TOUCHE)) S.jouer('clic'); }, { passive: true });
    const palette0 = document.getElementById('palette');
    if (palette0) { document.getElementById('ouvrir-palette').addEventListener('click', () => S.jouer('ouvre')); palette0.addEventListener('close', () => S.jouer('ferme')); }
    // un module terminé : le tampon tombe, la rédaction applaudit
    const bravo = document.getElementById('bravo');
    if (bravo) new MutationObserver(() => { if (!bravo.hidden) { S.jouer('tampon', .12); S.jouer('jingle', .4); } }).observe(bravo, { attributes: true, attributeFilter: ['hidden'] });
    if (document.body.dataset.page !== 'accueil') S.jouer('souffle', .05);
  }

  /* ---------- la lentille : une goutte de verre glisse sous le lien survolé de la barre ---------- */
  (function lentille() {
    const nav = document.querySelector('.chaines-nav'); if (!nav) return;
    const goutte = document.createElement('span'); goutte.className = 'lentille'; goutte.setAttribute('aria-hidden', 'true'); nav.prepend(goutte);
    const ici = nav.querySelector('[aria-current="page"]');
    const poser = a => { if (!a) { goutte.style.setProperty('--lo', 0); return; } goutte.style.setProperty('--lx', a.offsetLeft + 'px'); goutte.style.setProperty('--lw', a.offsetWidth + 'px'); goutte.style.setProperty('--lo', 1); };
    nav.addEventListener('pointerover', e => { const a = e.target.closest('a'); if (a) poser(a); });
    nav.addEventListener('focusin', e => { const a = e.target.closest('a'); if (a) poser(a); });
    nav.addEventListener('pointerleave', () => poser(ici)); nav.addEventListener('focusout', () => poser(ici));
    addEventListener('resize', () => poser(ici)); (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => poser(ici)); poser(ici);
  })();

  /* ---------- la lumière : un halo suit le pointeur sous le verre, et allume le bord des tuiles voisines ---------- */
  if (souris) {
    const halo = document.createElement('div'); halo.className = 'aura'; halo.setAttribute('aria-hidden', 'true');
    (document.querySelector('.ambiance') || document.body.firstChild).after(halo);
    const TUILES = '.carte-m, .mod, .outil, .bloc-m, .chaine, .etape-m';
    let hx = innerWidth / 2, hy = innerHeight / 3, vx = hx, vy = hy, court = false, liste = [], vu = 0;
    function trame(ms) {
      if (calme()) { court = false; return; }
      hx += (vx - hx) * .14; hy += (vy - hy) * .14;
      halo.style.transform = `translate3d(${hx.toFixed(1)}px,${hy.toFixed(1)}px,0)`;
      if (ms - vu > 500) { vu = ms; liste = [...document.querySelectorAll(TUILES)]; }
      for (const el of liste) { const r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > innerHeight + 100) continue;
        const dx = Math.max(r.left - vx, 0, vx - r.right), dy = Math.max(r.top - vy, 0, vy - r.bottom);
        el.style.setProperty('--go', Math.max(0, 1 - Math.hypot(dx, dy) / 190).toFixed(2));
        el.style.setProperty('--gx', (vx - r.left).toFixed(0) + 'px'); el.style.setProperty('--gy', (vy - r.top).toFixed(0) + 'px'); }
      if (Math.abs(vx - hx) + Math.abs(vy - hy) > .4) requestAnimationFrame(trame); else court = false;
    }
    const lancer = () => { if (!court) { court = true; requestAnimationFrame(trame); } };
    addEventListener('pointermove', e => { vx = e.clientX; vy = e.clientY; lancer(); }, { passive: true });
    addEventListener('scroll', lancer, { passive: true });
  }

  /* ---------- le grand défilé : il accélère et se penche avec la vitesse de la page ---------- */
  (function defile() {
    let y0 = scrollY, vit = 0, tourne = false;
    function pas() {
      const geant = document.querySelector('.defile-geant'); if (!geant || calme()) { tourne = false; return; }
      vit += ((scrollY - y0) - vit) * .12; y0 = scrollY;
      const v = Math.max(-40, Math.min(40, vit));
      geant.style.setProperty('--penche', (v * -.35).toFixed(2) + 'deg');
      const anim = geant.firstElementChild.getAnimations()[0]; if (anim) anim.playbackRate = 1 + Math.abs(v) * .22;
      if (Math.abs(vit) > .05) requestAnimationFrame(pas); else { tourne = false; geant.style.setProperty('--penche', '0deg'); if (anim) anim.playbackRate = 1; }
    }
    addEventListener('scroll', () => { if (!tourne) { tourne = true; y0 = scrollY; requestAnimationFrame(pas); } }, { passive: true });
  })();

  /* ---------- le fond vivant : une lumière liquide calculée par la carte graphique ----------
   * Demi-définition et 30 images par seconde : assez pour un fond flou, léger pour un vieux poste.
   * Sans WebGL, ou en mode calme, on garde les halos en CSS. */
  (function fond() {
    const sonde = document.querySelector('.ambiance'); if (!sonde) return;
    const toile = document.createElement('canvas'); toile.className = 'ambiance-gl'; toile.setAttribute('aria-hidden', 'true');
    const gl = toile.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' }); if (!gl) return;
    const faire = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const vs = faire(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}');
    const fs = faire(gl.FRAGMENT_SHADER, `precision mediump float;uniform vec2 r;uniform float t;uniform vec2 m;uniform vec3 c;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
      float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
      void main(){vec2 uv=gl_FragCoord.xy/r;vec2 p=(gl_FragCoord.xy-.5*r)/r.y;vec2 d=p-m;float md=exp(-dot(d,d)*3.5);
        vec2 q=vec2(fbm(p*1.25+t*.09),fbm(p*1.25+vec2(5.2,1.3)-t*.075));
        float f=fbm(p*1.5+q*1.9+md*.7+t*.03);
        vec3 col=mix(vec3(.995,.945,.84),vec3(.972,.862,.66),smoothstep(.2,.72,f));
        col=mix(col,vec3(.95,.66,.47),smoothstep(.5,.93,f)*.5);
        float g=smoothstep(.4,.95,fbm(p*1.05-q*1.6+t*.03+3.));
        col=mix(col,c,g*g*.3+md*.1);
        float encre=smoothstep(.56,.98,fbm(p*.85+q*2.2-t*.025+11.));
        col=mix(col,vec3(0.,.004,.47),encre*.24);
        float braise=smoothstep(.66,.99,fbm(p*1.3-q*1.4+t*.02+27.));
        col=mix(col,vec3(.71,.29,.07),braise*.2);
        col*=1.-.12*dot(uv-.5,uv-.5);
        gl_FragColor=vec4(col,1.);}`);
    if (!vs || !fs) return;
    const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = n => gl.getUniformLocation(pr, n), ur = U('r'), ut = U('t'), um = U('m'), uc = U('c');
    sonde.after(toile);
    const taille = () => { toile.width = Math.max(2, Math.round(innerWidth * .5)); toile.height = Math.max(2, Math.round(innerHeight * .5)); gl.viewport(0, 0, toile.width, toile.height); };
    taille(); addEventListener('resize', taille);
    let mx = 0, my = 0, cx = 0, cy = 0, coul = [1, .48, .36], vise = coul, dernier = 0, lu = 0;
    addEventListener('pointermove', e => { mx = (e.clientX - innerWidth / 2) / innerHeight; my = (innerHeight / 2 - e.clientY) / innerHeight; }, { passive: true });
    function image(ms) {
      requestAnimationFrame(image);
      if (document.hidden || calme() || ms - dernier < 33) return;
      dernier = ms;
      if (ms - lu > 250) { lu = ms; const v = getComputedStyle(sonde).color.match(/[\d.]+/g); if (v) vise = v.slice(0, 3).map(x => x / 255); }
      coul = coul.map((x, i) => x + (vise[i] - x) * .05); cx += (mx - cx) * .06; cy += (my - cy) * .06;
      gl.uniform2f(ur, toile.width, toile.height); gl.uniform1f(ut, ms / 1000); gl.uniform2f(um, cx, cy); gl.uniform3f(uc, coul[0], coul[1], coul[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      toile.classList.add('pret');
    }
    requestAnimationFrame(image);
  })();

  /* ---------- le curseur qui annonce le geste : « Regarder », « Écouter », « Lire » ---------- */
  if (souris) {
    const c = document.createElement('div'); c.className = 'curseur'; c.setAttribute('aria-hidden', 'true'); document.body.appendChild(c);
    racine.classList.add('avec-curseur');
    let x = 0, y = 0, vx = 0, vy = 0, actif = false;
    const MOTS = { emission: 'Regarder', podcast: 'Écouter', gazette: 'Lire' };
    document.addEventListener('pointermove', e => {
      vx = e.clientX; vy = e.clientY;
      const el = e.target.closest && e.target.closest('.carte-m, .ecran-mur.actif, .mod');
      if (el) { const t = ['emission', 'podcast', 'gazette'].find(k => el.classList.contains('c-' + k) || el.classList.contains('f-' + k));
        c.textContent = t ? MOTS[t] : 'Ouvrir'; }
      c.classList.toggle('geste-on', !!el);
      if (!actif) { actif = true; x = vx; y = vy; requestAnimationFrame(suivre); }
    }, { passive: true });
    addEventListener('pointerdown', () => c.classList.add('presse')); addEventListener('pointerup', () => c.classList.remove('presse'));
    document.addEventListener('pointerleave', () => c.classList.remove('geste-on'));
    addEventListener('scroll', () => c.classList.remove('geste-on'), { passive: true });
    function suivre() { x += (vx - x) * .22; y += (vy - y) * .22; c.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      if (Math.abs(vx - x) + Math.abs(vy - y) > .3) requestAnimationFrame(suivre); else actif = false; }
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
  async function ouvrir(auClavier) { if (!palette || palette.open) return; palette.classList.toggle('instant', auClavier === true); palette.showModal(); champ.value = ''; choix = 0; await preparer(); montrer(); champ.focus(); }
  if (palette) {
    document.getElementById('ouvrir-palette').onclick = () => ouvrir(false);
    addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ouvrir(true); } });
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
