# Outils de fabrication des livres : trace écrite, QCM, coups de pouce, séries de questions.
# Outils communs : « Ma trace écrite » (Documentation Tool pensé comme trace) en dernier chapitre d'un livre
import json, uuid, copy, re
u=lambda: str(uuid.uuid4())
def meta(t,ct): return {'contentType':ct,'license':'U','title':t,'authors':[],'changes':[],'extraTitle':t}
def texte(h,t='Texte'): return {'params':{'text':h},'library':'H5P.Text 1.1','subContentId':u(),'metadata':meta(t,'Text')}
def champ(amorce,t): return {'params':{'taskDescription':amorce,'placeholderText':'Termine la phrase avec tes mots.','inputFieldSize':'3','requiredField':True,'remainingChars':'Caractères restants : @chars'},'library':'H5P.TextInputField 1.2','subContentId':u(),'metadata':meta(t,'Text Input Field')}
def pouce(titre,h,t):
    return {'params':{'hTag':'h4','panels':[{'title':titre,'content':{'params':{'text':h},'library':'H5P.AdvancedText 1.1','subContentId':u(),'metadata':meta(t,'Text')}}]},'library':'H5P.Accordion 1.0','subContentId':u(),'metadata':meta(t,'Accordion')}
def aide(relire, il_faut, exemple):
    return ('<p><strong>Où relire&nbsp;:</strong> '+relire+'</p>'
            '<p><strong>Ta phrase est juste si</strong> '+il_faut+'</p>'
            '<p><strong>Pour comparer&nbsp;:</strong> «&nbsp;'+exemple+'&nbsp;»</p>'
            '<p style="font-size:.92em;color:#555">Il manque quelque chose dans ta phrase&nbsp;? Corrige-la avant de continuer.</p>')
def rep(e,a,b):
    t=e['content']['params']['text']; assert a in t, 'introuvable : '+a[:60]; e['content']['params']['text']=t.replace(a,b,1)

def ajoute_trace(c, titre_page, phrases, accroche, preparation):
    """phrases : [(amorce, relire, il_faut, exemple)] ; déplace le « À retenir » de « Tout relier » en vérification finale."""
    ch=c['chapters']; dernier=ch[-1]
    assert len(titre_page)<=50, 'titre de page tronqué au-delà de 57 caractères dans le menu et l’export'
    assert 'Tout relier' in dernier['metadata']['title'], dernier['metadata']['title']
    n=int(dernier['metadata']['title'].split(' ')[0])+1
    tr=dernier['params']['content']
    k=[i for i,e in enumerate(tr) if e['content']['library'].startswith('H5P.Accordion') and 'À retenir' in e['content']['params']['panels'][0]['title']]
    assert len(k)==1, 'À retenir : %d'%len(k)
    retenir=tr.pop(k[0])['content']['params']['panels'][0]['content']['params']['text']
    els=[texte('<p>%s phrases à terminer. <strong>Écris d’abord</strong>, avec tes mots. Ensuite seulement, ouvre le coup de pouce placé sous la phrase pour vérifier.</p>'%{3:'Trois',4:'Quatre',5:'Cinq'}[len(phrases)],'Consigne')]
    for i,(a,relire,il_faut,ex) in enumerate(phrases,1):
        els.append(champ('%d. %s'%(i,a),'Phrase %d'%i)); els.append(pouce('Coup de pouce pour la phrase %d'%i,aide(relire,il_faut,ex),'Coup de pouce %d'%i))
    els.append(pouce('Dernière vérification : ce qu’il fallait retenir','<p>Tes phrases sont écrites&nbsp;? Compare-les une dernière fois avec ce résumé, et complète ce qui manque.</p>'+retenir,'Vérification finale'))
    doc={'params':{'taskDescription':'<p><strong>Ma trace écrite.</strong> À la fin, clique sur la <strong>flèche</strong>, en bas à droite, pour créer ton document.</p>',
      'pagesList':[
        {'params':{'elementList':els,'helpTextLabel':'Besoin d’aide ?','helpText':'<p>Termine chaque phrase. Les coups de pouce te disent où relire dans le livre et ce que ta phrase doit contenir.</p>'},'library':'H5P.StandardPage 1.5','subContentId':u(),'metadata':meta(titre_page,'Standard page')},
        {'params':{'description':'<p>Ta trace écrite est prête. Clique sur <strong>Créer mon document</strong>, puis sur <strong>Télécharger</strong>&nbsp;: range le fichier dans ton ENT, ou imprime-le pour ton cahier.</p>','createDocumentLabel':'Créer mon document','submitTextLabel':'Envoyer','submitSuccessTextLabel':'Ta trace a bien été envoyée !','selectAllTextLabel':'Tout sélectionner','exportTextLabel':'Télécharger','helpTextLabel':'Besoin d’aide ?','requiresInputErrorMessage':'Il reste des phrases à terminer dans : @pages'},'library':'H5P.DocumentExportPage 1.5','subContentId':u(),'metadata':meta('Créer mon document','Document export page')}],
      'i10n':{'previousLabel':'Étape précédente','nextLabel':'Étape suivante','closeLabel':'Fermer'}},
     'library':'H5P.DocumentationTool 1.8','subContentId':u(),'metadata':meta('Ma trace écrite','Documentation Tool')}
    # bandeau : repris de « Tout relier » pour garder le style du livre
    b=tr[0]['content']['params']['text']; m=re.match(r'(<p style="[^"]*">.*?&nbsp;·&nbsp; )[^<]*</p>',b,re.S); assert m, b[:200]
    h2=re.search(r'<h2 style="[^"]*">',b).group(0)
    entete={'content':{'params':{'text':m.group(1)+'MA TRACE ÉCRITE</p>\n'+h2+'Ma trace écrite</h2>\n<p>'+preparation+' Écris-le <strong>avec tes mots</strong>. C’est cette page que tu garderas.</p>'},'library':'H5P.AdvancedText 1.1','subContentId':u(),'metadata':meta('Titre Ma trace écrite','Text')},'useSeparator':'auto'}
    T='%d · Ma trace écrite'%n
    ch.append({'library':'H5P.Column 1.18','subContentId':u(),'metadata':meta(T,'Column'),'params':{'content':[entete,{'content':doc,'useSeparator':'auto'}]}})
    i=ch[0]['params']['content']
    liste=[e for e in i if e['content']['library'].startswith('H5P.AdvancedText') and '<li>Tout relier</li>' in e['content']['params']['text']]
    assert len(liste)==1; rep(liste[0],'<li>Tout relier</li>','<li>Tout relier</li><li>Ma trace écrite</li>')
    return T

