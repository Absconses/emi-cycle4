/* Copie de la salle de rédaction (club/redaction.html).
 * Framapad n'accepte que 10 exports par 1 min 30 et par adresse IP ; au-delà,
 * la requête reste en attente sans réponse. Au CDI, tous les élèves sortent
 * par la même adresse : la page ne peut pas lire les pads elle-même.
 * Ce script lit la conférence et les pads d'article à un rythme sûr, puis
 * écrit cache.json, que la page lit sur la branche salle-redaction.
 * La lecture de la conférence reprend le code de la page, pour calculer
 * exactement les mêmes noms de pads. */
import fs from 'node:fs';
import vm from 'node:vm';

const page = fs.readFileSync(process.argv[2] || 'club/redaction.html', 'utf8');
const debut = page.indexOf('const INSTANCE'), fin = page.indexOf('/* ---- Lire un pad');
if (debut < 0 || fin < 0) throw new Error('redaction.html : repères introuvables');
const ctx = { location: { search: '' }, URLSearchParams, document: {} };
vm.createContext(ctx);
vm.runInContext(page.slice(debut, fin) + '\nthis.lire = { INSTANCE, CONFERENCE, lireConference };', ctx);
const { INSTANCE, CONFERENCE, lireConference } = ctx.lire;

const PAUSE = 9500;   // 10 exports au plus par fenêtre de 90 s
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
let premier = true;
async function exporter(nom) {
  if (!premier) await pause(PAUSE);
  premier = false;
  const rep = await fetch(`${INSTANCE}/p/${encodeURIComponent(nom)}/export/txt`, { signal: AbortSignal.timeout(30000) });
  if (rep.status === 404) return '';
  if (!rep.ok) throw new Error(`${nom} : ${rep.status}`);
  return rep.text();
}

const ancien = (() => { try { return JSON.parse(fs.readFileSync(process.argv[3] || 'cache.json', 'utf8')); } catch (e) { return { pads: {} }; } })();
const conference = await exporter(CONFERENCE);
const noms = [...new Set(lireConference(conference).flatMap((n) => n.pages.flatMap((p) => p.articles.map((a) => a.pad))))];
const pads = {};
for (const nom of noms) {
  try { pads[nom] = await exporter(nom); }
  catch (e) { console.warn(e.message); if (nom in (ancien.pads || {})) pads[nom] = ancien.pads[nom]; }
}
fs.writeFileSync(process.argv[3] || 'cache.json', JSON.stringify({ lu: new Date().toISOString(), conference, pads }));
console.log(`conférence + ${noms.length} pads lus`);
