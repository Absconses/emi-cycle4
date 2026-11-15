# Tâche finale sur dossier de vrais documents (modèle des livres 5.6 et 5.7, CONCEPTION.md §4).
# fiche() : un document. dossier() : l'accordéon des documents. mission(), note() : les deux textes fixes.
from livre import u, meta, adv
def lien(url): return '<a href="'+url+'" target="_blank" rel="noopener">Lire la page d’origine</a>'
def fiche(qui, quand, dit, citation, url):
    return ('<p style="margin:0 0 .5em;color:#555;font-size:.92em">'+qui+'<br>'+quand+'</p>'
            '<p><strong>Ce que dit la page.</strong> '+dit+'</p>'
            '<p style="border-left:4px solid #1d3557;padding:.2em 0 .2em .8em;margin:.6em 0"><em>«&nbsp;'+citation+'&nbsp;»</em></p>'
            '<p>'+lien(url)+'</p>')
def dossier(docs, titre='Le dossier : cinq vrais documents'):
    """docs : liste de (titre du volet, qui parle, quand, résumé, citation exacte, adresse)"""
    return {'params':{'hTag':'h3','panels':[{'title':t,'content':{'params':{'text':fiche(q,d,dit,ci,url)},'library':'H5P.AdvancedText 1.1','subContentId':u(),'metadata':meta(t,'Text')}} for t,q,d,dit,ci,url in docs]},'library':'H5P.Accordion 1.0','subContentId':u(),'metadata':meta(titre,'Accordion')}
def mission(n='1'):
    return adv('<p><strong>'+n+'. Lis le dossier.</strong> Ouvre chaque document. Pour lire le texte entier, clique sur «&nbsp;Lire la page d’origine&nbsp;»&nbsp;: la vraie page s’ouvre dans un nouvel onglet.</p>','Mission dossier')
def note(date='15 novembre 2026'):
    return adv('<p style="font-size:.85em;color:#555">Pages consultées le '+date+'. Les courtes citations sont exactes&nbsp;; le reste résume chaque page. Une page web peut changer ou disparaître&nbsp;: si un lien ne répond plus, sers-toi du résumé.</p>','Note sur les sources')
def relire(titre, points):
    return adv('<div style="background-color:#faf6f2;border-left:4px solid #2a6f4e;padding:.8em 1em;margin:1em 0"><p style="margin:0 0 .5em"><strong>'+titre+'</strong></p>\n<ul style="margin:0;padding-left:1.3em;line-height:1.7">'+''.join('<li>'+p+'</li>' for p in points)+'</ul></div>','Relecture')
def associer(gab, titre, consigne, lignes):
    """Glisser-déposer de mots. gab : un DragText existant (libellés français). lignes : texte avec *réponse*. Pas de retour par zone : il afficherait la bonne réponse."""
    import copy
    d=copy.deepcopy(gab); d['subContentId']=u(); d['metadata']=meta(titre,'Drag Text'); p=d['params']
    p['taskDescription']=consigne; p['textField']='\n'.join(lignes); p.pop('distractors',None)
    p['overallFeedback']=[{'from':0,'to':99,'feedback':'Tu as @score sur @total. Retourne lire les documents mal placés, puis recommence.'},{'from':100,'to':100,'feedback':'Tu as @score sur @total&nbsp;: tu sais qui parle dans chaque document.'}]
    p['behaviour'].update({'enableRetry':True,'enableSolutionsButton':False,'enableCheckButton':True,'instantFeedback':False})
    return d
