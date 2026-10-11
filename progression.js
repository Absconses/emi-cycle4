/* Progression de l'élève, enregistrée dans CE navigateur (aucun compte, rien n'est envoyé). */
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
  // Bilan à rendre : un petit fichier JSON que l'élève dépose où le professeur le demande.
  const telechargerBilan = (mods) => {
    const p = lire(), id = identite();
    const modules = {};
    mods.forEach(m => { const x = p[m.id]; if (x) modules[m.id] = { niveau: m.niveau, num: m.num, titre: m.titre, avance: x.avance || 0, score: x.meilleur || 0, termine: !!x.termine, vu: x.vu }; });
    const bilan = { format: 'emi-bilan-1', prenom: id.prenom, nom: id.nom, classe: id.classe, date: new Date().toISOString(), modules };
    const nomFichier = ('bilan-EMI-' + id.classe + '-' + id.nom + '-' + id.prenom).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9-]+/g, '_') + '.json';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(bilan, null, 1)], { type: 'application/json' }));
    a.download = nomFichier; document.body.appendChild(a); a.click(); a.remove();
    return Object.keys(modules).length;
  };
  return { lire, maj, etat, garderEtat, effacer, identite, garderIdentite, telechargerBilan };
})();
