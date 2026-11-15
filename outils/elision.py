"""Ajoute aux productions écrites validées par critères la variante « apostrophe courbe » (voir documents.elision).
python3 outils/elision.py            : tous les modules
Ne touche pas aux essais libres (mot-clé *) ; recalcule la variante si les mots-clés ont changé ; sans effet si on le relance."""
import json, glob, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from documents import elision, APOSTROPHES
def essais(o):
    if isinstance(o, dict):
        if str(o.get('library', '')).startswith('H5P.Essay'): yield o
        for v in o.values(): yield from essais(v)
    elif isinstance(o, list):
        for v in o: yield from essais(v)
for f in sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'modules', '*', 'content', 'content.json'))):
    c = json.load(open(f, encoding='utf-8')); n = 0
    for e in essais(c):
        for k in e['params'].get('keywords', []):
            if k['keyword'] == '*': continue
            marque = '/[a-zà-ÿ]{1,2}[' + APOSTROPHES
            avant = k.get('alternatives', [])
            alt = [a for a in avant if not a.startswith(marque)]
            k['alternatives'] = alt + elision([k['keyword']] + alt)
            if k['alternatives'] != avant: n += 1
    if n:
        json.dump(c, open(f, 'w', encoding='utf-8'), ensure_ascii=False); print(f.split(os.sep)[-3], ':', n, 'critères complétés')
