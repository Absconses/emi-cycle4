# Vérification d'un livre dans Chromium : python3 outils/verifier-livre.py <id du module> [module.html|lumi/module.html] [chapitres à photographier, ex. 3,5]
# Avant : servir le dépôt en local, depuis sa racine :  python3 -m http.server 8766
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from playwright.sync_api import sync_playwright
import pol2
M=sys.argv[1]; U=sys.argv[2] if len(sys.argv)>2 else 'module.html'; photos=[int(x) for x in sys.argv[3].split(',')] if len(sys.argv)>3 else []; err=[]
with sync_playwright() as p:
    br=p.chromium.launch(); pg=br.new_page(viewport={'width':1280,'height':1100}); pol2.brancher(pg); pg.route('**youtube**', lambda r: r.abort())
    pg.on('console', lambda m: err.append(m.text[:200]) if m.type=='error' and 'ERR_FAILED' not in m.text and 'youtube' not in m.text.lower() else None)
    pg.on('pageerror', lambda e: err.append('PAGE '+str(e)[:200]))
    pg.goto('http://localhost:8766/'+U+'?m='+M+('&apercu=1' if 'lumi' in U else '')); pg.wait_for_selector('#h5p iframe', timeout=25000); pg.wait_for_timeout(4500)
    fr=[f for f in pg.frames if f.parent_frame==pg.main_frame and 'dans=1' not in f.url][0]
    fr.locator('.h5p-interactive-book-cover-readbutton button, .h5p-interactive-book-cover button').first.click(); pg.wait_for_timeout(1500)
    n=fr.evaluate("H5P.instances[0].chapters.length"); print('note', fr.evaluate("[H5P.instances[0].getScore(),H5P.instances[0].getMaxScore()]"))
    cur=lambda: fr.locator('.h5p-interactive-book-current')
    for k in range(n):
        fr.evaluate("(k)=>{const i=H5P.instances[0];i.trigger('newChapter',{h5pbookid:i.contentId,chapter:'h5p-interactive-book-chapter-'+i.chapters[k].instance.subContentId,section:'top'})}", k); pg.wait_for_timeout(1900)
        c=cur(); t=fr.evaluate("(k)=>H5P.instances[0].chapters[k].title", k)
        print(k, t[:44].ljust(44), '| QCM', c.locator('.h5p-multichoice').count(), '| glisser', c.locator('.h5p-dragquestion').count(), '| accordéons', c.locator('.h5p-panel-title').count(), '| champs', c.locator('textarea').count(), '| mots', len(c.inner_text().split()))
        if k in photos: pg.locator('#h5p iframe').screenshot(path=f'vl-{k}.png')
    br.close()
print('ERREURS:', err[:5])
