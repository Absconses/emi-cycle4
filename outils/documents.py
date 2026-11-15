# Documents dessinés (HTML -> image), glisser-déposer sur image, production écrite validée par critères.
# La tâche « tampons sur un document » a été essayée puis abandonnée (jugée artificielle) ; rendre() et redaction() restent utiles.
import json, copy, re
import os, sys
ICI=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, ICI)
RACINE=os.path.dirname(ICI)   # racine du dépôt
from livre import u, meta
POLICES='<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IBM+Plex+Mono:wght@500;600&display=swap">'
def rendre(html, sortie, largeur=1200, hauteur=860, qualite=88):
    """Rend #toile en JPEG et renvoie, pour chaque élément [data-zone] ou [data-case], sa boîte en % de la toile."""
    from playwright.sync_api import sync_playwright
    import pol2
    from PIL import Image
    with sync_playwright() as p:
        br=p.chromium.launch(); pg=br.new_page(viewport={'width':largeur,'height':hauteur}, device_scale_factor=1.5); pol2.brancher(pg)
        pg.set_content('<!doctype html><html><head><meta charset="utf-8">'+POLICES+'</head><body style="margin:0">'+html+'</body></html>'); pg.wait_for_timeout(1200)
        boites=pg.evaluate("""()=>{const t=document.getElementById('toile').getBoundingClientRect();const o={};
          for(const e of document.querySelectorAll('[data-zone],[data-case]')){const r=e.getBoundingClientRect();
            o[e.dataset.zone||('case:'+e.dataset.case)]={x:100*(r.x-t.x)/t.width,y:100*(r.y-t.y)/t.height,w:100*r.width/t.width,h:100*r.height/t.height}} return o}""")
        pg.locator('#toile').screenshot(path=sortie+'.png'); br.close()
    im=Image.open(sortie+'.png').convert('RGB'); im=im.resize((largeur,hauteur),Image.LANCZOS); im.save(sortie,quality=qualite,optimize=True)
    import os; os.remove(sortie+'.png')
    return boites

def glisser(gab, titre, image, boites, tampons, zones, consigne_ok, consigne_ko, taille=(1200,860), surlignage='never'):
    """gab : un DragQuestion existant du livre (libellés français). tampons : [(clé de case, texte)], zones : [(clé de zone, nom lisible, indice du bon tampon, retour si juste, retour si faux)]."""
    d=copy.deepcopy(gab); d['subContentId']=u(); d['metadata']=meta(titre,'Drag and Drop')
    p=d['params']; n=len(zones)
    p['question']['settings']={'size':{'width':860,'height':round(860*taille[1]/taille[0])},'background':{'path':image,'mime':'image/jpeg','copyright':{'license':'U'},'width':taille[0],'height':taille[1]}}
    L,H=860,round(860*taille[1]/taille[0]); em=lambda pct,base: round(pct/100*base/16,3)   # dans DragQuestion : x, y en %, largeur et hauteur en em (16 px pour une toile de 860 px)
    els=[]
    for cle,texte in tampons:
        b=boites['case:'+cle]
        els.append({'x':round(b['x'],2),'y':round(b['y'],2),'width':em(b['w'],L),'height':em(b['h'],H),'dropZones':[str(i) for i in range(n)],
          'type':{'params':{'text':'<p>'+texte+'</p>'},'library':'H5P.AdvancedText 1.1','subContentId':u(),'metadata':{'contentType':'Text','license':'U','title':texte}},'backgroundOpacity':100,'multiple':False})
    dz=[]
    for cle,nom,bon,ok,ko in zones:
        b=boites[cle]
        dz.append({'label':'<div>'+nom+'</div>','showLabel':False,'x':round(b['x'],2),'y':round(b['y'],2),'width':em(b['w'],L),'height':em(b['h'],H),'correctElements':[str(bon)],'backgroundOpacity':0,
          'tipsAndFeedback':{'tip':'','feedbackOnCorrect':ok,'feedbackOnIncorrect':ko},'single':True,'autoAlign':False})
    p['question']['task']={'elements':els,'dropZones':dz}
    p['overallFeedback']=[{'from':0,'to':99,'feedback':consigne_ko},{'from':100,'to':100,'feedback':consigne_ok}]
    p['behaviour'].update({'enableRetry':True,'singlePoint':False,'applyPenalties':False,'dropZoneHighlighting':surlignage,'enableFullScreen':True,'showTitle':False})
    return d

APOSTROPHES='’‘ʼ'
def elision(variantes):
    """Sur tablette, l'apostrophe tapée est courbe (’). Le type Essay ne la compte pas comme une séparation de mots :
    « l’angle » n'est alors pas reconnu pour le mot-clé « angle ». On ajoute donc une expression régulière qui attrape
    le mot précédé de l', d', j', qu'… Renvoie une liste (vide s'il n'y a rien à ajouter)."""
    v=[re.sub(r'([\\.^$+?()\[\]{}|/])',r'\\\1',x).replace('*','[a-zà-ÿ]*') for x in variantes if x!='*' and not (x.startswith('/') and x.endswith('/'))]   # le joker * de l'Essay reste un joker
    return ['/[a-zà-ÿ]{1,2}['+APOSTROPHES+'](?:'+'|'.join(v)+')/'] if v else []
def redaction(gab, titre, consigne, criteres, modele, minimum=60):
    """Production écrite validée par critères. gab : un Essay existant. criteres : [(mot-clé principal, [variantes], retour si présent, retour si absent)]."""
    e=copy.deepcopy(gab); e['subContentId']=u(); e['metadata']=meta(titre,'Essay'); p=e['params']
    p['taskDescription']=consigne; p['solution']={'introduction':'<p>Une réponse possible (il y en a d’autres) :</p>','sample':modele}
    p['keywords']=[{'keyword':k,'alternatives':alt+elision([k]+alt),'options':{'points':1,'occurrences':1,'caseSensitive':False,'forgiveMistakes':True,'feedbackIncluded':ok,'feedbackMissed':ko}} for k,alt,ok,ko in criteres]
    p['overallFeedback']=[{'from':0,'to':74,'feedback':'Regarde ce qu’il manque ci-dessous, complète ton texte, puis compare avec la réponse possible.'},{'from':75,'to':100,'feedback':'Ton texte contient l’essentiel. Compare-le avec la réponse possible.'}]
    p['behaviour'].update({'minimumLength':minimum,'inputFieldSize':'10','enableRetry':True,'ignoreScoring':False,'linebreakReplacement':' '})
    p['behaviour'].pop('pointsHost',None)
    p['checkAnswer']='Vérifier mon texte'; p['showSolution']='Voir une réponse possible'; p['tryAgain']='Modifier mon texte'; p['feedbackHeader']='Ce que contient ton texte'
    return e
