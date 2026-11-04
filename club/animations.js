/* La mise en scène de la une (GSAP 3.12 + ScrollTrigger).
 * - l'ouverture : le sigle se tamponne, le titre s'imprime lettre par lettre, la une se pose ;
 * - le parcours : une piste par étape (carte de presse, puis chaque spécialité) ; sur grand écran,
 *   chacune défile à l'horizontale quand on descend, sa route se remplit et marque le module en cours ;
 * - la carte de presse : les tampons gagnés s'abattent quand elle apparaît.
 * Appareil réglé sur « animations réduites » : rien ne bouge, sauf si l'élève les réactive avec le bouton
 * « Animations » (son choix est gardé dans ce navigateur). Sans GSAP, la page reste lisible telle quelle. */
(function () {
  function lancer() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    let choix = null; try { choix = localStorage.getItem('club-animations'); } catch (e) {}
    const bouton = document.getElementById('bouton-anim');
    const mm = gsap.matchMedia();
    mm.add({
      grand: '(min-height: 560px)',
      reduit: '(prefers-reduced-motion: reduce)',
    }, (ctx) => {
      const { grand, reduit } = ctx.conditions;
      const calme = choix === 'non' || (reduit && choix !== 'oui');
      if (bouton) {
        bouton.hidden = false;
        bouton.setAttribute('aria-pressed', String(!calme));
        bouton.textContent = calme ? '✦ Activer les animations' : '✦ Couper les animations';
        bouton.onclick = () => { try { localStorage.setItem('club-animations', calme ? 'oui' : 'non'); } catch (e) {} location.reload(); };
      }
      if (calme) return;
      ouverture();
      parallaxeUne();
      tampons();
      const fin = grand && document.querySelector('#parcours .piste') ? pistesHorizontales() : apparitions('.piste > .article, .panneau, .intertitre-spe');
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

  // chaque étape (carte de presse, puis chaque spécialité) a sa propre piste, qui défile à l'horizontale
  function pistesHorizontales() {
    const html = document.documentElement;
    html.classList.add('horizontal');
    gsap.utils.toArray('#parcours .parcours').forEach((sec) => {
      const piste = sec.querySelector('.piste');
      const dist = () => Math.max(0, piste.scrollWidth - innerWidth);
      const barre = sec.querySelector('.barre-route i');
      const arts = gsap.utils.toArray(sec.querySelectorAll('.piste > .article'));
      const etapeDe = (art) => sec.querySelector(`.route .etape[data-num="${art.dataset.num}"]`);
      if (dist() < 40) {
        // piste courte (une spécialité d'un module) : elle tient à l'écran, les blocs se posent
        gsap.from(sec.querySelectorAll('.piste > *'), {
          x: 80, autoAlpha: 0, duration: .7, stagger: .14, ease: 'power3.out',
          scrollTrigger: { trigger: sec, start: 'top 70%', toggleActions: 'play none none reverse' },
        });
        arts.forEach((art) => ScrollTrigger.create({ trigger: sec, start: 'top 60%', end: 'bottom 40%', onToggle: (st) => { const e = etapeDe(art); if (e) e.classList.toggle('ici', st.isActive); } }));
        return;
      }
      const defile = gsap.to(piste, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: sec, start: 'top top', end: () => '+=' + dist(),
          pin: true, scrub: .6, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: (st) => barre && gsap.set(barre, { scaleX: st.progress }),
        },
      });
      arts.forEach((art) => {
        const etape = etapeDe(art);
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
      sec.querySelectorAll('.panneau .lettre').forEach((l) => gsap.from(l, {
        scale: .3, rotation: -25, autoAlpha: 0, duration: .7, ease: 'back.out(1.7)',
        scrollTrigger: { trigger: l.parentNode, containerAnimation: defile, start: 'left 85%', toggleActions: 'play none none reverse' },
      }));
    });
    gsap.from('.intertitre-spe > *', { y: 26, autoAlpha: 0, duration: .6, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '.intertitre-spe', start: 'top 80%', once: true } });
    return () => html.classList.remove('horizontal');
  }

  if (window.CLUB_PRET) lancer(); else document.addEventListener('club-pret', lancer, { once: true });
})();
