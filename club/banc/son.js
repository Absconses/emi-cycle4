/* Le son du banc, fabriqué dans le navigateur (Web Audio) : rien à télécharger.
 * - ambiance : le vent et le bord de piste ; foule : les applaudissements ;
 * - sifflet : le coup de sifflet du départ ; voix : la voix de Jade (on la comprend par les sous-titres) ;
 * - musique : une boucle libre, faite pour le club, dont l'élève règle le niveau plan par plan. */
(function () {
  let ctx = null, maitre = null, bruit = null, sources = [];
  function contexte() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      ctx = new AC(); maitre = ctx.createGain(); maitre.gain.value = .9; maitre.connect(ctx.destination);
      const n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0; // bruit rose
      for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b0 = .997 * b0 + w * .029; b1 = .985 * b1 + w * .032; b2 = .95 * b2 + w * .048; d[i] = (b0 + b1 + b2 + w * .02) * .9; }
      bruit = buf;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const garde = (n) => { sources.push(n); return n; };
  function bruitFiltre(t0, duree, freq, q, gain, dest) {
    const s = garde(ctx.createBufferSource()); s.buffer = bruit; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + .08); g.gain.setValueAtTime(gain, t0 + duree - .08); g.gain.linearRampToValueAtTime(0, t0 + duree);
    s.connect(f); f.connect(g); g.connect(dest || maitre); s.start(t0, Math.random()); s.stop(t0 + duree + .05);
    return g;
  }
  function ambiance(t0, duree) { bruitFiltre(t0, duree, 500, .4, .35); bruitFiltre(t0, duree, 1800, .8, .06); }
  function foule(t0, duree) {
    ambiance(t0, duree);
    for (let t = 0; t < duree - .05; t += .045 + Math.random() * .05) { // des mains qui claquent
      const s = garde(ctx.createBufferSource()); s.buffer = bruit; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900 + Math.random() * 1500;
      const g = ctx.createGain(), a = t0 + t; g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(.25 + Math.random() * .25, a + .004); g.gain.exponentialRampToValueAtTime(.001, a + .06);
      s.connect(f); f.connect(g); g.connect(maitre); s.start(a, Math.random()); s.stop(a + .08);
    }
  }
  function sifflet(t0, duree, debut) {
    ambiance(t0, duree);
    const a = t0 + Math.max(0, .75 - debut); if (debut > 1.4) return;
    const o = garde(ctx.createOscillator()), l = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 2900; l.frequency.value = 32; lg.gain.value = 140; l.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(.16, a + .02); g.gain.setValueAtTime(.16, a + .5); g.gain.linearRampToValueAtTime(0, a + .6);
    o.connect(g); g.connect(maitre); o.start(a); l.start(a); o.stop(a + .65); l.stop(a + .65); sources.push(l);
  }
  // une voix : des syllabes de bruit filtré, assez fortes pour être couvertes si la musique est trop haute
  function voix(t0, duree) {
    bruitFiltre(t0, duree, 500, .4, .12);
    const g = ctx.createGain(); g.gain.value = 1; g.connect(maitre);
    for (let t = .1; t < duree - .2; t += .16 + Math.random() * .12) {
      if (Math.random() < .12) { t += .25; continue; } // une respiration
      const o = garde(ctx.createOscillator()); o.type = 'sawtooth'; const a = t0 + t, l = .12 + Math.random() * .06;
      o.frequency.setValueAtTime(210 + Math.random() * 40, a); o.frequency.linearRampToValueAtTime(190 + Math.random() * 30, a + l);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700 + Math.random() * 900; f.Q.value = 3;
      const e = ctx.createGain(); e.gain.setValueAtTime(0, a); e.gain.linearRampToValueAtTime(.55, a + .025); e.gain.linearRampToValueAtTime(0, a + l);
      o.connect(f); f.connect(e); e.connect(g); o.start(a); o.stop(a + l + .02);
    }
  }
  const SONS = { ambiance, foule, sifflet: (t0, d, debut) => sifflet(t0, d, debut || 0), voix };

  // la musique : 112 battements par minute, la ré mi do, basse et arpège
  const ACC = [[220, 277.2, 329.6], [146.8, 220, 293.7], [164.8, 246.9, 329.6], [130.8, 196, 261.6]];
  function musique(t0, duree, niveaux) {
    // niveaux : [[début, fin, gain]] en secondes depuis t0
    const bus = ctx.createGain(); bus.gain.setValueAtTime(niveaux.length ? niveaux[0][2] : .5, t0);
    niveaux.forEach(([a, , g]) => { bus.gain.setTargetAtTime(g, t0 + Math.max(0, a - .15), .06); });
    bus.gain.setTargetAtTime(0, t0 + duree - .4, .12);
    bus.connect(maitre);
    const temps = 60 / 112 / 2;
    for (let i = 0, t = 0; t < duree; i++, t += temps) {
      const a = t0 + t, acc = ACC[Math.floor(i / 16) % 4];
      const o = garde(ctx.createOscillator()); o.type = 'triangle'; o.frequency.value = acc[i % 3] * (i % 4 === 3 ? 2 : 1);
      const e = ctx.createGain(); e.gain.setValueAtTime(0, a); e.gain.linearRampToValueAtTime(.09, a + .01); e.gain.exponentialRampToValueAtTime(.001, a + temps * .95);
      o.connect(e); e.connect(bus); o.start(a); o.stop(a + temps);
      if (i % 4 === 0) { const b = garde(ctx.createOscillator()); b.type = 'sine'; b.frequency.value = acc[0] / 2; const eb = ctx.createGain(); eb.gain.setValueAtTime(.22, a); eb.gain.exponentialRampToValueAtTime(.001, a + temps * 3.8); b.connect(eb); eb.connect(bus); b.start(a); b.stop(a + temps * 4); }
      if (i % 2 === 1) { const s = garde(ctx.createBufferSource()); s.buffer = bruit; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000; const eh = ctx.createGain(); eh.gain.setValueAtTime(.12, a); eh.gain.exponentialRampToValueAtTime(.001, a + .05); s.connect(f); f.connect(eh); eh.connect(bus); s.start(a, Math.random()); s.stop(a + .06); }
    }
  }

  window.SON = {
    // morceaux : [{debut, duree, son, decalage}] ; mus : null ou {niveaux:[[a,b,g]]}
    jouer(morceaux, mus, total) {
      if (!contexte()) return 0;
      this.couper(); maitre.gain.cancelScheduledValues(ctx.currentTime); maitre.gain.setValueAtTime(.9, ctx.currentTime);
      const t0 = ctx.currentTime + .08;
      morceaux.forEach(m => SONS[m.son] && SONS[m.son](t0 + m.debut, m.duree, m.decalage));
      if (mus) musique(t0, total, mus.niveaux);
      return t0;
    },
    maintenant() { return ctx ? ctx.currentTime : 0; },
    couper() {
      if (!ctx) return;
      sources.forEach(s => { try { s.stop(); } catch (e) {} try { s.disconnect(); } catch (e) {} }); sources = [];
    },
    pret: () => !!(window.AudioContext || window.webkitAudioContext),
  };
})();