# --- outils pour les QCM et les coups de pouce
def rp(t,ok,fb,nfb=''):
    return {'text':'<div>'+t.replace('&nbsp;',' ')+'</div>','correct':ok,'tipsAndFeedback':{'tip':'','chosenFeedback':'<div>'+fb+'</div>','notChosenFeedback':('<div>'+nfb+'</div>' if nfb else '')}}
def qcm(gab, titre, question, reps, multi=False):
    m=copy.deepcopy(gab); m['subContentId']=u(); m['metadata']=meta(titre,'Multiple Choice')
    m['params']['question']=question; m['params']['answers']=[rp(*r) for r in reps]
    m['params']['behaviour'].update({'type':'multi' if multi else 'single','singlePoint':False,'randomAnswers':True,'passPercentage':100})
    return m
def acc(titre,h,t):
    return {'content':{'params':{'hTag':'h3','panels':[{'title':titre,'content':{'params':{'text':h},'library':'H5P.AdvancedText 1.1','subContentId':u(),'metadata':meta(t,'Text')}}]},'library':'H5P.Accordion 1.0','subContentId':u(),'metadata':meta(t,'Accordion')},'useSeparator':'auto'}
def bloc(o): return {'content':o,'useSeparator':'auto'}
def maj_video(iv, k, reps):
    """reps dans l'ordre existant (la bonne d'abord) : (texte, retour ou None)"""
    a=iv[k]['action']['params']['answers']; assert len(a)==len(reps) and a[0]['correct'], k
    for x,(t,fb) in zip(a,reps):
        x['text']='<div>'+t.replace('&nbsp;',' ')+'</div>'
        if fb: x['tipsAndFeedback']['chosenFeedback']='<div>'+fb+'</div>'
    iv[k]['action']['params']['behaviour']['randomAnswers']=True

def question_set(titre, questions, fb_bas, fb_haut, seuil=75):
    """Série de questions corrigées, une par une, avec un résultat à la fin."""
    return {'params':{'introPage':{'showIntroPage':False,'startButtonText':'Commencer','introduction':''},'progressType':'dots','passPercentage':seuil,'questions':questions,
      'disableBackwardsNavigation':False,'randomQuestions':False,
      'endGame':{'showResultPage':True,'showSolutionButton':True,'showRetryButton':True,'noResultMessage':'Terminé','message':'Tes résultats :','scoreBarLabel':'Tu as obtenu @finals sur @totals points',
         'overallFeedback':[{'from':0,'to':seuil-1,'feedback':fb_bas},{'from':seuil,'to':100,'feedback':fb_haut}],
         'solutionButtonText':'Voir la solution','retryButtonText':'Recommencer','finishButtonText':'Terminer','submitButtonText':'Envoyer','showAnimations':False,'skippable':False,'skipButtonText':'Passer la vidéo'},
      'override':{'checkButton':True},
      'texts':{'prevButton':'Retour','nextButton':'Suivant','finishButton':'Terminer','submitButton':'Envoyer','textualProgress':'Question @current sur @total','jumpToQuestion':'Question %d sur %total','questionLabel':'Question','readSpeakerProgress':'Question @current sur @total','unansweredText':'Pas de réponse donnée','answeredText':'Réponse donnée','currentQuestionText':'Question en cours','navigationLabel':'Questions','questionSetInstruction':'Choisis la question à afficher'}},
     'library':'H5P.QuestionSet 1.20','subContentId':u(),'metadata':meta(titre,'Question Set')}
def adv(h,t): return {'content':{'params':{'text':h},'library':'H5P.AdvancedText 1.1','subContentId':u(),'metadata':meta(t,'Text')},'useSeparator':'auto'}
