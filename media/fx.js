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
        vec2 q=vec2(fbm(p*1.25+t*.06),fbm(p*1.25+vec2(5.2,1.3)-t*.05));
        float f=fbm(p*1.5+q*1.9+md*.7+t*.03);
        vec3 col=mix(vec3(.995,.945,.84),vec3(.975,.885,.72),smoothstep(.2,.72,f));
        col=mix(col,vec3(.955,.74,.56),smoothstep(.55,.95,f)*.38);
        float g=smoothstep(.38,.95,fbm(p*1.05-q*1.6+t*.025+3.));
        col=mix(col,c,g*g*.17+md*.05);
        col*=1.-.1*dot(uv-.5,uv-.5);
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
        c.textContent = t ? MOTS[t] : 'Ouvrir'; c.style.background = t ? `var(--${t === 'emission' ? 'corail' : t === 'podcast' ? 'jaune' : 'bleu'})` : 'var(--menthe)'; }
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
