/* Lümi · espace enseignant. Une seule page, des vues choisies par l'adresse (#classes, #classe/…, #parcours…).
 * Toutes les données passent par LUMI (donnees.js). Les noms des élèves ne sortent jamais de ce poste. */
(async function () {
  const $ = (s, r = document) => r.querySelector(s);
  const vue = $('#vue'), barre = $('#barre'), message = $('#message'), dialogue = $('#dialogue');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pct = x => Math.round(x * 100) + ' %';
  const pl = (n, mot, pluriel) => n + ' ' + (n > 1 ? (pluriel || mot + 's') : mot);
  const niv = n => `--niv:var(--c${n[0]})`;
  const mods = await LUMI.modules(), parId = new Map(mods.map(m => [m.id, m]));
  const nomMod = id => { const m = parId.get(id); return m ? (m.num ? m.num + ' · ' : '') + m.titre : id; };
  let session = null;

  $('#demo').hidden = !LUMI.demo;
  $('#raz').onclick = async () => {
    if (!(await confirmer({ titre: 'Remettre la démo à zéro ?', texte: 'Les classes, parcours et noms créés pendant cet essai seront effacés de ce navigateur. Le collège fictif revient à son état de départ.', oui: 'Tout remettre à zéro', danger: true }))) return;
    LUMI.reinitialiserDemo(); location.hash = ''; location.reload();
  };
  $('#sortir').onclick = async () => { await LUMI.deconnecter(); session = null; location.hash = ''; route(); };

  /* ---------- petits outils ---------- */
  let minuteur;
  function dire(texte) {
    message.textContent = texte; message.classList.add('vu');
    clearTimeout(minuteur); minuteur = setTimeout(() => message.classList.remove('vu'), 3600);
  }
  function confirmer({ titre, texte, oui, danger }) {
    $('#d-titre').textContent = titre; $('#d-texte').textContent = texte;
    const b = $('#d-oui'); b.textContent = oui; b.classList.toggle('danger', !!danger);
    dialogue.returnValue = 'non'; dialogue.showModal();
    return new Promise(r => dialogue.addEventListener('close', () => r(dialogue.returnValue === 'oui'), { once: true }));
  }
  const depuis = (iso) => {
    const j = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
    return j <= 0 ? 'aujourd’hui' : j === 1 ? 'hier' : 'il y a ' + j + ' j';
  };
  // pour les lecteurs d'écran seulement : le retour visible se fait sur le bouton lui-même
  const annoncer = (texte) => { message.classList.remove('vu'); message.textContent = texte; };
  async function copier(texte, b) {
    try {
      await navigator.clipboard.writeText(texte); annoncer('Copié : ' + texte);
      b.classList.add('fait'); clearTimeout(b._retour); b._retour = setTimeout(() => b.classList.remove('fait'), 1600);
    } catch (e) { dire('Copie impossible ici. Le code : ' + texte); }
  }
  const BOUTON_COPIER = '<button type="button" class="lien-btn discret copie" id="copier"><span class="a">Copier</span><span class="b" aria-hidden="true">Copié ✓</span></button>';
  // pendant un enregistrement, le bouton le dit et ne peut pas être cliqué deux fois
  async function occuper(b, texte, f) {
    const avant = b.textContent; b.disabled = true; b.setAttribute('aria-busy', 'true'); b.textContent = texte;
    try { return await f(); } finally { if (b.isConnected) { b.disabled = false; b.removeAttribute('aria-busy'); b.textContent = avant; } }
  }
  // une action faite au clavier doit être immédiate : on retient d'où vient le dernier geste
  let auClavier = false;
  addEventListener('keydown', () => { auClavier = true; }, true);
  addEventListener('pointerdown', () => { auClavier = false; }, true);
  vue.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && e.target.matches('textarea') && e.target.form) e.target.form.requestSubmit(); });
  LUMI_FX.reflets(vue, 'a.l-carte');
  const placerPastille = LUMI_FX.pastille($('.l-nav'));
  // un simple rafraîchissement (après un ajout, un nom collé…) ne rejoue pas l'entrée de la vue
  const redessiner = (f) => { vue.classList.remove('entre'); return f(); };
  const telecharger = (nom, contenu, type) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([contenu], { type })); a.download = nom;
    document.body.appendChild(a); a.click(); a.remove();
  };
  const adresseEleve = () => location.origin + location.pathname.replace(/[^/]*$/, '');
  // une erreur d'enregistrement s'affiche dans le formulaire, à l'endroit prévu
  const alerter = (e) => { const a = $('.l-alerte', vue); if (a) { a.textContent = e.message; a.scrollIntoView({ block: 'nearest' }); } else dire(e.message); };

  /* ---------- aiguillage ---------- */
  let vuePrecedente = null, finEntree;
  async function route() {
    try { session = await LUMI.session(); } catch (e) { session = null; }
    const cle = session ? location.hash.replace(/^#/, '') || 'classes' : 'connexion';
    const change = cle !== vuePrecedente, premiere = vuePrecedente === null; vuePrecedente = cle;
    const rendre = async () => {
      barre.hidden = !session;
      if (!session) { vueConnexion(); return; }
      $('#qui').textContent = session.enseignant.nom;
      const [a, b, c] = cle.split('/');
      const onglet = a === 'parcours' ? 'parcours' : a === 'college' ? 'college' : 'classes';
      barre.querySelectorAll('[data-onglet]').forEach(l => l.dataset.onglet === onglet ? l.setAttribute('aria-current', 'page') : l.removeAttribute('aria-current'));
      vue.className = 'l-page';
      try {
        if (a === 'classe' && b && c === 'codes') await vueCodes(b);
        else if (a === 'classe' && b) await vueClasse(b);
        else if (a === 'nouvelle-classe') await vueNouvelleClasse();
        else if (a === 'parcours' && b) await vueEditeur(b);
        else if (a === 'parcours') await vueParcours();
        else if (a === 'college') await vueCollege();
        else await vueClasses();
      } catch (e) {
        vue.innerHTML = `<div class="l-vide"><strong>${esc(e.message)}</strong><a class="btn" href="#classes">Revenir à mes classes</a></div>`;
      }
      if (change) { vue.classList.add('entre'); scrollTo(0, 0); }
      placerPastille();
    };
    await LUMI_FX.transition(rendre, change && !premiere);
    placerPastille();
    clearTimeout(finEntree); finEntree = setTimeout(() => vue.classList.remove('entre'), 1000);
  }
  addEventListener('hashchange', route);

  /* ---------- entrée ---------- */
  function vueConnexion() {
    document.title = 'Espace enseignant · Lümi';
    vue.className = 'l-page etroit';
    vue.innerHTML = `
      <a class="l-fil" href="index.html">← Accueil de Lümi</a>
      <div class="l-titre"><div><h1>Espace enseignant</h1><p>Vos classes, vos parcours, la progression de vos élèves.</p></div></div>
      <div class="l-bloc"><h2>Visiter le collège fictif</h2>
        <p style="margin:0 0 14px;color:var(--encre-2)">Deux classes déjà remplies, un parcours en cours et la bibliothèque partagée : le plus rapide pour voir ce que Lümi sait faire.</p>
        <button class="btn" id="visiter">Entrer dans la démo</button></div>
      <form class="l-bloc" id="inscription" novalidate><h2>Essayer avec mon collège</h2>
        <p style="margin:0 0 14px;color:var(--encre-2)">Vous partez d’un compte vide, comme un collègue qui s’inscrit. En mode démo, ce compte n’existe que dans ce navigateur.</p>
        <p class="l-alerte" role="alert"></p>
        <label class="champ">Votre nom <small>Affiché à côté des parcours que vous partagez.</small><input name="nom" autocomplete="name" maxlength="80" required></label>
        <label class="coche"><input type="checkbox" name="rejoindre"><span>Un collègue de mon collège est déjà inscrit<small>Il vous a donné un code d’invitation.</small></span></label>
        <div id="nouveau-college" class="champs">
          <label class="champ">Nom du collège<input name="etablissement" autocomplete="organization" maxlength="120"></label>
          <label class="champ">Ville<input name="ville" autocomplete="address-level2" maxlength="80"></label>
        </div>
        <label class="champ" id="par-invitation" hidden>Code d’invitation<input class="code" name="invitation" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="12"></label>
        <button class="btn">Créer mon compte d’essai</button>
      </form>`;
    $('#visiter').onclick = (e) => occuper(e.currentTarget, 'Ouverture…', async () => { await LUMI.connecter(); location.hash = '#classes'; await route(); });
    const f = $('#inscription');
    f.rejoindre.onchange = () => { $('#nouveau-college').hidden = f.rejoindre.checked; $('#par-invitation').hidden = !f.rejoindre.checked; };
    f.onsubmit = async (e) => {
      e.preventDefault();
      try {
        await occuper(f.querySelector('.btn'), 'Création…', () => LUMI.inscrire({ nom: f.nom.value, etablissement: f.etablissement.value, ville: f.ville.value, invitation: f.rejoindre.checked ? f.invitation.value || '?' : '' }));
        location.hash = '#classes'; route();
      } catch (err) { alerter(err); }
    };
  }

  /* ---------- mes classes ---------- */
  async function vueClasses() {
    document.title = 'Mes classes · Lümi';
    const classes = await LUMI.classes();
    const carte = (c) => {
      const total = c.effectif * (c.parcours_modules ? c.parcours_modules.length : mods.filter(m => m.niveau === c.niveau).length);
      return `<a class="l-carte" href="#classe/${esc(c.id)}" style="${niv(c.niveau)}">
        <div class="haut"><h3>${esc(c.nom)}</h3><span class="pastille">${c.niveau}</span></div>
        <p>${pl(c.effectif, 'élève')} · ${esc(c.parcours_titre || 'Tous les modules de ' + c.niveau)}</p>
        <div class="l-barre-av" role="img" aria-label="${total ? pct(c.termines / total) : '0 %'} des modules terminés"><span style="width:${total ? Math.round(c.termines / total * 100) : 0}%"></span></div>
        <p class="l-meta">${c.termines} module${c.termines > 1 ? 's' : ''} terminé${c.termines > 1 ? 's' : ''} sur ${total}</p>
        <div class="bas"><span class="l-code" title="Code de la classe">${esc(c.code)}</span><span class="ouvrir" aria-hidden="true">Ouvrir</span></div></a>`;
    };
    vue.innerHTML = `
      <div class="l-titre"><div><h1>Mes classes</h1><p>${esc(session.etablissement.nom)}</p></div>
        ${classes.length ? '<a class="btn" href="#nouvelle-classe">Nouvelle classe</a>' : ''}</div>
      ${classes.length ? `<div class="l-grille">${classes.map(carte).join('')}</div>`
        : `<div class="l-vide"><strong>Aucune classe pour l’instant</strong>Créez votre première classe : Lümi fabrique le code de la classe et un code par élève.<br><a class="btn" href="#nouvelle-classe">Créer une classe</a></div>`}`;
  }

  async function vueNouvelleClasse() {
    document.title = 'Nouvelle classe · Lümi';
    const miens = await LUMI.parcours();
    vue.className = 'l-page etroit';
    vue.innerHTML = `
      <a class="l-fil" href="#classes">← Mes classes</a>
      <div class="l-titre"><h1>Nouvelle classe</h1></div>
      <form class="l-bloc" id="f" novalidate>
        <p class="l-alerte" role="alert"></p>
        <div class="champs">
          <label class="champ">Nom de la classe<input name="nom" maxlength="30" placeholder="5e A" required></label>
          <label class="champ">Niveau<select name="niveau">${LUMI.NIVEAUX.map(n => `<option>${n}</option>`).join('')}</select></label>
        </div>
        <label class="champ">Parcours suivi<select name="parcours"></select></label>
        <label class="champ">Nombre d’élèves<input name="effectif" type="number" inputmode="numeric" min="1" max="60" value="28" required></label>
        <label class="champ">Liste des élèves <small>Facultatif. Un nom par ligne, dans l’ordre de votre liste : les noms restent sur ce poste et ne sont jamais envoyés. Le nombre d’élèves s’ajuste tout seul.</small>
          <textarea name="liste" rows="5" placeholder="DUPONT Léa&#10;MARTIN Noé"></textarea></label>
        <div class="l-pied-form"><button class="btn">Créer la classe et ses codes</button><a class="lien-btn" href="#classes">Annuler</a></div>
      </form>`;
    const f = $('#f');
    const remplir = () => {
      f.parcours.innerHTML = `<option value="">Tous les modules de ${f.niveau.value}</option>` + miens.filter(p => p.niveau === f.niveau.value).map(p => `<option value="${esc(p.id)}">${esc(p.titre)} (${pl(p.modules.length, 'module')})</option>`).join('');
    };
    f.niveau.onchange = remplir; remplir();
    const lignes = () => f.liste.value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 60);
    f.liste.oninput = () => { const n = lignes().length; if (n) f.effectif.value = n; };
    f.nom.oninput = () => { const n = f.nom.value.match(/[345]/); if (n && f.niveau.value !== n[0] + 'e') { f.niveau.value = n[0] + 'e'; remplir(); } };
    f.onsubmit = async (e) => {
      e.preventDefault();
      try {
        const id = await occuper(f.querySelector('.btn'), 'Création des codes…', () => LUMI.creerClasse({ nom: f.nom.value, niveau: f.niveau.value, parcours_id: f.parcours.value || null, effectif: f.effectif.value }));
        const d = await LUMI.classe(id), L = lignes();
        d.eleves.forEach((el, k) => { if (L[k]) LUMI.nommer(d.classe.code, el.code, L[k].slice(0, 60)); });
        location.hash = '#classe/' + id;
        dire('Classe créée. Il reste à imprimer la fiche des codes.');
      } catch (err) { alerter(err); }
    };
  }

  /* ---------- une classe ---------- */
  const listeModules = (d) => (d.parcours ? d.parcours.modules : mods.filter(m => m.niveau === d.classe.niveau).map(m => m.id)).filter(id => parId.has(id));
  function analyser(d) {
    const liste = listeModules(d), noms = LUMI.noms(d.classe.code);
    const par = new Map(d.eleves.map(e => [e.id, {}]));
    d.progression.forEach(g => { if (par.has(g.eleve_id) && liste.includes(g.module_id)) par.get(g.eleve_id)[g.module_id] = g; });
    const eleves = d.eleves.map(e => {
      const p = par.get(e.id), lignes = Object.values(p), finis = lignes.filter(g => g.termine);
      return { e, p, nom: noms[e.code] || '', faits: finis.length,
        moyenne: finis.length ? finis.reduce((s, g) => s + g.meilleur, 0) / finis.length : null,
        vu: lignes.length ? lignes.map(g => g.vu).sort().pop() : null };
    });
    const actifs = eleves.filter(x => x.vu), finisTous = eleves.flatMap(x => Object.values(x.p).filter(g => g.termine));
    const parModule = liste.map(id => {
      const f = eleves.map(x => x.p[id]).filter(g => g && g.termine);
      return { id, n: f.length, moyenne: f.length ? f.reduce((s, g) => s + g.meilleur, 0) / f.length : null };
    });
    const resiste = parModule.filter(m => m.n >= 3 && m.moyenne < .7).sort((a, b) => a.moyenne - b.moyenne).slice(0, 3);
    const relancer = eleves.map(x => {
      const jours = x.vu ? Math.floor((Date.now() - new Date(x.vu).getTime()) / 864e5) : null;
      if (!x.vu) return { x, ordre: 0, raison: 'n’a encore rien ouvert' };
      if (jours >= 14) return { x, ordre: 1, raison: 'aucune activité depuis ' + jours + ' jours' };
      if (x.faits >= 2 && x.moyenne < .5) return { x, ordre: 2, raison: 'score moyen de ' + pct(x.moyenne) };
      return null;
    }).filter(Boolean).sort((a, b) => a.ordre - b.ordre || a.x.e.numero - b.x.e.numero);
    return { liste, eleves, actifs, parModule, resiste, relancer,
      moyenneFaits: eleves.length ? eleves.reduce((s, x) => s + x.faits, 0) / eleves.length : 0,
      scoreMoyen: finisTous.length ? finisTous.reduce((s, g) => s + g.meilleur, 0) / finisTous.length : null,
      assez: parModule.some(m => m.n >= 3) };
  }
  const appel = (x) => x.nom || 'Élève n° ' + x.e.numero;
  function cellule(g) {
    if (!g) return { cl: 'c-vide', t: '—', csv: '' };
    if (g.termine) return { cl: 'c-ok', t: '✓ ' + pct(g.meilleur), csv: 'terminé ' + pct(g.meilleur) };
    return { cl: 'c-encours', t: (g.avance ? pct(g.avance) : 'ouvert') + (g.meilleur ? '<br><small>score ' + pct(g.meilleur) + '</small>' : ''), csv: (g.avance ? pct(g.avance) + ' fait' : 'ouvert') + (g.meilleur ? ', score ' + pct(g.meilleur) : '') };
  }

  async function vueClasse(id) {
    const [d, miens] = await Promise.all([LUMI.classe(id), LUMI.parcours()]);
    const c = d.classe, A = analyser(d);
    document.title = c.nom + ' · Lümi';
    const options = `<option value="">Tous les modules de ${c.niveau}</option>` + miens.map(p => `<option value="${esc(p.id)}"${p.id === c.parcours_id ? ' selected' : ''}>${esc(p.titre)} (${p.niveau}, ${pl(p.modules.length, 'module')})</option>`).join('');
    const tete = '<thead><tr><th class="eleve">Élève</th><th>Code</th><th>Terminés</th>' + A.liste.map(m => { const x = parId.get(m); return `<th class="mod" style="${niv(x.niveau)}" title="${esc(x.titre)}"><b>${x.num || 'GM'}</b> ${esc(x.titre)}</th>`; }).join('') + '<th>Vu</th><th><span class="no-print">Retirer</span></th></tr></thead>';
    const corps = A.eleves.map(x => `<tr>
      <td class="eleve"><span class="rang">${x.e.numero}</span><input class="nom" data-code="${esc(x.e.code)}" value="${esc(x.nom)}" placeholder="Nom (reste ici)" maxlength="60" aria-label="Nom de l’élève n° ${x.e.numero}, enregistré sur ce poste seulement"></td>
      <td class="code">${esc(x.e.code)}</td><td>${x.faits}/${A.liste.length}</td>
      ${A.liste.map(m => { const k = cellule(x.p[m]); return `<td class="${k.cl}">${k.t}</td>`; }).join('')}
      <td>${x.vu ? depuis(x.vu) : '—'}</td>
      <td><button class="retirer" data-eleve="${esc(x.e.id)}" data-qui="${esc(appel(x))}" aria-label="Retirer ${esc(appel(x))}" title="Retirer cet élève">✕</button></td></tr>`).join('');
    vue.innerHTML = `
      <a class="l-fil" href="#classes">← Mes classes</a>
      <div class="l-titre" style="${niv(c.niveau)}">
        <div><h1>${esc(c.nom)} <span class="pastille" style="vertical-align:middle">${c.niveau}</span></h1>
          <p>Code de la classe : <span class="l-code">${esc(c.code)}</span> ${BOUTON_COPIER}</p></div>
        <div class="actions"><a class="btn" href="#classe/${esc(c.id)}/codes">Fiche des codes</a><button class="lien-btn" id="csv">Exporter en CSV</button></div>
      </div>
      <ul class="l-chiffres">
        <li><b>${A.eleves.length}</b><span>${A.eleves.length > 1 ? 'élèves' : 'élève'}, dont ${A.actifs.length} ${A.actifs.length > 1 ? 'ont' : 'a'} commencé</span></li>
        <li><b>${A.moyenneFaits.toFixed(1).replace('.', ',')}</b><span>modules terminés par élève, sur ${A.liste.length}</span></li>
        <li><b>${A.scoreMoyen == null ? '—' : pct(A.scoreMoyen)}</b><span>score moyen aux modules terminés</span></li>
      </ul>
      <div class="l-deux">
        <section class="l-bloc"><h2>Ce qui résiste</h2>${A.resiste.length ? `<ul class="l-constat">${A.resiste.map(m => `<li><span>${esc(nomMod(m.id))}<small>${pl(m.n, 'élève')} l’${m.n > 1 ? 'ont' : 'a'} terminé</small></span><b>${pct(m.moyenne)}</b></li>`).join('')}</ul>`
          : `<p class="petit" style="margin:0">${A.assez ? 'Aucun module ne se détache : les scores moyens dépassent tous 70 %.' : 'Pas encore assez de modules terminés pour comparer.'}</p>`}</section>
        <section class="l-bloc"><h2>À relancer</h2>${A.relancer.length ? `<ul class="l-constat">${A.relancer.slice(0, 6).map(r => `<li><span>${esc(appel(r.x))}<small>${esc(r.raison)}</small></span></li>`).join('')}</ul>${A.relancer.length > 6 ? `<p class="petit" style="margin:10px 0 0">et ${pl(A.relancer.length - 6, 'autre élève', 'autres élèves')}</p>` : ''}`
          : `<p class="petit" style="margin:0">${A.eleves.length ? 'Personne à relancer : tout le monde a travaillé ces deux dernières semaines.' : 'Ajoutez des élèves pour commencer.'}</p>`}</section>
      </div>
      <div class="l-outils">
        <label class="champ">Parcours suivi<select id="parcours">${options}</select></label>
      </div>
      <div class="tableau-zone"><table class="classe">${tete}<tbody>${corps || `<tr><td colspan="${A.liste.length + 5}">Aucun élève dans cette classe.</td></tr>`}</tbody></table></div>
      <p class="legende"><span class="c-ok">&nbsp;✓ 85&nbsp;%&nbsp;</span> terminé, avec le meilleur score · <span class="c-encours">&nbsp;40&nbsp;%&nbsp;</span> part du livre faite · <span class="c-vide">—</span> pas commencé. Les noms que vous écrivez dans le tableau sont gardés sur ce poste et nulle part ailleurs : la fiche des codes imprimée fait le lien entre un nom et un code.</p>
      <h2 class="l-h2">Gérer la classe</h2>
      <div class="l-deux">
        <form class="l-bloc" id="ajout"><h2>Ajouter des élèves</h2>
          <label class="champ">Combien ?<input name="n" type="number" inputmode="numeric" min="1" max="20" value="1"></label>
          <button class="lien-btn">Ajouter et créer les codes</button></form>
        <form class="l-bloc" id="coller"><h2>Coller une liste de noms</h2>
          <label class="champ">Un nom par ligne, dans l’ordre des numéros<textarea name="liste" rows="3"></textarea></label>
          <button class="lien-btn">Placer les noms</button></form>
      </div>
      <p style="margin-top:22px"><button class="lien-btn danger" id="supprimer">Supprimer la classe et toutes ses données</button></p>`;

    $('#copier').onclick = (e) => copier(c.code, e.currentTarget);
    $('#parcours').onchange = async (e) => { try { await LUMI.modifierClasse(c.id, { parcours_id: e.target.value || null }); dire('Parcours de la classe mis à jour.'); redessiner(() => vueClasse(id)); } catch (err) { dire(err.message); } };
    vue.querySelectorAll('input.nom').forEach(i => { i.onchange = () => { LUMI.nommer(c.code, i.dataset.code, i.value.trim()); dire('Nom gardé sur ce poste.'); }; });
    vue.querySelectorAll('button.retirer').forEach(b => { b.onclick = async () => {
      if (!(await confirmer({ titre: 'Retirer ' + b.dataset.qui + ' ?', texte: 'Son code ne fonctionnera plus et sa progression sera effacée. Cette suppression est définitive.', oui: 'Retirer l’élève', danger: true }))) return;
      await LUMI.retirerEleve(b.dataset.eleve); dire('Élève retiré.'); redessiner(() => vueClasse(id));
    }; });
    $('#ajout').onsubmit = async (e) => { e.preventDefault(); const n = await LUMI.ajouterEleves(c.id, e.target.n.value); dire(n ? pl(n, 'élève ajouté', 'élèves ajoutés') + '.' : 'La classe est complète (60 élèves).'); redessiner(() => vueClasse(id)); };
    $('#coller').onsubmit = (e) => {
      e.preventDefault();
      const L = e.target.liste.value.split('\n').map(x => x.trim()).filter(Boolean);
      if (!L.length) return dire('Collez d’abord une liste, un nom par ligne.');
      d.eleves.forEach((el, k) => { if (L[k]) LUMI.nommer(c.code, el.code, L[k].slice(0, 60)); });
      dire(pl(Math.min(L.length, d.eleves.length), 'nom placé', 'noms placés') + (L.length > d.eleves.length ? ' ; ' + pl(L.length - d.eleves.length, 'nom', 'noms') + ' en trop.' : '.')); redessiner(() => vueClasse(id));
    };
    $('#supprimer').onclick = async () => {
      if (!(await confirmer({ titre: 'Supprimer ' + c.nom + ' ?', texte: 'Les ' + A.eleves.length + ' codes cesseront de fonctionner, la progression et les noms gardés sur ce poste seront effacés. Cette suppression est définitive.', oui: 'Supprimer la classe', danger: true }))) return;
      await LUMI.supprimerClasse(c.id); location.hash = '#classes'; dire('Classe supprimée.');
    };
    $('#csv').onclick = () => {
      const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      const rows = [['N°', 'Nom', 'Code', 'Terminés', ...A.liste.map(nomMod), 'Dernière activité'].map(q).join(';')];
      A.eleves.forEach(x => rows.push([x.e.numero, x.nom, x.e.code, x.faits + '/' + A.liste.length, ...A.liste.map(m => cellule(x.p[m]).csv), x.vu ? new Date(x.vu).toLocaleDateString('fr-FR') : ''].map(q).join(';')));
      telecharger('suivi-' + c.nom.replace(/[^A-Za-z0-9]+/g, '-') + '.csv', '﻿' + rows.join('\r\n'), 'text/csv;charset=utf-8');
    };
  }

  async function vueCodes(id) {
    const d = await LUMI.classe(id), c = d.classe, noms = LUMI.noms(c.code), adresse = adresseEleve();
    document.title = 'Fiche des codes · ' + c.nom + ' · Lümi';
    vue.innerHTML = `
      <a class="l-fil no-print" href="#classe/${esc(c.id)}">← ${esc(c.nom)}</a>
      <div class="l-titre"><div><h1>Fiche des codes · ${esc(c.nom)}</h1>
        <p class="no-print">Imprimez, écrivez les noms manquants à la main, découpez. Gardez un exemplaire entier : c’est lui qui fait le lien entre un nom et un code.</p></div>
        <div class="actions no-print"><button class="btn" id="imprimer">Imprimer</button></div></div>
      <div class="fiche">${d.eleves.map(e => `<div class="etiquette">
        <div class="qui"><span>${esc(noms[e.code] || '')}</span><span>n° ${e.numero}</span></div>
        <dl><dt>Classe</dt><dd>${esc(c.code)}</dd><dt>Ton code</dt><dd>${esc(e.code)}</dd></dl>
        <p class="adresse">${esc(adresse)}</p></div>`).join('')}</div>`;
    $('#imprimer').onclick = () => print();
  }

  /* ---------- parcours ---------- */
  const listeOl = (ids) => `<ol class="l-liste-mod">${ids.filter(i => parId.has(i)).map(i => `<li>${esc(nomMod(i))}</li>`).join('')}</ol>`;
  let filtre = '';
  async function vueParcours() {
    document.title = 'Parcours · Lümi';
    const [miens, biblio] = await Promise.all([LUMI.parcours(), LUMI.bibliotheque()]);
    const mien = (p) => `<article class="l-carte" style="${niv(p.niveau)}">
      <div class="haut"><h3>${esc(p.titre)}</h3><span class="pastille">${p.niveau}</span></div>
      ${p.description ? `<p>${esc(p.description)}</p>` : ''}${listeOl(p.modules)}
      <p class="l-meta">${p.public ? '<span class="etiq pub">Partagé</span>' : '<span class="etiq">Privé</span>'} ${p.classes.length ? 'Suivi par ' + esc(p.classes.join(', ')) : 'Aucune classe ne le suit'}${p.reprises ? ' · repris ' + p.reprises + ' fois' : ''}${p.origine_id ? ' · d’après un parcours partagé' : ''}</p>
      <div class="bas"><a class="lien-btn" href="#parcours/${esc(p.id)}">Modifier</a><button class="lien-btn" data-dupliquer="${esc(p.id)}">Dupliquer</button><button class="lien-btn danger" data-supprimer="${esc(p.id)}" data-titre="${esc(p.titre)}" data-classes="${p.classes.length}">Supprimer</button></div></article>`;
    const partage = (p) => `<article class="l-carte" style="${niv(p.niveau)}">
      <div class="haut"><h3>${esc(p.titre)}</h3><span class="pastille">${p.niveau}</span></div>
      ${p.description ? `<p>${esc(p.description)}</p>` : ''}${listeOl(p.modules)}
      <p class="l-meta">${esc(p.auteur)} · ${esc(p.etablissement)}${p.ville ? ', ' + esc(p.ville) : ''}<br>mis à jour ${depuis(p.maj_le)}${p.reprises ? ' · repris ' + p.reprises + ' fois' : ''}</p>
      <div class="bas"><button class="btn" data-reprendre="${esc(p.id)}">Ajouter à mes parcours</button></div></article>`;
    const vus = biblio.filter(p => !filtre || p.niveau === filtre);
    vue.innerHTML = `
      <div class="l-titre"><div><h1>Parcours</h1><p>Un parcours est une suite de modules dans l’ordre que vous choisissez. Sans parcours, une classe suit tous les modules de son niveau.</p></div>
        <a class="btn" href="#parcours/nouveau">Nouveau parcours</a></div>
      <h2 class="l-h2" style="margin-top:0">Mes parcours</h2>
      ${miens.length ? `<div class="l-grille">${miens.map(mien).join('')}</div>` : `<div class="l-vide"><strong>Aucun parcours à vous pour l’instant</strong>Composez le vôtre, ou reprenez-en un dans la bibliothèque ci-dessous.</div>`}
      <div class="l-titre" style="margin:44px 0 14px"><div><h2 class="l-h2" style="margin:0">Bibliothèque partagée</h2><p>Les parcours publiés par des enseignants d’autres collèges. Vous en faites une copie, que vous adaptez librement.</p></div>
        <label class="champ" style="margin:0;min-width:150px">Niveau<select id="filtre"><option value="">Tous</option>${LUMI.NIVEAUX.map(n => `<option${n === filtre ? ' selected' : ''}>${n}</option>`).join('')}</select></label></div>
      ${vus.length ? `<div class="l-grille">${vus.map(partage).join('')}</div>` : `<div class="l-vide"><strong>Rien de partagé ${filtre ? 'pour la ' + filtre : ''} pour l’instant</strong>Soyez le premier : cochez « Partager » en enregistrant l’un de vos parcours.</div>`}`;
    $('#filtre').onchange = (e) => { filtre = e.target.value; redessiner(() => vueParcours()); };
    vue.querySelectorAll('[data-reprendre]').forEach(b => { b.onclick = async () => { try { const n = await LUMI.dupliquerParcours(b.dataset.reprendre); dire('Copie ajoutée à vos parcours. Vous pouvez la modifier.'); location.hash = '#parcours/' + n; } catch (e) { dire(e.message); } }; });
    vue.querySelectorAll('[data-dupliquer]').forEach(b => { b.onclick = async () => { await LUMI.dupliquerParcours(b.dataset.dupliquer); dire('Parcours dupliqué.'); redessiner(() => vueParcours()); }; });
    vue.querySelectorAll('[data-supprimer]').forEach(b => { b.onclick = async () => {
      const n = +b.dataset.classes;
      if (!(await confirmer({ titre: 'Supprimer « ' + b.dataset.titre + ' » ?', texte: (n ? pl(n, 'classe') + ' le ' + (n > 1 ? 'suivent' : 'suit') + ' : ' + (n > 1 ? 'elles reviendront' : 'elle reviendra') + ' à tous les modules de son niveau. ' : '') + 'La progression des élèves est conservée.', oui: 'Supprimer le parcours', danger: true }))) return;
      await LUMI.supprimerParcours(b.dataset.supprimer); dire('Parcours supprimé.'); redessiner(() => vueParcours());
    }; });
  }

  async function vueEditeur(id) {
    const nouveau = id === 'nouveau';
    const p = nouveau ? { titre: '', description: '', niveau: '5e', modules: [], public: false, classes: [] } : (await LUMI.parcours()).find(x => x.id === id);
    if (!p) throw new Error('Ce parcours n’existe pas ou n’est pas le vôtre.');
    document.title = (nouveau ? 'Nouveau parcours' : p.titre) + ' · Lümi';
    let choisis = p.modules.filter(i => parId.has(i));
    vue.innerHTML = `
      <a class="l-fil" href="#parcours">← Parcours</a>
      <div class="l-titre"><div><h1>${nouveau ? 'Nouveau parcours' : 'Modifier le parcours'}</h1>
        ${p.classes.length ? `<p>Suivi par ${esc(p.classes.join(', '))} : vos changements s’appliquent dès l’enregistrement.</p>` : ''}</div></div>
      <form id="f" novalidate>
        <p class="l-alerte" role="alert"></p>
        <div class="l-editeur">
          <div class="l-bloc">
            <label class="champ">Titre<input name="titre" maxlength="120" value="${esc(p.titre)}" placeholder="Semaine de la presse en 5e" required></label>
            <label class="champ">À quoi sert ce parcours ? <small>Deux lignes pour vos élèves et pour les collègues qui le reprendront.</small><textarea name="description" maxlength="1000" rows="3">${esc(p.description)}</textarea></label>
            <label class="champ">Niveau visé<select name="niveau">${LUMI.NIVEAUX.map(n => `<option${n === p.niveau ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
            <label class="coche"><input type="checkbox" name="public"${p.public ? ' checked' : ''}><span>Partager dans la bibliothèque<small>Les enseignants des autres collèges le verront, avec votre nom (${esc(session.enseignant.nom)}) et celui de votre collège. Vos classes et vos élèves ne sont jamais visibles.</small></span></label>
          </div>
          <div class="l-bloc"><h2>Modules du parcours, dans l’ordre</h2>
            <ol class="ordre" id="ordre"></ol>
            <p class="petit" id="vide-ordre" style="margin:0">Cochez des modules ci-dessous : ils viendront se ranger ici.</p></div>
        </div>
        <h2 class="l-h2">Choisir les modules</h2>
        <div id="choix"></div>
        <div class="l-pied-form"><button class="btn">${nouveau ? 'Créer le parcours' : 'Enregistrer'}</button><a class="lien-btn" href="#parcours">Annuler</a></div>
      </form>`;
    const f = $('#f'), ordre = $('#ordre'), choix = $('#choix');
    choix.innerHTML = LUMI.NIVEAUX.map(n => `<details class="choix-niveau" style="${niv(n)}"${n === p.niveau ? ' open' : ''} data-niveau="${n}">
      <summary>Modules de ${n}<span class="l-meta" data-compte="${n}"></span></summary>
      ${mods.filter(m => m.niveau === n).map(m => `<label><input type="checkbox" value="${esc(m.id)}"><span class="n">${m.num || 'GM'}</span><span>${esc(m.titre)}</span><a href="module.html?m=${encodeURIComponent(m.id)}&apercu=1" target="_blank" rel="noopener">Aperçu</a></label>`).join('')}</details>`).join('');
    function peindre(focus) {
      ordre.innerHTML = choisis.map((i, k) => `<li data-id="${esc(i)}"><span class="t">${esc(nomMod(i))}</span>
        <button type="button" data-k="${k}" data-d="-1" aria-label="Monter ${esc(parId.get(i).titre)}"${k ? '' : ' disabled'}>↑</button>
        <button type="button" data-k="${k}" data-d="1" aria-label="Descendre ${esc(parId.get(i).titre)}"${k < choisis.length - 1 ? '' : ' disabled'}>↓</button>
        <button type="button" data-k="${k}" data-d="0" aria-label="Enlever ${esc(parId.get(i).titre)}">✕</button></li>`).join('');
      $('#vide-ordre').hidden = !!choisis.length;
      choix.querySelectorAll('input').forEach(c => { c.checked = choisis.includes(c.value); });
      LUMI.NIVEAUX.forEach(n => { const k = choisis.filter(i => parId.get(i).niveau === n).length; choix.querySelector(`[data-compte="${n}"]`).textContent = k ? pl(k, 'choisi') : ''; });
      if (focus) { const b = ordre.querySelector(`[data-k="${focus.k}"][data-d="${focus.d}"]:not(:disabled)`) || ordre.querySelector('button:not(:disabled)'); if (b) b.focus(); }
    }
    ordre.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const k = +b.dataset.k, d = +b.dataset.d;
      const anime = !auClavier && e.detail > 0;
      if (!d) { choisis.splice(k, 1); LUMI_FX.deplacer(ordre, 'id', () => peindre({ k: Math.min(k, choisis.length - 1), d: 0 }), anime); return; }
      [choisis[k], choisis[k + d]] = [choisis[k + d], choisis[k]]; LUMI_FX.deplacer(ordre, 'id', () => peindre({ k: k + d, d }), anime);
    };
    choix.onchange = (e) => { const c = e.target; if (c.type !== 'checkbox') return; if (c.checked) { if (choisis.length < 40) choisis.push(c.value); } else choisis = choisis.filter(i => i !== c.value); LUMI_FX.deplacer(ordre, 'id', () => peindre(), !auClavier); };
    f.niveau.onchange = () => { const d = choix.querySelector(`[data-niveau="${f.niveau.value}"]`); if (d) d.open = true; };
    peindre();
    f.onsubmit = async (e) => {
      e.preventDefault();
      try {
        await occuper(f.querySelector('.btn'), 'Enregistrement…', () => LUMI.enregistrerParcours({ id: nouveau ? null : p.id, titre: f.titre.value, description: f.description.value, niveau: f.niveau.value, modules: choisis, public: f.public.checked }));
        location.hash = '#parcours'; dire(nouveau ? 'Parcours créé.' : 'Parcours enregistré.');
      } catch (err) { alerter(err); }
    };
  }

  /* ---------- mon collège ---------- */
  async function vueCollege() {
    document.title = 'Mon collège · Lümi';
    const t = session.etablissement;
    vue.className = 'l-page etroit';
    vue.innerHTML = `
      <div class="l-titre"><h1>Mon collège</h1></div>
      <form class="l-bloc" id="f"><h2>Identité</h2>
        <label class="champ">Votre nom<input name="nom" maxlength="80" value="${esc(session.enseignant.nom)}" required></label>
        <label class="champ">Nom du collège<input name="etablissement" maxlength="120" value="${esc(t.nom)}" required></label>
        <label class="champ">Ville<input name="ville" maxlength="80" value="${esc(t.ville)}"></label>
        <button class="btn">Enregistrer</button></form>
      <div class="l-bloc"><h2>Inviter un collègue du collège</h2>
        <p style="margin:0 0 12px;color:var(--encre-2)">Donnez-lui ce code : à l’inscription, il rejoindra ${esc(t.nom)}. Chacun garde ses classes, que l’autre ne voit pas.</p>
        <p style="margin:0"><span class="l-code">${esc(t.invitation)}</span> ${BOUTON_COPIER}</p>
        ${session.collegues.length ? `<p class="petit" style="margin:14px 0 0">Déjà inscrits : ${esc(session.collegues.join(', '))}.</p>` : ''}</div>
      <div class="l-bloc"><h2>Ce que Lümi enregistre</h2>
        <ul style="margin:0;padding-left:1.2em;color:var(--encre-2)">
          <li>Pour vous : votre nom, votre collège, vos classes et vos parcours.</li>
          <li>Pour chaque élève : un numéro, un code, et sa progression dans les modules. Ni nom, ni adresse, ni date de naissance.</li>
          <li>Les noms que vous tapez dans un tableau de classe restent sur ce poste.</li>
          <li>Supprimer une classe efface ses codes et toute sa progression.</li>
        </ul></div>`;
    $('#copier').onclick = (e) => copier(t.invitation, e.currentTarget);
    $('#f').onsubmit = async (e) => { e.preventDefault(); const f = e.target; session = await LUMI.modifierCompte({ nom: f.nom.value, etablissement: f.etablissement.value, ville: f.ville.value }); $('#qui').textContent = session.enseignant.nom; dire('Enregistré.'); };
  }

  route();
})();
