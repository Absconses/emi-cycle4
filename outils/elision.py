"""Ajoute aux productions écrites validées par critères la variante « apostrophe courbe » (voir documents.elision).
python3 outils/elision.py            : tous les modules
Ne touche pas aux essais libres (mot-clé *) ; un mot-clé écrit en expression régulière reçoit l'élision facultative en tête ; recalcule la variante si les mots-clés ont changé ; sans effet si on le relance."""
import json, glob, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from documents import elision, APOSTROPHES
def un_groupe(r):
    """Vrai pour /(?:a|b|c)suite/ : un seul groupe d'alternatives, puis une suite sans « | ».
    Seule cette forme (celle des livres de 3e) reçoit l'élision en tête ; ailleurs elle ne vaudrait que pour la première alternative."""
    if not r.startswith('/(?:'): return False
    n = 0
    for i, ch in enumerate(r[1:-1]):
        if ch == '(' : n += 1
        elif ch == ')':
            n -= 1
            if n == 0: return '|' not in r[1:-1][i + 1:]
    return False
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
            # mot-clé écrit comme une expression régulière (livres de 3e) : on lui ajoute, une seule fois,
            # l'élision facultative en tête, pour que « l’algorithme » compte comme « algorithme »
            if k['keyword'].startswith('/') and k['keyword'].endswith('/'):
                tete = '/(?:[a-zà-ÿ]{1,2}[' + APOSTROPHES + "'])?"
                if un_groupe(k['keyword']) and not k['keyword'].startswith(tete): k['keyword'] = tete + k['keyword'][1:]; n += 1
                continue
            marque = '/[a-zà-ÿ]{1,2}[' + APOSTROPHES
            avant = k.get('alternatives', [])
            alt = [a for a in avant if not a.startswith(marque)]
            k['alternatives'] = alt + elision([k['keyword']] + alt)
            if k['alternatives'] != avant: n += 1
    if n:
        json.dump(c, open(f, 'w', encoding='utf-8'), ensure_ascii=False); print(f.split(os.sep)[-3], ':', n, 'critères complétés')
