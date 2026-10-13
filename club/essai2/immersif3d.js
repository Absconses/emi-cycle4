/* Essai n° 2 : la fabrication du journal, en vraie 3D (Three.js r170 + GSAP 3.12 + ScrollTrigger + Lenis).
 * Scène 1, la rotative : une presse en métal marine imprime la une, qui sort d'entre les rouleaux puis vient vers l'élève.
 * Scène 3, la salle de séchage : les modules sont des pages pendues à deux fils par des pinces ; on marche le long
 * des fils en descendant, les pages battent quand on défile vite, la fiche du module en face s'affiche en bas.
 * Repli : sans WebGL matériel (PC sans carte graphique), la rotative et le couloir en CSS de l'essai n° 1 ;
 * appareil réglé sur « animations réduites » : la page simple, sauf si l'élève réactive les animations. */
const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
const PAPIER = '#f3e3c4', MARINE = '#000177', ROUILLE = '#b44a12', OR = '#e9b85a', ENCRE = '#161b45';
const borne = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const amortir = (k, dt) => 1 - Math.pow(1 - k, dt * 60);

function webglMateriel() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const r = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
    return !/SwiftShader|Software|llvmpipe/i.test(r);
  } catch (e) { return false; }
}
const delai = (ms) => new Promise((_, non) => setTimeout(() => non(new Error('délai')), ms));

async function lancer() {
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  let choix = null; try { choix = localStorage.getItem('club-animations'); } catch (e) {}
  const reduitAuDepart = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const calmeAuDepart = choix === 'non' || (reduitAuDepart && choix !== 'oui');
  const force = /[?&]webgl\b/.test(location.search);
  let T = null, RE = null;
  if (!calmeAuDepart && (force || webglMateriel())) {
    try {
      [T, RE] = await Promise.race([Promise.all([import('three'), import('three/addons/environments/RoomEnvironment.js')]), delai(9000)]);
      await Promise.race([Promise.all(['400 92px Federo', '400 50px "Bree Serif"', '400 28px "Atkinson Hyperlegible"', '700 28px "Atkinson Hyperlegible"'].map(f => document.fonts.load(f))), delai(4000)]).catch(() => {});
    } catch (e) { T = null; }
  }
  const bouton = document.getElementById('bouton-anim');
  const html = document.documentElement;
  const mm = gsap.matchMedia();
  mm.add({ tous: 'all', reduit: '(prefers-reduced-motion: reduce)' }, (ctx) => {
    const calme = choix === 'non' || (ctx.conditions.reduit && choix !== 'oui');
    if (bouton) {
      bouton.hidden = false;
      bouton.setAttribute('aria-pressed', String(!calme));
      bouton.textContent = calme ? '✦ Activer les animations' : '✦ Couper les animations';
      bouton.onclick = () => { try { localStorage.setItem('club-animations', calme ? 'oui' : 'non'); } catch (e) {} location.reload(); };
    }
    if (calme) return;
    html.classList.add('immersif');
    const lenis = lisser();
    const M = T ? moteur(T, RE) : null;
    if (M) { html.classList.add('webgl'); rotative3d(M, lenis); } else rotativeCSS(lenis);
    ouverture();
    tampons();
    if (M) sechage(M, lenis); else couloir(lenis);
    apparitions('.bilan, .ours');
    ScrollTrigger.refresh();
  });
  addEventListener('load', () => ScrollTrigger.refresh());
}

