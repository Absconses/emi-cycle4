/* Dupanloup Média : les sons.
 * Aucun fichier audio : chaque son est fabriqué par le navigateur (Web Audio), au moment où il est joué.
 * Le son est coupé par défaut. Il s'allume avec « Entrer avec le son » ou le bouton « Son » de la barre,
 * et le choix est gardé dans le navigateur (media-son). En mode calme, il reste coupé. */
window.SON = (function () {
  let ctx = null, sortie = null, souffleBlanc = null, dernierSurvol = 0;
  let actif = false;
  try { actif = localStorage.getItem('media-son') === 'oui'; } catch (e) {}
  const calme = () => document.documentElement.classList.contains('calme');

  function moteur() {
    if (!actif || calme()) return null;
    if (!ctx) {
      const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
      ctx = new A();
      const limiteur = ctx.createDynamicsCompressor(); limiteur.threshold.value = -14; limiteur.ratio.value = 6;
      sortie = ctx.createGain(); sortie.gain.value = .55; sortie.connect(limiteur); limiteur.connect(ctx.destination);
      souffleBlanc = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = souffleBlanc.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    // le navigateur n'autorise le son qu'après un geste : sans lui on se tait, plutôt que de tout jouer en retard
    if (ctx.state !== 'running') { ctx.resume(); return null; }
    return ctx;
  }
  // une note : une onde qui glisse de f à f2 et s'éteint
  function ton(t, dur, o) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(o.g, t + (o.att || .004)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    osc.connect(g); g.connect(sortie); osc.start(t); osc.stop(t + dur + .02);
  }
  // un bruit filtré : le souffle, le papier, la frappe
  function bruit(t, dur, o) {
    const src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = souffleBlanc; src.loop = true;
    fl.type = o.type || 'bandpass'; fl.Q.value = o.q || 1; fl.frequency.setValueAtTime(o.f, t);
    if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(o.g, t + (o.att || .003)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(fl); fl.connect(g); g.connect(sortie); src.start(t, Math.random() * .5); src.stop(t + dur + .02);
  }
  const SONS = {
    survol: t => ton(t, .05, { f: 2300, f2: 1700, g: .028 }),
    clic: t => { ton(t, .09, { f: 190, f2: 85, g: .3 }); bruit(t, .03, { f: 3200, g: .07 }); },
    frappe: t => { const v = .9 + Math.random() * .25; bruit(t, .04, { f: 2500 * v, q: 1.6, g: .2 }); ton(t, .05, { f: 150 * v, f2: 70, g: .16, type: 'triangle' }); },
    cloche: t => { ton(t, 1.3, { f: 2093, g: .1 }); ton(t, .7, { f: 4220, g: .03 }); ton(t, .9, { f: 3136, g: .025 }); },
    souffle: t => bruit(t, .55, { f: 260, f2: 2600, q: .8, g: .13, att: .22 }),
    glisse: t => bruit(t, .24, { f: 800, f2: 3200, q: 1.2, g: .08, att: .08 }),
    tampon: t => { ton(t, .24, { f: 125, f2: 42, g: .55 }); bruit(t, .09, { type: 'lowpass', f: 900, g: .32 }); },
    ouvre: t => { ton(t, .1, { f: 660, g: .07, type: 'triangle' }); ton(t + .07, .16, { f: 990, g: .07, type: 'triangle' }); },
    ferme: t => { ton(t, .1, { f: 990, g: .06, type: 'triangle' }); ton(t + .07, .16, { f: 660, g: .06, type: 'triangle' }); },
    jingle: t => { [392, 523.25, 659.25, 783.99].forEach((f, i) => { ton(t + i * .1, .7, { f, g: .085, type: 'triangle', att: .01 }); ton(t + i * .1, .5, { f: f * 2, g: .02 }); }); ton(t + .42, 1.4, { f: 1046.5, g: .06, att: .02 }); },
  };
  /* jouer('tampon') tout de suite, ou jouer('tampon', 1.5) dans une seconde et demie */
  function jouer(nom, dans) {
    if (nom === 'survol') { const m = performance.now(); if (m - dernierSurvol < 70) return; dernierSurvol = m; }
    const c = moteur(); if (!c || !SONS[nom]) return;
    try { SONS[nom](c.currentTime + .01 + (dans || 0)); } catch (e) {}
  }
  function regler(oui) {
    actif = !!oui; try { localStorage.setItem('media-son', actif ? 'oui' : 'non'); } catch (e) {}
    if (actif) { moteur(); if (ctx && ctx.state !== 'running') ctx.resume(); }
    document.dispatchEvent(new CustomEvent('son-change', { detail: actif }));
  }
  // si le son était déjà allumé, le premier geste sur la page le réveille
  ['pointerdown', 'keydown'].forEach(e => addEventListener(e, () => { if (actif && !calme()) moteur(); }, { once: true, capture: true }));
  return { jouer, regler, actif: () => actif && !calme() };
})();
