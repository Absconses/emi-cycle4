/* Progression de l'élève, enregistrée dans CE navigateur (aucun compte, rien n'est envoyé).
 * Le bilan téléchargé sert à la fois de rapport pour le professeur et de sauvegarde :
 * rechargé sur un autre poste, il restaure la progression et l'endroit où l'élève s'était arrêté. */
window.EMI = (function () {
  const CLE = 'emi-cycle4-progression';
  const lire = () => { try { return JSON.parse(localStorage.getItem(CLE)) || {}; } catch (e) { return {}; } };
  const ecrire = (p) => { try { localStorage.setItem(CLE, JSON.stringify(p)); } catch (e) {} };
  const maj = (id, f) => { const p = lire(); p[id] = f(p[id] || {}); ecrire(p); return p[id]; };
  const etat = (id) => { try { return localStorage.getItem('emi-etat-' + id); } catch (e) { return null; } };
  const garderEtat = (id, s) => { try { localStorage.setItem('emi-etat-' + id, s); } catch (e) {} };
  const effacer = () => {
    try { Object.keys(localStorage).filter(k => k.startsWith('emi-') && k !== 'emi-identite').forEach(k => localStorage.removeItem(k)); } catch (e) {}
  };
  const identite = () => { try { return JSON.parse(localStorage.getItem('emi-identite')) || {}; } catch (e) { return {}; } };
  const garderIdentite = (k, v) => { const i = identite(); i[k] = v; try { localStorage.setItem('emi-identite', JSON.stringify(i)); } catch (e) {} };

  /* Sceau : empreinte SHA-256 du contenu du bilan (identité comprise) et d'une clé du site.
   * Il signale un fichier retouché à la main ou recopié sous un autre nom.
   * Ce n'est pas une signature inviolable : la clé est dans le code du site. */
  const CLE_SCEAU = 'EMI-cycle4|Tilleul|2026';
  const stable = (v) => Array.isArray(v) ? '[' + v.map(stable).join(',') + ']'
    : (v && typeof v === 'object') ? '{' + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}'
    : JSON.stringify(v);
  const sceau = async (b) => {
    const { sceau: _, ...contenu } = b;
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(CLE_SCEAU + stable(contenu)));
    return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join('');
  };
  const verifier = async (b) => !!b.sceau && b.sceau === await sceau(b);

  const fabriquerBilan = async (mods) => {
    const p = lire(), id = identite();
    const modules = {}, etats = {};
    mods.forEach(m => {
      const x = p[m.id]; if (!x) return;
      modules[m.id] = { niveau: m.niveau, num: m.num, titre: m.titre, avance: x.avance || 0, score: x.meilleur || 0, termine: !!x.termine, vu: x.vu || 0 };
      const e = etat(m.id); if (e) etats[m.id] = e;
    });
    const b = { format: 'emi-bilan-2', prenom: id.prenom, nom: id.nom, classe: id.classe, date: new Date().toISOString(), modules, etats };
    b.sceau = await sceau(b);
    return b;
  };
  const telechargerBilan = async (mods) => {
    const b = await fabriquerBilan(mods), id = identite();
    const nomFichier = ('bilan-EMI-' + id.classe + '-' + id.nom + '-' + id.prenom).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9-]+/g, '_') + '.json';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(b)], { type: 'application/json' }));
    a.download = nomFichier; document.body.appendChild(a); a.click(); a.remove();
    return Object.keys(b.modules).length;
  };
  /* Reprendre sur cet appareil : pour chaque module, on garde la version la plus récente
   * (celle du bilan ou celle déjà présente ici). */
  const chargerBilan = async (texte) => {
    let b; try { b = JSON.parse(texte); } catch (e) { return { ok: false, raison: 'Ce fichier n’est pas un bilan EMI.' }; }
    if (b.format !== 'emi-bilan-2' || !b.modules) return { ok: false, raison: b.format === 'emi-bilan-1' ? 'Ce bilan est trop ancien pour reprendre : télécharge un nouveau bilan sur ton premier appareil.' : 'Ce fichier n’est pas un bilan EMI.' };
    if (!(await verifier(b))) return { ok: false, raison: 'Ce bilan a été modifié : il ne peut pas être rechargé.' };
    const p = lire(); let n = 0;
    Object.entries(b.modules).forEach(([id, m]) => {
      const ici = p[id];
      if (ici && (ici.vu || 0) >= (m.vu || 0)) return;
      p[id] = { commence: (ici && ici.commence) || m.vu || Date.now(), vu: m.vu, avance: m.avance, meilleur: m.score, score: m.score, termine: m.termine ? (m.vu || Date.now()) : undefined };
      if (b.etats && b.etats[id]) garderEtat(id, b.etats[id]);
      n++;
    });
    ecrire(p);
    ['prenom', 'nom', 'classe'].forEach(k => { if (b[k]) garderIdentite(k, b[k]); });
    return { ok: true, n };
  };
  return { lire, maj, etat, garderEtat, effacer, identite, garderIdentite, telechargerBilan, chargerBilan, verifier };
})();
