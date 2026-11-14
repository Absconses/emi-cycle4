/* Lümi · couche de données.
 * Toutes les pages passent par window.LUMI ; aucune ne sait où les données sont rangées.
 * Deux moteurs possibles derrière la même interface :
 *   - « démo » (ci-dessous) : tout est dans le navigateur, avec un collège fictif déjà rempli ;
 *   - « base » : le projet Supabase décrit dans base/schema.sql (branché à l'étape suivante).
 * Le moteur démo applique les mêmes règles que la base : un enseignant ne voit que ses classes,
 * un élève n'entre qu'avec le code de sa classe et son code personnel. */
window.LUMI = (function () {
  const CONFIG = window.LUMI_CONFIG || {};
  const DEMO = !CONFIG.url;
  const NIVEAUX = ['5e', '4e', '3e'];
  const erreur = (code, message) => Object.assign(new Error(message || code), { code });

  /* ---------- catalogue des modules (celui de la plateforme EMI cycle 4) ---------- */
  let _mods;
  const modules = () => _mods || (_mods = fetch('../modules.json').then(r => r.json()));

  /* ---------- codes ---------- */
  const hasard = (n) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
  const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // ni 0/O ni 1/I/L : se dicte sans erreur
  const codeLisible = (n, alea = hasard) => Array.from({ length: n }, () => ALPHA[alea(ALPHA.length)]).join('');
  // deux mots et deux chiffres : facile à taper pour un élève, sans rapport avec son nom
  const MOTS = ('renard hibou lune riviere nuage comete galet fougere lynx castor heron sapin orage braise corail dune eclair falaise givre hetre iris jade koala lagune mesange noisette ocean pivert quartz roseau saule tigre vague zebre ambre bison cedre daim erable faucon geai hermine ibis jonc kiwi loutre merle narval orme panda requin sable truite vison wapiti yack zenith aube brume cime delta etoile foret glacier houle ile jungle lac marais neige oasis prairie recif source toundra vallee volcan abeille belette chamois dauphin ecureuil flamant gazelle hamster impala jaguar lezard marmotte otarie pingouin raton tortue vautour basalte cristal granit opale silex topaze boussole lanterne plume encrier loupe carnet atlas globe phare ancre voile radeau sentier cabane tente torche').split(' ');
  const codeEleve = (alea = hasard) => MOTS[alea(MOTS.length)] + '-' + MOTS[alea(MOTS.length)] + '-' + String(10 + alea(90));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + '-' + hasard(1e9).toString(36));

  /* ---------- noms des élèves : jamais envoyés, gardés sur l'appareil de l'enseignant ---------- */
  const CLE_NOMS = 'lumi-noms';
  const tousLesNoms = () => { try { return JSON.parse(localStorage.getItem(CLE_NOMS)) || {}; } catch (e) { return {}; } };
  const noms = (codeClasse) => tousLesNoms()[codeClasse] || {};
  const nommer = (codeClasse, codeEl, nom) => {
    const t = tousLesNoms(); t[codeClasse] = t[codeClasse] || {};
    if (nom) t[codeClasse][codeEl] = nom; else delete t[codeClasse][codeEl];
    try { localStorage.setItem(CLE_NOMS, JSON.stringify(t)); } catch (e) {}
  };
  const oublierNoms = (codeClasse) => { const t = tousLesNoms(); delete t[codeClasse]; try { localStorage.setItem(CLE_NOMS, JSON.stringify(t)); } catch (e) {} };

  /* ---------- séance de l'élève : les deux codes, le temps de l'onglet ---------- */
  const CLE_ELEVE = 'lumi-eleve';
  const eleveCodes = () => { try { return JSON.parse(sessionStorage.getItem(CLE_ELEVE)); } catch (e) { return null; } };
  const garderEleve = (c) => { try { c ? sessionStorage.setItem(CLE_ELEVE, JSON.stringify(c)) : sessionStorage.removeItem(CLE_ELEVE); } catch (e) {} };
  const net = { classe: (s) => String(s || '').trim().toUpperCase().replace(/\s+/g, ''), code: (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/-+/g, '-') };

  /* ====================================================================== moteur démo */
  function moteurDemo() {
    const CLE = 'lumi-demo-2', CLE_SESSION = 'lumi-demo-session', CLE_ETAT = 'lumi-demo-etat-';
    const lire = () => { try { return JSON.parse(localStorage.getItem(CLE)); } catch (e) { return null; } };
    const ecrire = (db) => { try { localStorage.setItem(CLE, JSON.stringify(db)); } catch (e) {} };
    const base = async () => { let db = lire(); if (!db) { db = semer(await modules()); ecrire(db); } return db; };
    // comme dans la base : lire, modifier, tout réécrire d'un coup
    const changer = async (f) => { const db = await base(); const r = f(db); ecrire(db); return r; };
    const moi = () => { try { return localStorage.getItem(CLE_SESSION); } catch (e) { return null; } };
    const exiger = (db) => { const e = db.enseignants.find(x => x.id === moi()); if (!e) throw erreur('non_connecte', 'Connectez-vous pour continuer.'); return e; };
    const maClasse = (db, id) => { const e = exiger(db), c = db.classes.find(x => x.id === id && x.enseignant_id === e.id); if (!c) throw erreur('introuvable', 'Cette classe n’existe pas ou n’est pas la vôtre.'); return c; };
    const monParcours = (db, id) => { const e = exiger(db), p = db.parcours.find(x => x.id === id && x.auteur_id === e.id); if (!p) throw erreur('introuvable', 'Ce parcours n’existe pas ou n’est pas le vôtre.'); return p; };
    const maintenant = () => new Date().toISOString();

    function semer(mods) {
      // hasard reproductible : la démo est la même pour tout le monde
      let g = 20261114;
      const rnd = () => { g |= 0; g = g + 0x6D2B79F5 | 0; let t = Math.imul(g ^ g >>> 15, 1 | g); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      const alea = (n) => Math.floor(rnd() * n);
      const parNum = (...nums) => nums.map(n => (mods.find(m => m.num === n) || {}).id).filter(Boolean);
      const duNiveau = (n) => mods.filter(m => m.niveau === n).map(m => m.id);
      const jour = 864e5, t0 = Date.now();
      const db = {
        etablissements: [
          { id: 'etab-source', nom: 'Collège de la Source (fictif)', ville: 'Démoville', invitation: 'SRC2026A' },
          { id: 'etab-vents', nom: 'Collège des Quatre-Vents (fictif)', ville: 'Exemple-sur-Mer', invitation: codeLisible(8, alea) },
          { id: 'etab-port', nom: 'Collège du Vieux-Pont (fictif)', ville: 'Saint-Modèle', invitation: codeLisible(8, alea) },
        ],
        enseignants: [
          { id: 'ens-demo', etablissement_id: 'etab-source', nom: 'Camille Démo' },
          { id: 'ens-collegue', etablissement_id: 'etab-source', nom: 'Dominique Essai' },
          { id: 'ens-vents', etablissement_id: 'etab-vents', nom: 'N. Lambert' },
          { id: 'ens-port', etablissement_id: 'etab-port', nom: 'J. Roussel' },
        ],
        parcours: [
          { id: 'p-verifier', auteur_id: 'ens-demo', titre: 'Vérifier avant de partager', niveau: '4e', public: false, origine_id: null,
            description: 'Trois séances autour de la rumeur : la reconnaître, la vérifier, puis publier dans les règles.',
            modules: parNum('4.9', '4.6', '4.8') },
          { id: 'p-presse', auteur_id: 'ens-vents', titre: 'Semaine de la presse en 5e', niveau: '5e', public: true, origine_id: null, reprises: 6,
            description: 'Trois séances pour la Semaine de la presse : qui fait l’information, comment elle est écrite, à qui se fier.',
            modules: parNum('5.2', '5.3', '5.6') },
          { id: 'p-ia', auteur_id: 'ens-port', titre: 'IA générative : comprendre, vérifier, produire', niveau: '3e', public: true, origine_id: null, reprises: 11,
            description: 'Un parcours court pour la 3e : comparer moteur et IA, vérifier une image, puis produire avec l’IA en responsable.',
            modules: parNum('3.4', '3.6', '3.8') },
          { id: 'p-argent', auteur_id: 'ens-vents', titre: 'Qui paie, qui parle ?', niveau: '4e', public: true, origine_id: null, reprises: 3,
            description: 'L’économie des médias en 4e, avant un travail sur la ligne éditoriale avec le professeur de français.',
            modules: parNum('4.1', '4.2', '4.3') },
          { id: 'p-oral', auteur_id: 'ens-port', titre: 'Préparer l’oral du brevet avec des sources', niveau: '3e', public: true, origine_id: null, reprises: 2,
            description: 'Mener une recherche, en faire une synthèse et s’entraîner à débattre en citant ses sources.',
            modules: parNum('3.5', '3.7') },
        ].map(p => Object.assign({ cree_le: new Date(t0 - (20 + alea(60)) * jour).toISOString(), maj_le: new Date(t0 - alea(18) * jour).toISOString() }, p)),
        classes: [
          { id: 'c-5a', enseignant_id: 'ens-demo', nom: '5e A', niveau: '5e', code: 'SRC5EA', parcours_id: null, cree_le: new Date(t0 - 62 * jour).toISOString() },
          { id: 'c-4c', enseignant_id: 'ens-demo', nom: '4e C', niveau: '4e', code: 'SRC4EC', parcours_id: 'p-verifier', cree_le: new Date(t0 - 40 * jour).toISOString() },
        ],
        eleves: [], progression: [],
      };
      // des élèves aux rythmes différents, un module qui résiste, deux élèves décrochés
      const peupler = (classe, effectif, liste, dur) => {
        const pris = new Set();
        for (let n = 1; n <= effectif; n++) {
          let code; do { code = codeEleve(alea); } while (pris.has(code)); pris.add(code);
          const el = { id: classe.id + '-e' + n, classe_id: classe.id, numero: n, code };
          db.eleves.push(el);
          const absent = n === 7 || n === 19, rythme = absent ? 0 : .25 + rnd() * .85, niveau = .45 + rnd() * .5;
          const faits = Math.min(liste.length, Math.round(rythme * liste.length * .85));
          const dernier = t0 - (n === 12 ? 23 : alea(9)) * jour - alea(8) * 36e5;
          liste.forEach((id, k) => {
            if (k > faits || absent) return;
            const fini = k < faits, base = Math.max(.15, Math.min(1, niveau + (rnd() - .5) * .3 - (id === dur ? .32 : 0)));
            db.progression.push({ eleve_id: el.id, module_id: id,
              avance: fini ? 1 : Math.round((.2 + rnd() * .6) * 10) / 10,
              score: fini ? Math.round(base * 100) / 100 : Math.round(base * rnd() * 60) / 100,
              meilleur: fini ? Math.round(base * 100) / 100 : Math.round(base * rnd() * 60) / 100,
              termine_le: fini ? new Date(dernier - (faits - k) * 5 * jour).toISOString() : null,
              vu_le: new Date(dernier - (fini ? (faits - k) * 5 * jour : 0)).toISOString() });
          });
        }
      };
      peupler(db.classes[0], 26, duNiveau('5e'), parNum('5.3')[0]);
      peupler(db.classes[1], 24, parNum('4.9', '4.6', '4.8'), parNum('4.6')[0]);
      // l'élève qui sert à l'essai « comme élève » a un code connu
      db.eleves.find(e => e.id === 'c-5a-e1').code = 'renard-lune-47';
      return db;
    }

    const vueSession = (db) => {
      const e = db.enseignants.find(x => x.id === moi()); if (!e) return null;
      const t = db.etablissements.find(x => x.id === e.etablissement_id);
      return { enseignant: { id: e.id, nom: e.nom }, etablissement: Object.assign({}, t),
        collegues: db.enseignants.filter(x => x.etablissement_id === t.id && x.id !== e.id).map(x => x.nom) };
    };
    const ouvrirSession = (id) => { try { id ? localStorage.setItem(CLE_SESSION, id) : localStorage.removeItem(CLE_SESSION); } catch (e) {} };
    const vueParcours = (db, p) => Object.assign({}, p, { modules: p.modules.slice(),
      classes: db.classes.filter(c => c.parcours_id === p.id).map(c => c.nom),
      reprises: (p.reprises || 0) + db.parcours.filter(d => d.origine_id === p.id).length });
    const controlerParcours = (p, mods) => {
      const titre = String(p.titre || '').trim();
      if (titre.length < 3) throw erreur('titre', 'Donnez un titre d’au moins 3 caractères au parcours.');
      if (!NIVEAUX.includes(p.niveau)) throw erreur('niveau', 'Choisissez un niveau.');
      const ids = (p.modules || []).filter(id => mods.some(m => m.id === id));
      if (!ids.length) throw erreur('modules', 'Choisissez au moins un module.');
      return { titre: titre.slice(0, 120), description: String(p.description || '').trim().slice(0, 1000), niveau: p.niveau, modules: ids.slice(0, 40), public: !!p.public };
    };
    const ajouter = (db, classe, n) => {
      const pris = new Set(db.eleves.filter(e => e.classe_id === classe.id).map(e => e.code));
      let numero = Math.max(0, ...db.eleves.filter(e => e.classe_id === classe.id).map(e => e.numero));
      const places = Math.max(0, Math.min(n, 60 - pris.size));
      for (let k = 0; k < places; k++) {
        let code; do { code = codeEleve(); } while (pris.has(code)); pris.add(code);
        db.eleves.push({ id: uid(), classe_id: classe.id, numero: ++numero, code });
      }
      return places;
    };
    const trouverEleve = (db, c) => {
      const classe = c && db.classes.find(x => x.code === net.classe(c.classe));
      const el = classe && db.eleves.find(x => x.classe_id === classe.id && x.code === net.code(c.code));
      if (!el) throw erreur('code_inconnu', 'Ces codes ne correspondent à aucun élève. Vérifie le code de ta classe et ton code personnel.');
      return { el, classe };
    };

    return {
      async session() { return vueSession(await base()); },
      async connecter() { const db = await base(); ouvrirSession('ens-demo'); return vueSession(db); },
      async inscrire({ nom, etablissement, ville, invitation }) {
        nom = String(nom || '').trim();
        if (nom.length < 2) throw erreur('nom', 'Indiquez votre nom.');
        return changer(db => {
          let t;
          if (invitation) {
            t = db.etablissements.find(x => x.invitation === net.classe(invitation));
            if (!t) throw erreur('invitation_inconnue', 'Ce code d’invitation ne correspond à aucun collège.');
          } else {
            if (String(etablissement || '').trim().length < 2) throw erreur('etablissement', 'Indiquez le nom de votre collège.');
            t = { id: uid(), nom: String(etablissement).trim().slice(0, 120), ville: String(ville || '').trim().slice(0, 80), invitation: codeLisible(8) };
            db.etablissements.push(t);
          }
          const e = { id: uid(), etablissement_id: t.id, nom: nom.slice(0, 80) };
          db.enseignants.push(e); ouvrirSession(e.id);
          return vueSession(db);
        });
      },
      async deconnecter() { ouvrirSession(null); },
      async modifierCompte({ nom, etablissement, ville }) {
        return changer(db => {
          const e = exiger(db), t = db.etablissements.find(x => x.id === e.etablissement_id);
          if (nom != null && String(nom).trim().length >= 2) e.nom = String(nom).trim().slice(0, 80);
          if (etablissement != null && String(etablissement).trim().length >= 2) t.nom = String(etablissement).trim().slice(0, 120);
          if (ville != null) t.ville = String(ville).trim().slice(0, 80);
          return vueSession(db);
        });
      },

      async classes() {
        const db = await base(), e = exiger(db);
        return db.classes.filter(c => c.enseignant_id === e.id).map(c => {
          const el = db.eleves.filter(x => x.classe_id === c.id), ids = new Set(el.map(x => x.id));
          const p = db.parcours.find(x => x.id === c.parcours_id);
          return Object.assign({}, c, { effectif: el.length, parcours_titre: p ? p.titre : null, parcours_modules: p ? p.modules.slice() : null,
            termines: db.progression.filter(g => ids.has(g.eleve_id) && g.termine_le).length });
        }).sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true }));
      },
      async classe(id) {
        const db = await base(), c = maClasse(db, id);
        const el = db.eleves.filter(x => x.classe_id === c.id).sort((a, b) => a.numero - b.numero), ids = new Set(el.map(x => x.id));
        const p = db.parcours.find(x => x.id === c.parcours_id);
        return { classe: Object.assign({}, c), parcours: p ? vueParcours(db, p) : null, eleves: el.map(x => Object.assign({}, x)),
          progression: db.progression.filter(g => ids.has(g.eleve_id)).map(g => ({ eleve_id: g.eleve_id, module_id: g.module_id, avance: g.avance, score: g.score, meilleur: g.meilleur, termine: !!g.termine_le, vu: g.vu_le })) };
      },
      async creerClasse({ nom, niveau, parcours_id, effectif }) {
        nom = String(nom || '').trim();
        if (!nom) throw erreur('nom', 'Donnez un nom à la classe, par exemple « 5e A ».');
        if (!NIVEAUX.includes(niveau)) throw erreur('niveau', 'Choisissez un niveau.');
        return changer(db => {
          const e = exiger(db);
          if (parcours_id) monParcours(db, parcours_id);
          let code; do { code = codeLisible(6); } while (db.classes.some(c => c.code === code));
          const c = { id: uid(), enseignant_id: e.id, nom: nom.slice(0, 30), niveau, code, parcours_id: parcours_id || null, cree_le: maintenant() };
          db.classes.push(c); ajouter(db, c, Math.max(0, Math.min(60, +effectif || 0)));
          return c.id;
        });
      },
      async modifierClasse(id, { nom, parcours_id }) {
        return changer(db => {
          const c = maClasse(db, id);
          if (nom != null && String(nom).trim()) c.nom = String(nom).trim().slice(0, 30);
          if (parcours_id !== undefined) { if (parcours_id) monParcours(db, parcours_id); c.parcours_id = parcours_id || null; }
        });
      },
      async supprimerClasse(id) {
        return changer(db => {
          const c = maClasse(db, id), ids = new Set(db.eleves.filter(e => e.classe_id === c.id).map(e => e.id));
          db.progression = db.progression.filter(g => !ids.has(g.eleve_id));
          db.eleves = db.eleves.filter(e => e.classe_id !== c.id);
          db.classes = db.classes.filter(x => x.id !== c.id);
          oublierNoms(c.code);
        });
      },
      async ajouterEleves(classeId, n) { return changer(db => ajouter(db, maClasse(db, classeId), Math.max(1, Math.min(60, +n || 1)))); },
      async retirerEleve(eleveId) {
        return changer(db => {
          const el = db.eleves.find(x => x.id === eleveId); if (!el) return;
          const c = maClasse(db, el.classe_id);
          db.progression = db.progression.filter(g => g.eleve_id !== el.id);
          db.eleves = db.eleves.filter(x => x.id !== el.id);
          nommer(c.code, el.code, '');
        });
      },

      async parcours() { const db = await base(), e = exiger(db); return db.parcours.filter(p => p.auteur_id === e.id).map(p => vueParcours(db, p)).sort((a, b) => b.maj_le.localeCompare(a.maj_le)); },
      async bibliotheque() {
        const db = await base(), e = exiger(db);
        return db.parcours.filter(p => p.public && p.auteur_id !== e.id).map(p => {
          const a = db.enseignants.find(x => x.id === p.auteur_id), t = db.etablissements.find(x => x.id === a.etablissement_id);
          const v = vueParcours(db, p); delete v.classes;
          return Object.assign(v, { auteur: a.nom, etablissement: t.nom, ville: t.ville });
        }).sort((a, b) => b.maj_le.localeCompare(a.maj_le));
      },
      async enregistrerParcours(p) {
        const mods = await modules(), propre = controlerParcours(p, mods);
        return changer(db => {
          const e = exiger(db);
          if (p.id) { Object.assign(monParcours(db, p.id), propre, { maj_le: maintenant() }); return p.id; }
          const n = Object.assign({ id: uid(), auteur_id: e.id, origine_id: null, cree_le: maintenant(), maj_le: maintenant() }, propre);
          db.parcours.push(n); return n.id;
        });
      },
      async dupliquerParcours(id) {
        return changer(db => {
          const e = exiger(db), p = db.parcours.find(x => x.id === id && (x.public || x.auteur_id === e.id));
          if (!p) throw erreur('introuvable', 'Ce parcours n’est plus partagé.');
          const n = { id: uid(), auteur_id: e.id, titre: p.titre, description: p.description, niveau: p.niveau, modules: p.modules.slice(), public: false, origine_id: p.id, cree_le: maintenant(), maj_le: maintenant() };
          db.parcours.push(n); return n.id;
        });
      },
      async supprimerParcours(id) {
        return changer(db => {
          const p = monParcours(db, id);
          db.classes.forEach(c => { if (c.parcours_id === p.id) c.parcours_id = null; });
          db.parcours.forEach(d => { if (d.origine_id === p.id) d.origine_id = null; });
          db.parcours = db.parcours.filter(x => x.id !== p.id);
        });
      },

      async eleveOuvrir(codes) {
        const db = await base(), { el, classe } = trouverEleve(db, codes);
        const p = db.parcours.find(x => x.id === classe.parcours_id), progression = {};
        db.progression.filter(g => g.eleve_id === el.id).forEach(g => { progression[g.module_id] = { avance: g.avance, score: g.score, meilleur: g.meilleur, termine: !!g.termine_le, vu: g.vu_le }; });
        return { numero: el.numero, classe: { nom: classe.nom, niveau: classe.niveau }, parcours: p ? { titre: p.titre, description: p.description, modules: p.modules.slice() } : null, progression };
      },
      async eleveModule(codes, moduleId) {
        const db = await base(), { el } = trouverEleve(db, codes), g = db.progression.find(x => x.eleve_id === el.id && x.module_id === moduleId);
        if (!g) return {};
        let etat = null; try { etat = localStorage.getItem(CLE_ETAT + el.id + '-' + moduleId); } catch (e) {}
        return { avance: g.avance, score: g.score, meilleur: g.meilleur, termine: !!g.termine_le, etat };
      },
      async eleveEnregistrer(codes, moduleId, { avance, score, termine, etat }) {
        if (!/^[a-z0-9-]{3,80}$/.test(moduleId)) throw erreur('donnees_refusees');
        const borne = (x) => Math.max(0, Math.min(1, +x || 0));
        return changer(db => {
          const { el } = trouverEleve(db, codes);
          let g = db.progression.find(x => x.eleve_id === el.id && x.module_id === moduleId);
          if (!g) { g = { eleve_id: el.id, module_id: moduleId, avance: 0, score: 0, meilleur: 0, termine_le: null }; db.progression.push(g); }
          g.avance = Math.max(g.avance, borne(avance)); g.score = borne(score); g.meilleur = Math.max(g.meilleur, borne(score));
          if (termine && !g.termine_le) g.termine_le = maintenant();
          g.vu_le = maintenant();
          if (etat != null) { try { localStorage.setItem(CLE_ETAT + el.id + '-' + moduleId, etat); } catch (e) {} }
          return { ok: true };
        });
      },
      reinitialiser() { try { Object.keys(localStorage).filter(k => k.startsWith('lumi-demo')).forEach(k => localStorage.removeItem(k)); localStorage.removeItem(CLE_NOMS); } catch (e) {} garderEleve(null); },
    };
  }

  /* ====================================================================== interface */
  if (!DEMO) throw new Error('Lümi : le branchement à la base n’est pas encore livré. Videz « url » dans config.js pour revenir au mode démo.');
  const M = moteurDemo();
  const exigerEleve = () => { const c = eleveCodes(); if (!c) throw erreur('pas_de_seance', 'Entre d’abord le code de ta classe et ton code.'); return c; };

  return {
    demo: DEMO, NIVEAUX, modules, noms, nommer, net,
    // enseignant
    session: M.session, connecter: M.connecter, inscrire: M.inscrire, deconnecter: M.deconnecter, modifierCompte: M.modifierCompte,
    classes: M.classes, classe: M.classe, creerClasse: M.creerClasse, modifierClasse: M.modifierClasse, supprimerClasse: M.supprimerClasse,
    ajouterEleves: M.ajouterEleves, retirerEleve: M.retirerEleve,
    parcours: M.parcours, bibliotheque: M.bibliotheque, enregistrerParcours: M.enregistrerParcours, dupliquerParcours: M.dupliquerParcours, supprimerParcours: M.supprimerParcours,
    // élève
    eleveCodes,
    async eleveEntrer(classe, code) { const c = { classe: net.classe(classe), code: net.code(code) }; const s = await M.eleveOuvrir(c); garderEleve(c); return s; },
    async eleveSeance() { const c = eleveCodes(); if (!c) return null; try { return await M.eleveOuvrir(c); } catch (e) { if (e.code === 'code_inconnu') { garderEleve(null); return null; } throw e; } },
    eleveModule: (moduleId) => M.eleveModule(exigerEleve(), moduleId),
    eleveEnregistrer: (moduleId, p) => M.eleveEnregistrer(exigerEleve(), moduleId, p),
    eleveQuitter() { garderEleve(null); },
    reinitialiserDemo: M.reinitialiser,
  };
})();