function lisser() {
  if (!window.Lenis) return null;
  const lenis = new Lenis({ lerp: 0.1, anchors: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}
const allerA = (lenis, cible) => lenis ? lenis.scrollTo(cible, { duration: 1.4 }) : (typeof cible === 'number' ? scrollTo({ top: cible, behavior: 'smooth' }) : document.querySelector(cible).scrollIntoView({ behavior: 'smooth' }));

/* ---------------------------------------------------------------- le moteur 3D (une seule toile) */
function moteur(T, RE) {
  const toile = document.getElementById('webgl');
  toile.hidden = false;
  const rendu = new T.WebGLRenderer({ canvas: toile, antialias: true, powerPreference: 'high-performance' });
  rendu.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 900 ? 1.25 : 1.5));
  rendu.outputColorSpace = T.SRGBColorSpace;
  rendu.toneMapping = T.ACESFilmicToneMapping;
  rendu.toneMappingExposure = 1.15;
  rendu.shadowMap.enabled = true;
  rendu.shadowMap.type = T.PCFSoftShadowMap;
  rendu.localClippingEnabled = true;
  const pm = new T.PMREMGenerator(rendu);
  const env = pm.fromScene(new RE.RoomEnvironment(), 0.04).texture;
  pm.dispose();
  let actif = null;
  const M = {
    T, rendu, env, toile,
    souris: { x: 0, y: 0 },
    // la toile se pose dans la section de la scène qui joue
    monter(sec, sc) { if (toile.parentElement !== sec) sec.prepend(toile); actif = sc; M.taille(); },
    quitter(sc) { if (actif === sc) actif = null; },
    taille() {
      if (!actif) return;
      const w = toile.parentElement.clientWidth, h = toile.parentElement.clientHeight;
      rendu.setSize(w, h, false);
      actif.camera.aspect = w / h; actif.camera.updateProjectionMatrix();
      if (actif.cadrer) actif.cadrer(w, h);
    },
    // la scène commune : lumière du jour, fond papier, ombres au sol
    scene() {
      const s = new T.Scene();
      s.background = new T.Color(PAPIER);
      s.environment = env;
      s.add(new T.HemisphereLight(0xfff4e0, 0x9c8a6a, 0.7));
      const soleil = new T.DirectionalLight(0xffe9c8, 2.4);
      soleil.position.set(4.5, 7, 6);
      soleil.castShadow = true;
      soleil.shadow.mapSize.set(1024, 1024);
      Object.assign(soleil.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.5, far: 40 });
      soleil.shadow.bias = -0.0004; soleil.shadow.radius = 6;
      s.add(soleil, soleil.target);
      return { s, soleil };
    },
  };
  addEventListener('resize', () => M.taille());
  // auteur-allow: POINTER_NO_RAF -- la souris n'écrit que deux nombres, lus par la boucle de rendu GSAP à son rythme
  addEventListener('pointermove', (e) => { M.souris.x = e.clientX / innerWidth * 2 - 1; M.souris.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  gsap.ticker.add((t, dms) => {
    if (!actif) return;
    actif.maj(t, Math.min(dms, 250) / 1000);
    rendu.render(actif.scene, actif.camera);
  });
  return M;
}

// la toile ne travaille que quand sa scène est à l'écran
function surveiller(M, sec, sc, trig) {
  ScrollTrigger.create({
    trigger: trig, start: 'top bottom', end: 'bottom top',
    onToggle: (st) => st.isActive ? M.monter(sec, sc) : M.quitter(sc),
  });
}

/* ---------------------------------------------------------------- textures dessinées (photos créditées du site) */
const images = {};
const charger = (src) => images[src] || (images[src] = new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; }));
function couvrir(c, img, x, y, w, h) {
  if (!img) { c.fillStyle = '#d9cbb0'; c.fillRect(x, y, w, h); return; }
  const r = Math.max(w / img.width, h / img.height), sw = w / r, sh = h / r;
  c.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}
