/* La mise en scène de la une (GSAP 3.12 + ScrollTrigger).
 * - l'ouverture : le sigle se tamponne, le titre s'imprime lettre par lettre, la une se pose ;
 * - le parcours : sur grand écran, la piste des 9 modules défile à l'horizontale quand on descend,
 *   la route du reporter se remplit et marque le module en cours ;
 * - la carte de presse : les tampons gagnés s'abattent quand elle apparaît.
 * Mouvement réduit demandé, petit écran ou GSAP absent : la page reste lisible, sans piste horizontale. */
(function () {
  function lancer() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add({
      grand: '(min-width: 900px) and (min-height: 640px)',
      calme: '(prefers-reduced-motion: reduce)',
    }, (ctx) => {
      const { grand, calme } = ctx.conditions;
      if (calme) return;
      ouverture();
      parallaxeUne();
      tampons();
      const fin = grand ? pisteHorizontale() : apparitions('.piste > .article, .panneau');
      apparitions('.bilan, .ours');
      return fin;
    });
    addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  function ouverture() {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
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

  // les trois photos du collège ne montent pas à la même vitesse
  function parallaxeUne() {
    [-12, 7, -5].forEach((v, i) => gsap.to(`.triptyque img:nth-child(${i + 1})`, {
      yPercent: v, ease: 'none',
      scrollTrigger: { trigger: '.une', start: 'top top', end: 'bottom top', scrub: true },
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

  // petit écran : les blocs se posent en montant quand ils arrivent
  function apparitions(sel) {
    const el = gsap.utils.toArray(sel);
    gsap.set(el, { y: 40, autoAlpha: 0 });
    ScrollTrigger.batch(el, {
      start: 'top 90%', once: true,
      onEnter: (b) => gsap.to(b, { y: 0, autoAlpha: 1, duration: .7, stagger: .12, ease: 'power3.out', overwrite: true }),
    });
  }

  function pisteHorizontale() {
    const html = document.documentElement;
    html.classList.add('horizontal');
    const piste = document.getElementById('piste');
    const dist = () => Math.max(0, piste.scrollWidth - innerWidth);
    const barre = document.querySelector('.barre-route i');
    const defile = gsap.to(piste, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: '#parcours', start: 'top top', end: () => '+=' + dist(),
        pin: true, scrub: .6, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: (st) => gsap.set(barre, { scaleX: st.progress }),
      },
    });
    gsap.utils.toArray('.piste > .article').forEach((art) => {
      const etape = document.querySelector(`.route .etape[data-num="${art.dataset.num}"]`);
      ScrollTrigger.create({
        trigger: art, containerAnimation: defile, start: 'left 50%', end: 'right 50%',
        onToggle: (st) => etape && etape.classList.toggle('ici', st.isActive),
      });
      const img = art.querySelector('.vignette img');
      if (img) gsap.fromTo(img, { xPercent: -7 }, {
        xPercent: 7, ease: 'none',
        scrollTrigger: { trigger: art, containerAnimation: defile, start: 'left right', end: 'right left', scrub: true },
      });
      gsap.from(art.querySelectorAll('.meta, h3, .chapo, blockquote, .pied-art'), {
        y: 30, autoAlpha: 0, duration: .5, stagger: .06, ease: 'power3.out',
        scrollTrigger: { trigger: art, containerAnimation: defile, start: 'left 88%', toggleActions: 'play none none reverse' },
      });
    });
    gsap.utils.toArray('.panneau .lettre').forEach((l) => gsap.from(l, {
      scale: .3, rotation: -25, autoAlpha: 0, duration: .7, ease: 'back.out(1.7)',
      scrollTrigger: { trigger: l.parentNode, containerAnimation: defile, start: 'left 85%', toggleActions: 'play none none reverse' },
    }));
    // les rubriques du haut mènent au bon endroit de la piste
    const aller = (e) => {
      const a = e.target.closest('a[data-panneau]'); if (!a) return;
      const cible = document.querySelector(a.getAttribute('href')); if (!cible) return;
      e.preventDefault();
      const st = defile.scrollTrigger, d = dist() || 1;
      const x = cible.offsetLeft - parseFloat(getComputedStyle(piste).paddingLeft);
      scrollTo({ top: st.start + Math.min(1, Math.max(0, x / d)) * (st.end - st.start) + 2, behavior: 'smooth' });
    };
    document.addEventListener('click', aller);
    return () => { html.classList.remove('horizontal'); document.removeEventListener('click', aller); };
  }

  if (window.CLUB_PRET) lancer(); else document.addEventListener('club-pret', lancer, { once: true });
})();
