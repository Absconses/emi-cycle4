/* Essai immersif de la une (GSAP 3.12 + ScrollTrigger + Lenis).
 * - l'ouverture : la une sort de la rotative pendant qu'on descend, le compteur de tirage tourne ;
 * - la manchette s'imprime quand elle arrive, le triptyque du collège flotte ;
 * - le couloir des rédactions : les modules arrivent en profondeur, l'un après l'autre ;
 * - le défilement est lissé (Lenis) et le papier a un léger grain.
 * Appareil réglé sur « animations réduites » : rien ne bouge, sauf si l'élève les réactive avec le bouton
 * « Animations » (son choix est gardé dans ce navigateur). Sans GSAP, la page reste lisible telle quelle. */
(function () {
  function lancer() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    let choix = null; try { choix = localStorage.getItem('club-animations'); } catch (e) {}
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
      rotative(lenis);
      ouverture();
      parallaxeUne();
      tampons();
      const fin = couloir(lenis);
      apparitions('.bilan, .ours');
      ScrollTrigger.refresh();
      return () => { fin(); if (lenis) lenis.destroy(); html.classList.remove('immersif'); document.getElementById('rotative').hidden = true; };
    });
    addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  // un défilement lissé, branché sur l'horloge de GSAP
  function lisser() {
    if (!window.Lenis) return null;
    const lenis = new Lenis({ lerp: 0.1, anchors: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    return lenis;
  }
  const allerA = (lenis, cible) => lenis ? lenis.scrollTo(cible, { duration: 1.4 }) : (typeof cible === 'number' ? scrollTo({ top: cible, behavior: 'smooth' }) : document.querySelector(cible).scrollIntoView({ behavior: 'smooth' }));

  // l'ouverture : la feuille sort d'entre les rouleaux, le tirage monte, puis elle file vers l'élève
  function rotative(lenis) {
    const sec = document.getElementById('rotative');
    sec.hidden = false;
    const scene = sec.querySelector('.rot-scene');
    scene.addEventListener('pointermove', (e) => {
      const r = scene.getBoundingClientRect();
      scene.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
      scene.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
    });
    sec.querySelector('.rot-passer').addEventListener('click', (e) => { e.preventDefault(); allerA(lenis, '#debut'); });
    const tirage = document.getElementById('tirage');
    const n = { v: 0 };
    const ecrire = () => { tirage.textContent = Math.round(n.v).toLocaleString('fr-FR'); };

    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('.rot-sur', { y: -16, autoAlpha: 0, duration: .5 })
      .from('.rot-titre span', { yPercent: 80, autoAlpha: 0, duration: .8, stagger: .14 }, '<.1')
      .from('.rouleau', { scaleX: 0, duration: .9, stagger: .1, ease: 'power2.inOut' }, '<')
      .from('.rot-tirage, .rot-indice, .rot-passer', { autoAlpha: 0, duration: .6 }, '-=.3');

    gsap.set('.rouleau', { backgroundPosition: '0px 0px, 0px 0px' });
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: sec, start: 'top top', end: '+=220%', pin: true, scrub: .8, anticipatePin: 1 },
    });
    tl.to('.rot-indice', { autoAlpha: 0, duration: .15 }, 0)
      .to('.rouleau.r1', { backgroundPosition: '960px 0px, 0px 0px', duration: 1.2 }, 0)
      .to('.rouleau.r2', { backgroundPosition: '-960px 0px, 0px 0px', duration: 1.2 }, 0)
      .fromTo('.feuille', { yPercent: -150, rotationX: -75, scale: .62, autoAlpha: 0 },
        { yPercent: 0, rotationX: 0, scale: 1, autoAlpha: 1, duration: 1, ease: 'power2.out' }, 0)
      .to(n, { v: 1250, duration: 1, onUpdate: ecrire }, 0)
      .to('.rot-titre, .rot-sur, .rot-tirage, .rot-passer', { y: -50, autoAlpha: 0, duration: .45, stagger: .04 }, 1.1)
      .to('.rouleau.r1', { y: () => '-=' + innerHeight * .4, duration: .7, ease: 'power2.in' }, 1.15)
      .to('.rouleau.r2', { y: () => '+=' + innerHeight * .4, duration: .7, ease: 'power2.in' }, 1.15)
      .to('.feuille', { scale: 2.8, rotationX: 8, autoAlpha: 0, duration: .75, ease: 'power2.in' }, 1.2);
  }

  // la manchette s'imprime quand elle arrive à l'écran
  function ouverture() {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, scrollTrigger: { trigger: '.manchette', start: 'top 80%', once: true } });
    tl.from('.tete-journal .sigle', { rotation: -220, scale: 1.8, autoAlpha: 0, duration: .9, ease: 'back.out(1.5)' })
      .from('.titre-journal .le', { y: -14, autoAlpha: 0, duration: .4 }, '-=.45')
      .from('.titre-journal .nom .mot > span', {
        yPercent: -70, autoAlpha: 0, rotation: () => gsap.utils.random(-16, 16), duration: .55, stagger: .035, ease: 'back.out(2)',
      }, '<')
      .fromTo('.titre-journal .nom', { '--souligne': 0 }, { '--souligne': 1, duration: .6, ease: 'power2.inOut' }, '-=.2')
      .from('.devise, .tete-journal .vertical, .rubriques', { y: 12, autoAlpha: 0, duration: .5, stagger: .08 }, '-=.35')
      .from('.triptyque img', { y: 70, autoAlpha: 0, duration: .9, stagger: .12 }, '-=.5')
      .from('.tampon-une', { scale: 2.6, rotation: -30, autoAlpha: 0, duration: .45, ease: 'back.out(1.4)' }, '-=.2')
      .from('.edito > *', { y: 26, autoAlpha: 0, duration: .6, stagger: .08 }, .55);
  }

  function parallaxeUne() {
    [-12, 7, -5].forEach((v, i) => gsap.to(`.triptyque img:nth-child(${i + 1})`, {
      yPercent: v, ease: 'none',
      scrollTrigger: { trigger: '.une', start: 'top bottom', end: 'bottom top', scrub: true },
    }));
  }

  function tampons() {
    const t = gsap.utils.toArray('.case.faite .t');
    if (!t.length) return;
    t.forEach(c => gsap.set(c, { rotation: parseFloat(getComputedStyle(c).getPropertyValue('--r')) || -12 }));
    gsap.from(t, {
      scale: 2.4, autoAlpha: 0, duration: .4, stagger: .16, ease: 'back.out(1.6)',
      scrollTrigger: { trigger: '#carte-presse', start: 'top 85%', once: true },
    });
  }

  function apparitions(sel) {
    const el = gsap.utils.toArray(sel);
    gsap.set(el, { y: 40, autoAlpha: 0 });
    ScrollTrigger.batch(el, {
      start: 'top 90%', once: true,
      onEnter: (b) => gsap.to(b, { y: 0, autoAlpha: 1, duration: .7, stagger: .12, ease: 'power3.out', overwrite: true }),
    });
  }

  // le couloir : la caméra avance dans la profondeur, chaque module vient à la rencontre de l'élève
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
    const max = () => (items.length - 1) * D;
    let actif = -1;
    const rendre = () => {
      items.forEach((it, i) => {
        const p = pos[i], z = p.z0 + cam.z;
        const op = z > 0 ? 1 - z / 220 : 1 - Math.min(1, Math.max(0, -z - .8 * D) / (2.6 * D)) * .95;
        const o = Math.max(0, Math.min(1, op));
        gsap.set(it, { xPercent: -50, yPercent: -50, x: p.x, y: p.y, z, rotationY: p.r, opacity: o,
          pointerEvents: z > -D * .6 && z < 120 ? 'auto' : 'none', zIndex: 1000 + Math.round(z) });
      });
      const idx = Math.round(cam.z / D);
      if (idx !== actif) {
        actif = idx;
        const it = items[idx], num = it && it.classList.contains('article') ? it.dataset.num : null;
        etapes.forEach(e => e.classList.toggle('ici', e.dataset.num === num));
      }
    };
    const avance = gsap.to(cam, {
      z: max, ease: 'none', onUpdate: rendre,
      scrollTrigger: {
        trigger: '#parcours', start: 'top top', end: () => '+=' + items.length * innerHeight * .75,
        pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
        onRefresh: () => { placer(); rendre(); },
        onUpdate: (st) => gsap.set(barre, { scaleX: st.progress }),
      },
    });
    rendre();
    const versIndice = (i) => {
      const st = avance.scrollTrigger;
      allerA(lenis, st.start + (i * D / max()) * (st.end - st.start) + 2);
    };
    const cliquer = (e) => {
      const a = e.target.closest('a[data-panneau]'); if (!a) return;
      const cible = document.querySelector(a.getAttribute('href')); const i = items.indexOf(cible);
      if (i < 0) return;
      e.preventDefault(); versIndice(i);
    };
    // au clavier, le module qui reçoit le focus vient devant l'élève
    const focus = (e) => {
      const i = items.findIndex(it => it.contains(e.target));
      if (i >= 0 && Math.abs(i * D - cam.z) > D * .4) versIndice(i);
    };
    document.addEventListener('click', cliquer);
    piste.addEventListener('focusin', focus);
    return () => {
      html.classList.remove('couloir');
      document.removeEventListener('click', cliquer);
      piste.removeEventListener('focusin', focus);
      gsap.set(items, { clearProps: 'all' });
    };
  }

  if (window.CLUB_PRET) lancer(); else document.addEventListener('club-pret', lancer, { once: true });
})();