function ecrire(c, txt, x, y, l, lh, max) {
  const mots = String(txt).split(/\s+/); let ligne = '', n = 0;
  for (const m of mots) {
    const essai = ligne ? ligne + ' ' + m : m;
    if (c.measureText(essai).width > l && ligne) {
      if (++n === max) { c.fillText(ligne + ' …', x, y); return y + lh; }
      c.fillText(ligne, x, y); y += lh; ligne = m;
    } else ligne = essai;
  }
  if (ligne) { c.fillText(ligne, x, y); y += lh; }
  return y;
}
function colonnes(c, x, y, w, yMax) {
  c.fillStyle = 'rgba(22, 27, 69, .16)';
  for (let k = 0; y + 12 < yMax; k++, y += 24) c.fillRect(x, y, k % 5 === 4 ? w * 0.6 : w, 9);
}
function papier(w, h) {
  const t = document.createElement('canvas'); t.width = w; t.height = h;
  const c = t.getContext('2d');
  c.fillStyle = '#fdf0d6'; c.fillRect(0, 0, w, h);
  c.textBaseline = 'alphabetic';
  return { t, c };
}
function tampon(c, txt, x, y, coul, rot) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.strokeStyle = coul; c.fillStyle = coul; c.lineWidth = 6; c.globalAlpha = 0.85;
  c.font = '700 34px "Atkinson Hyperlegible"';
  const w = c.measureText(txt).width + 40;
  c.strokeRect(-w / 2, -32, w, 60); c.textAlign = 'center'; c.fillText(txt.toUpperCase(), 0, 10);
  c.restore();
}
async function textureUne(T) {
  const { t, c } = papier(1024, 1400);
  const [sigle, ...photos] = await Promise.all(['img/sigle-dupanloup.png', 'img/college-1.jpg', 'img/college-2.jpg', 'img/college-3.jpg'].map(charger));
  if (sigle) c.drawImage(sigle, 56, 46, 120, 120);
  c.fillStyle = ROUILLE; c.font = '400 36px "Bree Serif"'; c.fillText('Le Club', 200, 82);
  c.fillStyle = MARINE; c.font = '400 98px Federo'; c.fillText('Jeune Reporter', 196, 168);
  c.fillStyle = OR; c.fillRect(56, 196, 912, 9); c.fillStyle = MARINE; c.fillRect(56, 212, 912, 2);
  const lw = (912 - 24) / 3;
  photos.forEach((p, i) => couvrir(c, p, 56 + i * (lw + 12), 236, lw, 560));
  c.fillStyle = MARINE; c.font = '400 60px "Bree Serif"';
  const y = ecrire(c, 'Ta carte de presse se gagne module après module', 56, 880, 912, 66, 2);
  colonnes(c, 56, y + 6, 440, 1360); colonnes(c, 528, y + 6, 440, 1360);
  return toTexture(T, t);
}
async function texturePage(T, el) {
  const { t, c } = papier(768, 1024);
  if (el.classList.contains('panneau')) return texturePanneau(T, el);
  const num = el.dataset.num, titre = el.querySelector('h3').textContent.trim(), chapo = (el.querySelector('.chapo') || {}).textContent || '';
  const img = await charger(el.querySelector('.vignette img').getAttribute('src'));
  c.fillStyle = MARINE; c.font = '400 30px "Bree Serif"'; c.fillText('Le Jeune Reporter', 44, 62);
  c.fillStyle = ROUILLE; c.textAlign = 'right'; c.fillText('Module ' + num, 724, 62); c.textAlign = 'left';
  c.fillStyle = OR; c.fillRect(44, 80, 680, 6); c.fillStyle = MARINE; c.fillRect(44, 92, 680, 2);
  couvrir(c, img, 44, 116, 680, 420);
  c.fillStyle = MARINE; c.fillRect(44, 116, 86, 92);
  c.fillStyle = '#fff'; c.font = '400 70px Federo'; c.textAlign = 'center'; c.fillText(num, 87, 186); c.textAlign = 'left';
  c.fillStyle = MARINE; c.font = '400 54px "Bree Serif"';
  let y = ecrire(c, titre, 44, 610, 680, 60, 2);
  c.fillStyle = '#3e4266'; c.font = '400 29px "Atkinson Hyperlegible"';
  y = ecrire(c, chapo, 44, y + 10, 680, 38, 3);
  colonnes(c, 44, y + 10, 680, 990);
  if (!el.classList.contains('pret')) tampon(c, 'En préparation', 520, 470, MARINE, -0.12);
  else if (el.querySelector('.tampon.vert')) tampon(c, 'Badge obtenu', 540, 470, '#1f6b45', -0.14);
  return toTexture(T, t);
}
function texturePanneau(T, el) {
  const fin = el.classList.contains('fin');
  const t = document.createElement('canvas'); t.width = 1024; t.height = 640;
  const c = t.getContext('2d');
  c.fillStyle = fin ? '#fbf4e4' : MARINE; c.fillRect(0, 0, 1024, 640);
  c.strokeStyle = OR; c.lineWidth = 10; c.strokeRect(26, 26, 972, 588);
  c.fillStyle = fin ? '#f2a477' : OR; c.font = '400 400px Federo'; c.fillText(el.querySelector('.lettre').textContent, 70, 470);
  c.fillStyle = fin ? MARINE : '#fcecd0'; c.font = '400 66px "Bree Serif"';
  const y = ecrire(c, el.querySelector('h3').textContent, 400, 260, 560, 74, 3);
  c.fillStyle = fin ? '#3e4266' : 'rgba(252, 236, 208, .85)'; c.font = '400 32px "Atkinson Hyperlegible"';
  ecrire(c, el.querySelector('p').textContent, 400, y + 16, 560, 42, 3);
  return toTexture(T, t);
}
function toTexture(T, t) {
  const tx = new T.CanvasTexture(t);
  tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 4;
  return tx;
}
// une feuille de papier accrochée par son bord haut, qui ondule et prend le vent
function feuille(T, map, w, h, phase) {
  const g = new T.PlaneGeometry(w, h, 20, 28); g.translate(0, -h / 2, 0);
  const u = { uT: { value: 0 }, uVent: { value: 0 }, uH: { value: h }, uPh: { value: phase } };
  const mat = new T.MeshStandardMaterial({ map, roughness: 0.82, metalness: 0, side: T.DoubleSide, envMapIntensity: 0.35 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'uniform float uT, uVent, uH, uPh;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float d = clamp(-position.y / uH, 0.0, 1.0);
      transformed.z += sin(position.x * 1.9 + uT * 1.4 + uPh) * 0.045 * d + sin(position.y * 2.3 + uT * 2.1 + uPh) * 0.03 * d
                     + uVent * d * d * 0.55 + sin(position.x * 3.1 + uT * 5.0) * uVent * 0.08 * d;`);
  };
  const m = new T.Mesh(g, mat);
  m.castShadow = true;
  m.userData.u = u;
  return m;
}
function sol(T, s, y) {
  const f = new T.Mesh(new T.PlaneGeometry(80, 80), new T.ShadowMaterial({ opacity: 0.16 }));
  f.rotation.x = -Math.PI / 2; f.position.y = y; f.receiveShadow = true; s.add(f);
}
function poussiere(T, s, n, box) {
  const g = new T.BufferGeometry(), p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { p[i * 3] = (Math.random() - .5) * box[0]; p[i * 3 + 1] = (Math.random() - .5) * box[1] + box[3]; p[i * 3 + 2] = (Math.random() - .5) * box[2] + box[4]; }
  g.setAttribute('position', new T.BufferAttribute(p, 3));
  const pts = new T.Points(g, new T.PointsMaterial({ color: 0xc89a4a, size: 0.025, transparent: true, opacity: 0.55, depthWrite: false }));
  s.add(pts);
  return pts;
}

/* ---------------------------------------------------------------- scène 1 : la rotative */
function rotative3d(M, lenis) {
  const T = M.T;
  const sec = document.getElementById('rotative');
  sec.hidden = false;
  const scene = sec.querySelector('.rot-scene');
  sec.querySelector('.rot-passer').addEventListener('click', (e) => { e.preventDefault(); allerA(lenis, '#debut'); });
  const tirage = document.getElementById('tirage');
  const { s } = M.scene();
  s.fog = new T.Fog(PAPIER, 14, 34);
  const cam = new T.PerspectiveCamera(35, 1, 0.1, 80);
  const NIP = 2.4;
  // la presse : deux rouleaux d'impression, deux rouleaux encreurs, les flasques
  const metal = new T.MeshStandardMaterial({ color: 0x18206e, metalness: 0.75, roughness: 0.28 });
  const acier = new T.MeshStandardMaterial({ color: 0xc9ccd8, metalness: 1, roughness: 0.22 });
  const laiton = new T.MeshStandardMaterial({ color: 0xd2a24c, metalness: 1, roughness: 0.3 });
  const presse = new T.Group(); s.add(presse);
  const rouleau = (r, y, z, mat) => {
    const g = new T.Group();
    const cyl = new T.Mesh(new T.CylinderGeometry(r, r, 5.0, 64, 1), mat); cyl.rotation.z = Math.PI / 2; cyl.castShadow = cyl.receiveShadow = true;
    const bague = new T.Mesh(new T.TorusGeometry(r * 1.01, 0.035, 12, 64), laiton);
    [-2.3, 2.3].forEach(x => { const b = bague.clone(); b.rotation.y = Math.PI / 2; b.position.x = x; g.add(b); });
    // des stries pour voir le rouleau tourner
    for (let k = 0; k < 6; k++) { const st = new T.Mesh(new T.BoxGeometry(4.98, 0.03, 0.02), acier); const a = k / 6 * Math.PI * 2; st.position.set(0, Math.cos(a) * r, Math.sin(a) * r); g.add(st); }
    g.add(cyl); g.position.set(0, y, z); presse.add(g); return g;
  };
  const r1 = rouleau(0.5, NIP + 0.5, 0, metal), r2 = rouleau(0.5, NIP - 0.5, 0, metal);
  const e1 = rouleau(0.28, NIP + 1.3, -0.5, acier), e2 = rouleau(0.28, NIP - 1.25, -0.5, acier);
  [-2.75, 2.75].forEach(x => {
    const pied = new T.Mesh(new T.BoxGeometry(0.18, NIP + 1.5, 0.3), metal); pied.position.set(x, (NIP - 1.5 - 3) / 2, -0.7); pied.castShadow = true; presse.add(pied);
    const f = new T.Mesh(new T.BoxGeometry(0.24, 3.2, 1.5), metal); f.position.set(x, NIP, -0.2); f.castShadow = f.receiveShadow = true; presse.add(f);
    const v = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 0.12, 32), laiton); v.rotation.z = Math.PI / 2; v.position.set(x + Math.sign(x) * 0.18, NIP + 0.5, 0); presse.add(v);
  });
  sol(T, s, -3);
  // la une : elle sort de la presse, le haut est caché par les rouleaux
  const W = 3.0, H = 4.1;
  const coupe = new T.Plane(new T.Vector3(0, -1, 0), NIP);
  let une = null;
  textureUne(T).then((tx) => {
    une = feuille(T, tx, W, H, 0.4);
    une.material.clippingPlanes = [coupe];
    une.position.set(0, NIP + H, 0.02);
    s.add(une);
  });
  const pous = poussiere(T, s, innerWidth < 900 ? 120 : 260, [10, 6, 6, 1, 1]);
  const etat = { cible: 0, p: 0, mx: 0, my: 0 };
  const sc = {
    scene: s, camera: cam,
    cadrer(w, h) { const portrait = h > w; cam.fov = portrait ? 52 : 35; cam.updateProjectionMatrix(); etat.recul = portrait ? 12 : 12.5; etat.px = portrait ? 0 : 1.8; etat.vy = portrait ? 1.9 : 0.8; presse.position.x = etat.px; },
    maj(t, dt) {
      etat.p += (etat.cible - etat.p) * amortir(0.08, dt);
      etat.mx += (M.souris.x - etat.mx) * amortir(0.05, dt); etat.my += (M.souris.y - etat.my) * amortir(0.05, dt);
      const p1 = borne(etat.p / 0.55), p2 = borne((etat.p - 0.6) / 0.4);
      const e = p1 * p1 * (3 - 2 * p1);
      r1.rotation.x = -e * 9; r2.rotation.x = e * 9; e1.rotation.x = e * 14; e2.rotation.x = -e * 14;
      const recul = etat.recul || 12.5, px = etat.px || 0, vy = etat.vy || 0.8;
      cam.position.set(px * 0.35 + etat.mx * 0.6, vy - etat.my * 0.3, recul - p2 * 1.5);
      cam.lookAt(px * 0.35, vy, 0);
      if (une) {
        // phase 1 : la page descend d'entre les rouleaux ; phase 2 : elle se détache et file vers l'élève
        const u = une.userData.u; u.uT.value = t;
        const q = p2 * p2;
        une.position.set(px * (1 - q * 0.65), NIP + (1 - e) * H + q * (vy + H * 0.5 - NIP), 0.02 + q * (recul - 4.5));
        une.rotation.x = -0.06 * (1 - q) + q * -0.25;
        une.rotation.z = q * 0.12;
        u.uVent.value = 0.1 * Math.sin(t * 0.7) * (1 - q) + q * 0.6;
        une.material.clippingPlanes = p2 > 0 ? [] : [coupe];
      }
      pous.rotation.y = t * 0.02; pous.position.y = Math.sin(t * 0.3) * 0.1;
    },
  };
  // le compteur et les textes
  const n = { v: 0 };
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.rot-titre span', { yPercent: 60, autoAlpha: 0, duration: .8, stagger: .12 })
    .from('.rot-tirage, .rot-passer', { autoAlpha: 0, duration: .6 }, '-=.3');
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: sec, start: 'top top', end: '+=220%', pin: true, scrub: .6, anticipatePin: 1,
      onUpdate: (st) => { etat.cible = st.progress; } },
  });
  tl.to(n, { v: 1250, duration: .55, onUpdate: () => { tirage.textContent = Math.round(n.v).toLocaleString('fr-FR'); } }, 0)
    .to('.rot-titre, .rot-tirage, .rot-passer', { y: -40, autoAlpha: 0, duration: .25, stagger: .03 }, .6)
    .to({}, { duration: .2 }, .8);
  scene.style.background = PAPIER;
  surveiller(M, scene, sc, sec.parentElement);
  M.monter(scene, sc);
}

// repli sans WebGL : la rotative en CSS de l'essai n° 1
function rotativeCSS(lenis) {
  const sec = document.getElementById('rotative');
  sec.hidden = false;
  sec.querySelector('.rot-passer').addEventListener('click', (e) => { e.preventDefault(); allerA(lenis, '#debut'); });
  const tirage = document.getElementById('tirage');
  const n = { v: 0 };
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.rot-titre span', { yPercent: 80, autoAlpha: 0, duration: .8, stagger: .14 })
    .from('.rouleau', { scaleX: 0.95, autoAlpha: 0, duration: .9, stagger: .1 }, '<')
    .from('.rot-tirage, .rot-passer', { autoAlpha: 0, duration: .6 }, '-=.3');
  gsap.set('.rouleau', { backgroundPosition: '0px 0px, 0px 0px' });
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: sec, start: 'top top', end: '+=220%', pin: true, scrub: .6, anticipatePin: 1 } })
    .to('.rouleau.r1', { backgroundPosition: '960px 0px, 0px 0px', duration: 1.2 }, 0)
    .to('.rouleau.r2', { backgroundPosition: '-960px 0px, 0px 0px', duration: 1.2 }, 0)
    .fromTo('.feuille', { yPercent: -150, rotationX: -75, scale: .62, autoAlpha: 0 }, { yPercent: 0, rotationX: 0, scale: 1, autoAlpha: 1, duration: 1, ease: 'power2.out' }, 0)
    .to(n, { v: 1250, duration: 1, onUpdate: () => { tirage.textContent = Math.round(n.v).toLocaleString('fr-FR'); } }, 0)
    .to('.rot-titre, .rot-tirage, .rot-passer', { y: -50, autoAlpha: 0, duration: .45, stagger: .04 }, 1.1)
    .to('.rouleau.r1', { y: () => '-=' + innerHeight * .4, duration: .7, ease: 'power2.in' }, 1.15)
    .to('.rouleau.r2', { y: () => '+=' + innerHeight * .4, duration: .7, ease: 'power2.in' }, 1.15)
    .to('.feuille', { scale: 2.8, rotationX: 8, autoAlpha: 0, duration: .75, ease: 'power2.in' }, 1.2);
}

/* ---------------------------------------------------------------- scène 2 : la manchette s'imprime */
function ouverture() {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, scrollTrigger: { trigger: '.manchette', start: 'top 80%', once: true } });
  tl.from('.tete-journal .sigle', { rotation: -200, scale: 1.6, autoAlpha: 0, duration: .9, ease: 'back.out(1.5)' })
    .from('.titre-journal .le', { y: -14, autoAlpha: 0, duration: .4 }, '-=.45')
    .from('.titre-journal .nom .mot > span', { yPercent: -70, autoAlpha: 0, rotation: () => gsap.utils.random(-16, 16), duration: .55, stagger: .035, ease: 'back.out(2)' }, '<')
    .fromTo('.titre-journal .nom', { '--souligne': 0 }, { '--souligne': 1, duration: .6, ease: 'power2.inOut' }, '-=.2')
    .from('.devise, .tete-journal .vertical, .rubriques', { y: 12, autoAlpha: 0, duration: .5, stagger: .08 }, '-=.35')
    .from('.triptyque img', { y: 50, autoAlpha: 0, duration: .9, stagger: .12 }, '-=.5')
    .from('.tampon-une', { scale: 1.8, rotation: -30, autoAlpha: 0, duration: .45, ease: 'back.out(1.4)' }, '-=.2')
    .from('.edito > *', { y: 20, autoAlpha: 0, duration: .6, stagger: .06 }, .55);
}
function tampons() {
  const t = gsap.utils.toArray('.case.faite .t');
  if (!t.length) return;
  t.forEach(c => gsap.set(c, { rotation: parseFloat(getComputedStyle(c).getPropertyValue('--r')) || -12 }));
  gsap.from(t, { scale: 2.2, autoAlpha: 0, duration: .4, stagger: .16, ease: 'back.out(1.6)', scrollTrigger: { trigger: '#carte-presse', start: 'top 85%', once: true } });
}
function apparitions(sel) {
  const el = gsap.utils.toArray(sel);
  gsap.set(el, { y: 30, autoAlpha: 0 });
  ScrollTrigger.batch(el, { start: 'top 90%', once: true, onEnter: (b) => gsap.to(b, { y: 0, autoAlpha: 1, duration: .7, stagger: .08, ease: 'power3.out', overwrite: true }) });
}

/* ---------------------------------------------------------------- scène 3 : la salle de séchage */
function sechage(M, lenis) {
  const T = M.T, html = document.documentElement;
  html.classList.add('sechage');
  const sec = document.getElementById('parcours');
  const piste = document.getElementById('piste');
  const items = [...piste.children];
  const etapes = [...document.querySelectorAll('.route .etape')];
  const barre = document.querySelector('.barre-route i');
  const { s } = M.scene();
  s.fog = new T.Fog(PAPIER, 7, 24);
  const cam = new T.PerspectiveCamera(40, 1, 0.1, 80);
  const S = 3.4, FIL = 2.25, LAT = 1.6, VUE = 4.4;
  const fil = new T.MeshStandardMaterial({ color: 0x3b3a40, roughness: 0.6 });
  const bois = new T.MeshStandardMaterial({ color: 0xc8995c, roughness: 0.55 });
  const long = items.length * S + 12;
  [-LAT, LAT].forEach(x => { const f = new T.Mesh(new T.CylinderGeometry(0.009, 0.009, long, 6), fil); f.rotation.x = Math.PI / 2; f.position.set(x, FIL, -long / 2 + 6); s.add(f); });
  sol(T, s, -1.6);
  const pince = (x, y, z) => { const p = new T.Mesh(new T.BoxGeometry(0.06, 0.24, 0.07), bois); p.position.set(x, y - 0.05, z); p.castShadow = true; s.add(p); };
  // chaque article pend à un fil, en alternance ; les panneaux A, B, C pendent au milieu d'un fil tendu en travers
  let cote = 1;
  const pages = items.map((el, i) => {
    const z = -i * S, panneau = el.classList.contains('panneau');
    const w = panneau ? 2.5 : 1.7, h = panneau ? 1.56 : 2.27;
    const x = panneau ? 0 : (cote = -cote) * LAT;
    const y0 = panneau ? FIL + 1.5 : FIL;
    const m = new T.Group(); m.position.set(x, y0, z); s.add(m);
    if (panneau) {
      const f = new T.Mesh(new T.CylinderGeometry(0.009, 0.009, LAT * 2.6, 6), fil); f.rotation.z = Math.PI / 2; f.position.set(0, y0, z); s.add(f);
      pince(-0.9, y0, z); pince(0.9, y0, z);
    } else { pince(x - 0.6, FIL, z); pince(x + 0.6, FIL, z); }
    const p = { el, m, i, x, z, panneau, w, h, feuille: null, survol: 0, lien: (el.querySelector('h3 a') || el.querySelector('a.cta') || {}).href };
    // les pages tournent un peu vers l'allée
    m.rotation.y = panneau ? 0 : -Math.sign(x) * 0.42;
    texturePage(T, el).then((tx) => { p.feuille = feuille(T, tx, w, h, i * 1.7); p.feuille.userData.page = p; m.add(p.feuille); });
    return p;
  });
  const pous = poussiere(T, s, innerWidth < 900 ? 140 : 320, [8, 4, items.length * S, 1, -items.length * S / 2]);
  const etat = { cible: 0, p: 0, mx: 0, my: 0, vent: 0, lx: 0 };
  let actif = -1;
  const choisir = (idx) => {
    if (idx === actif) return;
    actif = idx;
    items.forEach((el, i) => el.classList.toggle('actif', i === idx));
    piste.classList.toggle('droite', !!(pages[idx] && pages[idx].x < 0));
    const num = items[idx] && items[idx].classList.contains('article') ? items[idx].dataset.num : null;
    etapes.forEach(e => e.classList.toggle('ici', e.dataset.num === num));
  };
  // viser une page avec la souris : elle se tourne vers l'élève ; un clic l'ouvre
  const visee = new T.Raycaster(), pt = new T.Vector2();
  let survolee = null;
  const viser = (e) => {
    const r = M.toile.getBoundingClientRect();
    pt.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    visee.setFromCamera(pt, cam);
    const hit = visee.intersectObjects(pages.filter(p => p.feuille && !p.panneau).map(p => p.feuille))[0];
    survolee = hit && hit.distance < 9 ? hit.object.userData.page : null;
    M.toile.classList.toggle('main', !!(survolee && survolee.el.classList.contains('pret')));
  };
  let enAttente = null;
  M.toile.addEventListener('pointermove', (e) => { enAttente = e; }, { passive: true });
  M.toile.addEventListener('click', (e) => { viser(e); if (survolee && survolee.el.classList.contains('pret') && survolee.lien) location.href = survolee.lien; });
  const sc = {
    scene: s, camera: cam,
    cadrer(w, h) { cam.fov = h > w ? 58 : 40; cam.updateProjectionMatrix(); etat.portrait = h > w; },
    maj(t, dt) {
      if (enAttente) { viser(enAttente); enAttente = null; }
      etat.p += (etat.cible - etat.p) * amortir(0.07, dt);
      etat.mx += (M.souris.x - etat.mx) * amortir(0.05, dt); etat.my += (M.souris.y - etat.my) * amortir(0.05, dt);
      const v = lenis ? Math.abs(lenis.velocity || 0) : 0;
      etat.vent += (borne(v / 40, 0, 1) - etat.vent) * amortir(0.06, dt);
      const pos = etat.p * (items.length - 1), idx = Math.round(pos);
      const cible = pages[idx];
      etat.lx += ((cible ? cible.x * (etat.portrait ? 0.55 : 0.4) : 0) - etat.lx) * amortir(0.05, dt);
      cam.position.set(etat.mx * 0.35 + etat.lx * 0.35, 0.95 - etat.my * 0.18, VUE + (etat.portrait ? 1.6 : 0) - pos * S);
      cam.lookAt(etat.lx, 0.95, cam.position.z - 6);
      pages.forEach((p) => {
        if (!p.feuille) return;
        const u = p.feuille.userData.u; u.uT.value = t;
        p.survol += ((p === survolee ? 1 : 0) - p.survol) * amortir(0.12, dt);
        u.uVent.value = etat.vent * (p.i % 2 ? 1 : -1) + Math.sin(t * 0.6 + p.i) * 0.06;
        p.m.rotation.x = Math.sin(t * 0.8 + p.i) * 0.025 + etat.vent * 0.18 - p.survol * 0.14;
        p.m.rotation.y = (p.panneau ? 0 : -Math.sign(p.x) * 0.42) * (1 - p.survol * 0.5);
      });
      pous.rotation.y = Math.sin(t * 0.05) * 0.05;
    },
  };
  const avance = ScrollTrigger.create({
    trigger: sec, start: 'top top', end: () => '+=' + items.length * innerHeight * 0.7,
    pin: true, anticipatePin: 1, invalidateOnRefresh: true,
    onUpdate: (st) => { etat.cible = st.progress; gsap.set(barre, { scaleX: st.progress }); choisir(Math.round(st.progress * (items.length - 1))); },
  });
  choisir(0);
  surveiller(M, sec, sc, sec.parentElement);
  const versIndice = (i) => allerA(lenis, avance.start + (i / (items.length - 1)) * (avance.end - avance.start) + 2);
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-panneau]'); if (!a) return;
    const i = items.indexOf(document.querySelector(a.getAttribute('href')));
    if (i < 0) return;
    e.preventDefault(); versIndice(i);
  });
  // au clavier, la fiche qui reçoit le focus amène sa page devant l'élève
  piste.addEventListener('focusin', (e) => { const i = items.findIndex(it => it.contains(e.target)); if (i >= 0 && i !== actif) versIndice(i); });
}

// repli sans WebGL : le couloir en CSS de l'essai n° 1
function couloir(lenis) {
  const html = document.documentElement;
  html.classList.add('couloir');
  const piste = document.getElementById('piste');
  const items = [...piste.children];
  const barre = document.querySelector('.barre-route i');
  const etapes = [...document.querySelectorAll('.route .etape')];
  let D, pos;
  const placer = () => {
    const grand = innerWidth >= 900;
    D = grand ? 1000 : 820;
    const off = grand ? Math.min(innerWidth * .2, 290) : innerWidth * .07;
    let cote = 1;
    pos = items.map((it, i) => {
      if (it.classList.contains('panneau')) return { x: 0, y: 0, r: 0, z0: -i * D };
      cote = -cote;
      return { x: cote * off, y: (((i * 37) % 5) - 2) * innerHeight * .012, r: -cote * (grand ? 12 : 5), z0: -i * D };
    });
  };
  placer();
  const cam = { z: 0 };
  let actif = -1;
  const rendre = () => {
    items.forEach((it, i) => {
      const p = pos[i], z = p.z0 + cam.z;
      const o = borne(z > 0 ? 1 - z / 220 : 1 - Math.min(1, Math.max(0, -z - .8 * D) / (2.6 * D)) * .95);
      gsap.set(it, { xPercent: -50, yPercent: -50, x: p.x, y: p.y, z, rotationY: p.r, opacity: o, pointerEvents: z > -D * .6 && z < 120 ? 'auto' : 'none' });
    });
    const idx = Math.round(cam.z / D);
    if (idx !== actif) {
      actif = idx;
      const it = items[idx], num = it && it.classList.contains('article') ? it.dataset.num : null;
      etapes.forEach(e => e.classList.toggle('ici', e.dataset.num === num));
    }
  };
  const avance = gsap.to(cam, {
    z: () => (items.length - 1) * D, ease: 'none', onUpdate: rendre,
    scrollTrigger: { trigger: '#parcours', start: 'top top', end: () => '+=' + items.length * innerHeight * .75, pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
      onRefresh: () => { placer(); rendre(); }, onUpdate: (st) => gsap.set(barre, { scaleX: st.progress }) },
  });
  rendre();
  const versIndice = (i) => { const st = avance.scrollTrigger; allerA(lenis, st.start + (i * D / ((items.length - 1) * D)) * (st.end - st.start) + 2); };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-panneau]'); if (!a) return;
    const i = items.indexOf(document.querySelector(a.getAttribute('href'))); if (i < 0) return;
    e.preventDefault(); versIndice(i);
  });
  piste.addEventListener('focusin', (e) => { const i = items.findIndex(it => it.contains(e.target)); if (i >= 0 && Math.abs(i * D - cam.z) > D * .4) versIndice(i); });
}

if (window.CLUB_PRET) lancer(); else document.addEventListener('club-pret', lancer, { once: true });
