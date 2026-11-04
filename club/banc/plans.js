/* Les 10 rushes du cross, dessinés à la main dans un canevas de 320 × 180.
 * Chaque plan est une fonction dessin(ctx, t, d) : t = seconde dans le plan, d = sa durée.
 * Style des dessins du club (modules 9 et 10) : aplats, silhouettes sans visage. */
(function () {
  const NAVY = '#1d3557', RED = '#c1121f', TEAL = '#2a9d8f', GOLD = '#e9c46a', PAPER = '#fdfaf3', GREY = '#8d99ae';
  const CIEL = '#cfe3ee', HERBE = '#6a9f4b', HERBE2 = '#5b8c40', BOUE = '#6b4a2b';
  const MAILLOTS = ['#c1121f', '#2a9d8f', '#e76f51', '#457b9d', '#f4a261', '#6d597a', '#1d3557', '#e9c46a'];

  const rect = (c, x, y, w, h, f) => { c.fillStyle = f; c.fillRect(x, y, w, h); };
  const rond = (c, x, y, r, f) => { c.fillStyle = f; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
  const ellipse = (c, x, y, rx, ry, f, rot = 0) => { c.fillStyle = f; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); c.fill(); };
  const texte = (c, s, x, y, taille, f, gras = true, align = 'center') => {
    c.fillStyle = f; c.font = `${gras ? '700 ' : ''}${taille}px "Atkinson Hyperlegible", system-ui, sans-serif`;
    c.textAlign = align; c.textBaseline = 'middle'; c.fillText(s, x, y);
  };
  function arbre(c, x, y, s) { rect(c, x - 2 * s, y - 10 * s, 4 * s, 12 * s, '#7a5230'); rond(c, x, y - 16 * s, 10 * s, '#3f7a36'); rond(c, x - 7 * s, y - 11 * s, 7 * s, '#4c8c3f'); rond(c, x + 7 * s, y - 12 * s, 7 * s, '#4c8c3f'); }
  // un coureur : x, y = les pieds ; s = échelle ; p = phase de la foulée
  function coureur(c, x, y, s, maillot, p, dossard) {
    const j = Math.sin(p) * 5 * s, b = Math.cos(p) * 4 * s;
    c.strokeStyle = NAVY; c.lineWidth = 2.2 * s; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, y - 14 * s); c.lineTo(x + j, y); c.moveTo(x, y - 14 * s); c.lineTo(x - j, y); c.stroke();
    rect(c, x - 4 * s, y - 27 * s, 8 * s, 14 * s, maillot);
    if (dossard) { rect(c, x - 3 * s, y - 24 * s, 6 * s, 5 * s, '#fff'); texte(c, dossard, x, y - 21.5 * s, 3.4 * s, NAVY); }
    c.beginPath(); c.moveTo(x - 4 * s, y - 25 * s); c.lineTo(x - 4 * s - b, y - 17 * s); c.moveTo(x + 4 * s, y - 25 * s); c.lineTo(x + 4 * s + b, y - 17 * s); c.stroke();
    rond(c, x, y - 31 * s, 4.2 * s, '#b07a55'); ellipse(c, x, y - 33.5 * s, 4.4 * s, 2.4 * s, '#3b2a20');
  }
  function fondPrairie(c, dx = 0) {
    rect(c, 0, 0, 320, 180, CIEL);
    c.fillStyle = '#a9c9a0'; c.beginPath(); c.moveTo(0, 95); for (let x = 0; x <= 320; x += 20) c.lineTo(x, 88 + Math.sin((x + dx) / 40) * 6); c.lineTo(320, 180); c.lineTo(0, 180); c.fill();
    rect(c, 0, 100, 320, 80, HERBE);
    for (let i = 0; i < 6; i++) arbre(c, ((i * 70 - dx * .6) % 420 + 420) % 420 - 50, 100, .9);
  }

  const PLANS = [
    { id: 1, nom: 'Plan d’ensemble du parc', duree: 8, son: 'ambiance', type: 'Plan d’ensemble',
      desc: 'Le parc avant le départ : les tentes, la banderole, les coureurs qui s’échauffent. On comprend où l’on est.',
      dessin(c, t) {
        const dx = t * 6; fondPrairie(c, dx);
        // banderole et tentes
        const bx = 150 - dx; rect(c, bx, 62, 4, 40, NAVY); rect(c, bx + 86, 62, 4, 40, NAVY); rect(c, bx, 60, 90, 14, RED); texte(c, 'CROSS ACADÉMIQUE', bx + 45, 67, 7, '#fff');
        [[30, '#e9c46a'], [250, '#e76f51'], [340, '#457b9d']].forEach(([x, f]) => { const tx = x - dx * .8; c.fillStyle = f; c.beginPath(); c.moveTo(tx, 104); c.lineTo(tx + 20, 84); c.lineTo(tx + 40, 104); c.fill(); });
        for (let i = 0; i < 9; i++) { const x = 40 + i * 30 - dx * .9, y = 128 + (i % 3) * 12; coureur(c, x, y, .55, MAILLOTS[i % 8], t * 3 + i, null); }
        rect(c, 0, 165, 320, 15, HERBE2);
      } },
    { id: 2, nom: 'Les coureurs sur la ligne', duree: 5, son: 'ambiance', type: 'Plan moyen',
      desc: 'Une rangée de coureurs derrière la ligne blanche, prêts à partir.',
      dessin(c, t) {
        fondPrairie(c, 10);
        rect(c, 0, 150, 320, 4, '#fff');
        for (let i = 0; i < 8; i++) { const x = 24 + i * 38, sautille = Math.abs(Math.sin(t * 4 + i)) * 2; coureur(c, x, 146 - sautille, 1.25, MAILLOTS[i], .3, String(201 + i)); }
        rect(c, 0, 160, 320, 20, HERBE2);
      } },
    { id: 3, nom: 'Le départ', duree: 6, son: 'sifflet', type: 'Plan large',
      desc: 'Le coup de sifflet, la meute s’élance et passe devant l’objectif.',
      dessin(c, t) {
        fondPrairie(c, 10);
        const go = Math.max(0, t - .8);
        // le starter et son drapeau
        rect(c, 290, 92, 3, 34, NAVY); const lev = t < .8 ? -1 : 1; c.fillStyle = RED; c.beginPath(); c.moveTo(293, 92 + (lev > 0 ? 18 : 0)); c.lineTo(308, 96 + (lev > 0 ? 18 : 0)); c.lineTo(293, 102 + (lev > 0 ? 18 : 0)); c.fill();
        coureur(c, 300, 140, .9, NAVY, 0, null);
        for (let i = 0; i < 14; i++) { const x = -30 + (i % 7) * 22 + go * (55 + (i * 7) % 15), y = 120 + Math.floor(i / 7) * 22; coureur(c, x, y, .95, MAILLOTS[i % 8], go * 9 + i, null); }
        if (go > 0) for (let i = 0; i < 10; i++) ellipse(c, (go * 60 + i * 23) % 320, 150 + (i % 3) * 6, 8, 3, 'rgba(120,90,60,.25)');
        rect(c, 0, 165, 320, 15, HERBE2);
      } },
    { id: 4, nom: 'Un plan raté', duree: 4, son: 'ambiance', type: 'Raté',
      desc: 'Flou, et un doigt devant l’objectif. On devine à peine l’herbe.',
      dessin(c, t) {
        c.save(); c.filter = 'blur(7px)';
        c.translate(Math.sin(t * 9) * 6, Math.cos(t * 7) * 5); fondPrairie(c, t * 30);
        for (let i = 0; i < 6; i++) coureur(c, 40 + i * 50, 140, 1, MAILLOTS[i], t * 6 + i, null);
        c.restore();
        c.save(); c.filter = 'blur(4px)'; ellipse(c, 40 + Math.sin(t * 3) * 10, 110, 70, 95, '#d9a487', -.3); ellipse(c, 60, 60, 40, 30, '#e8b99c', -.3); c.restore();
      } },
    { id: 5, nom: 'Les pieds dans la boue', duree: 4, son: 'ambiance', type: 'Gros plan',
      desc: 'Des chaussures qui s’enfoncent dans la boue, en détail.',
      dessin(c, t) {
        rect(c, 0, 0, 320, 180, '#8a6a45'); rect(c, 0, 90, 320, 90, BOUE);
        for (let i = 0; i < 18; i++) ellipse(c, (i * 47) % 320, 110 + (i * 13) % 60, 14, 4, '#5a3d22');
        [[0, NAVY], [Math.PI, RED]].forEach(([ph, f], k) => {
          const p = t * 5 + ph, x = 60 + k * 120 + ((t * 70) % 260) - 40, y = 130 - Math.max(0, Math.sin(p)) * 40;
          rect(c, x + 10, y - 70, 16, 50, '#2b2d42');
          ellipse(c, x + 18, y - 6, 34, 14, f); rect(c, x - 6, y - 4, 50, 6, '#fff');
          c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); for (let j = 0; j < 3; j++) { c.moveTo(x + 10 + j * 7, y - 16); c.lineTo(x + 16 + j * 7, y - 12); } c.stroke();
          if (Math.sin(p) < .1) for (let j = 0; j < 5; j++) rond(c, x + 18 + (j - 2) * 14, y - 10 - j % 2 * 12, 3, '#4a301a');
        });
      } },
    { id: 6, nom: 'Le public qui applaudit', duree: 5, son: 'foule', type: 'Plan de coupe',
      desc: 'Des parents et des élèves derrière la barrière, qui applaudissent.',
      dessin(c, t) {
        rect(c, 0, 0, 320, 180, CIEL); rect(c, 0, 70, 320, 110, '#9fc28b');
        for (let r = 0; r < 2; r++) for (let i = 0; i < 9; i++) {
          const x = 18 + i * 36 + r * 18, y = 120 + r * 34, f = MAILLOTS[(i + r * 3) % 8];
          rect(c, x - 12, y - 20, 24, 36, f); rond(c, x, y - 28, 9, '#c58c66'); ellipse(c, x, y - 33, 9, 5, ['#3b2a20', '#7a5230', '#d9b26b'][(i + r) % 3]);
          const leve = Math.sin(t * 10 + i * 1.7 + r) > 0;
          c.strokeStyle = f; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath();
          c.moveTo(x - 10, y - 16); c.lineTo(x - (leve ? 4 : 14), y - (leve ? 36 : 4)); c.moveTo(x + 10, y - 16); c.lineTo(x + (leve ? 4 : 14), y - (leve ? 36 : 4)); c.stroke();
        }
        rect(c, 0, 150, 320, 6, '#fff'); for (let x = 0; x < 320; x += 30) rect(c, x, 140, 4, 30, '#fff');
      } },
    { id: 7, nom: 'Jade franchit l’arrivée', duree: 6, son: 'foule', type: 'Plan moyen',
      desc: 'Jade, dossard 214, passe sous l’arche d’arrivée. Plan bien cadré, stable.',
      dessin(c, t, d) {
        fondPrairie(c, 30);
        rect(c, 140, 50, 6, 100, NAVY); rect(c, 264, 50, 6, 100, NAVY); rect(c, 140, 46, 130, 18, NAVY); texte(c, 'ARRIVÉE', 205, 55, 10, GOLD);
        const x = 20 + (t / d) * 260; coureur(c, x, 152, 2.2, RED, t * 9, '214');
        if (x > 205) { c.strokeStyle = GOLD; c.lineWidth = 2; c.beginPath(); c.moveTo(146, 110); c.lineTo(x - 4, 104); c.moveTo(x + 4, 104); c.lineTo(264, 110); c.stroke(); }
        rect(c, 0, 165, 320, 15, HERBE2);
      } },
    { id: 8, nom: 'Deuxième prise de l’arrivée', duree: 6, son: 'foule', type: 'Doublon',
      desc: 'La même arrivée, filmée d’un autre endroit : le cadre penche, un dos passe devant, Jade est coupée.',
      dessin(c, t, d) {
        c.save(); c.translate(160, 90); c.rotate(-.12 + Math.sin(t * 6) * .02); c.translate(-160, -70);
        fondPrairie(c, 50);
        rect(c, 190, 50, 6, 100, NAVY); rect(c, 190, 46, 140, 18, NAVY); texte(c, 'ARRIV', 250, 55, 10, GOLD);
        const x = 120 + (t / d) * 240; coureur(c, x, 152, 2.2, RED, t * 9, '214');
        c.restore();
        const dos = 60 + Math.sin(t * 1.5) * 50; rect(c, dos - 50, 40, 100, 140, '#3a3f58'); rond(c, dos, 30, 28, '#2b2d42');
      } },
    { id: 9, nom: 'La réaction de Jade', duree: 10, son: 'voix', type: 'Interview',
      desc: 'Jade Morin, 4e, troisième du cross académique, raconte sa course. Son texte est sous-titré.',
      soustitres: [[0, 3.4, 'J’avais peur de partir trop vite…'], [3.4, 6.8, 'Dans la boue, j’ai pensé à mes entraînements.'], [6.8, 10, 'Troisième de l’académie : je n’y crois pas !']],
      dessin(c, t) {
        rect(c, 0, 0, 320, 180, CIEL); c.save(); c.filter = 'blur(3px)'; rect(c, 0, 80, 320, 100, HERBE); for (let i = 0; i < 7; i++) coureur(c, 20 + i * 48, 120, .7, MAILLOTS[i], i, null); c.restore();
        const b = Math.sin(t * 2) * 1.2;
        rect(c, 120, 112 + b, 80, 80, RED); rect(c, 140, 128 + b, 40, 26, '#fff'); texte(c, '214', 160, 141 + b, 13, NAVY);
        rect(c, 151, 92 + b, 18, 22, '#b07a55'); ellipse(c, 160, 72 + b, 24, 28, '#b07a55');
        ellipse(c, 160, 56 + b, 27, 17, '#3b2a20'); rect(c, 133, 56 + b, 9, 40, '#3b2a20'); rect(c, 178, 56 + b, 9, 40, '#3b2a20');
        // le micro du reporter
        rect(c, 234, 96, 8, 90, '#2b2d42'); ellipse(c, 238, 92, 10, 13, '#444'); rect(c, 228, 104, 20, 10, GOLD);
      } },
    { id: 10, nom: 'Les dossards rangés', duree: 4, son: 'ambiance', type: 'Plan de fin',
      desc: 'Après la course, les dossards empilés sur une table. Une image calme pour finir.',
      dessin(c, t) {
        rect(c, 0, 0, 320, 180, '#d8cfc0'); rect(c, 0, 110, 320, 70, '#b08968');
        for (let i = 0; i < 7; i++) { const x = 40 + i * 36, y = 100 - i * 2, a = (i - 3) * .06; c.save(); c.translate(x, y); c.rotate(a); rect(c, -22, -16, 44, 32, '#fff'); rect(c, -22, -16, 44, 6, RED); texte(c, String(201 + i * 3), 0, 4, 12, NAVY); c.restore(); }
        const main = 300 - Math.min(1, t / 2) * 70; ellipse(c, main, 120, 22, 12, '#c58c66'); rect(c, main + 10, 114, 60, 14, '#457b9d');
      } },
  ];

  window.PLANS = PLANS;
  window.PLAN = Object.fromEntries(PLANS.map(p => [p.id, p]));
  window.COULEURS_PLANS = { NAVY, RED, TEAL, GOLD, PAPER, GREY };
})();
