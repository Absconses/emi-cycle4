# Extraction du contenu pédagogique des modules H5P (livres interactifs et Game Maps) en texte lisible + mesures.
import json, re, sys, os, html, collections
R=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'modules')
def txt(s):
    if not isinstance(s,str): return ''
    s=re.sub(r'<(br|/p|/li|/h\d)[^>]*>',' ',s); s=re.sub(r'<[^>]+>','',s); return re.sub(r'\s+',' ',html.unescape(s)).strip()
def mots(s): return len(re.findall(r"[\wÀ-ÿ'’-]+", s))
class M:
    def __init__(s): s.types=collections.Counter(); s.lecture=0; s.questions=0; s.fb=0; s.fbmanque=0; s.images=0; s.sansalt=0; s.lignes=[]; s.essais=0; s.video=0; s.notes=[]
def decrire(o, m, niv=0, court=False):
    """o = {library, params, metadata}"""
    lib=(o.get('library') or '').split(' ')[0].replace('H5P.',''); p=o.get('params') or {}; ind='  '*niv
    titre=txt((o.get('metadata') or {}).get('title',''))
    m.types[lib]+=1
    L=m.lignes.append
    if lib in ('Column',):
        for c in p.get('content',[]): decrire(c.get('content',{}), m, niv, court)
    elif lib=='AdvancedText' or lib=='Text':
        t=txt(p.get('text','')); m.lecture+=mots(t); L(f"{ind}[TEXTE {mots(t)} mots] {t if not court else t[:220]}")
    elif lib=='Image':
        m.images+=1; alt=txt(p.get('alt','')); 
        if not alt: m.sansalt+=1
        cr=(p.get('file') or {}).get('copyright') or {}; L(f"{ind}[IMAGE] alt={alt[:90]!r} licence={cr.get('license','?')} auteur={txt(cr.get('author',''))[:40]!r}")
    elif lib=='MultiChoice':
        m.questions+=1; q=txt(p.get('question','')); ans=p.get('answers',[])
        nfb=sum(1 for a in ans if txt((a.get('tipsAndFeedback') or {}).get('chosenFeedback','')) or txt((a.get('tipsAndFeedback') or {}).get('notChosenFeedback','')))
        ok=sum(1 for a in ans if a.get('correct'))
        if nfb: m.fb+=1
        else: m.fbmanque+=1
        L(f"{ind}[QCM {len(ans)} rép., {ok} bonne(s), feedback sur {nfb}] {q}")
        for a in ans:
            f=txt((a.get('tipsAndFeedback') or {}).get('chosenFeedback',''))
            L(f"{ind}   {'*' if a.get('correct') else '-'} {txt(a.get('text',''))}" + (f"  >> {f if not court else f[:140]}" if f else ''))
    elif lib=='TrueFalse':
        m.questions+=1; b=p.get('behaviour',{}); f1=txt(b.get('feedbackOnCorrect','')); f2=txt(b.get('feedbackOnWrong',''))
        m.fb+= bool(f1 or f2); m.fbmanque+= not (f1 or f2)
        L(f"{ind}[VRAI/FAUX réponse={p.get('correct')}] {txt(p.get('question',''))}" + (f"  >> ok: {f1[:160]} | faux: {f2[:160]}" if (f1 or f2) else ''))
    elif lib=='SingleChoiceSet':
        ch=p.get('choices',[]); m.questions+=len(ch); L(f"{ind}[CHOIX UNIQUE x{len(ch)}]")
        for c in ch: L(f"{ind}   ? {txt(c.get('question',''))} | " + ' / '.join(('*' if i==0 else '')+txt(a) for i,a in enumerate(c.get('answers',[]))))
    elif lib=='Blanks':
        qs=p.get('questions',[]); n=sum(len(re.findall(r'\*[^*]+\*',q)) for q in qs); m.questions+=1
        L(f"{ind}[TEXTE À TROUS {n} trous] {txt(p.get('text',''))} :: " + ' '.join(txt(q) for q in qs)[: (10000 if not court else 300)])
    elif lib=='DragText':
        t=txt(p.get('textField','')); n=len(re.findall(r'\*[^*]+\*',t)); m.questions+=1
        L(f"{ind}[GLISSER LES MOTS {n}] {txt(p.get('taskDescription',''))} :: {t if not court else t[:300]}")
    elif lib=='MarkTheWords':
        t=txt(p.get('textField','')); n=len(re.findall(r'\*[^*]+\*',t)); m.questions+=1
        L(f"{ind}[MARQUER LES MOTS {n}] {txt(p.get('taskDescription',''))} :: {t if not court else t[:300]}")
    elif lib=='Summary':
        ss=p.get('summaries',[]); m.questions+=1; L(f"{ind}[SUMMARY x{len(ss)}] {txt(p.get('intro',''))}")
        for s_ in ss: L(f"{ind}   " + ' / '.join(('*' if i==0 else '')+txt(a) for i,a in enumerate(s_.get('summary',[]))))
    elif lib=='DragQuestion':
        q=p.get('question',{}).get('task',{}); els=q.get('elements',[]); dz=q.get('dropZones',[]); m.questions+=1
        L(f"{ind}[GLISSER-DÉPOSER {len(els)} étiquettes -> {len(dz)} zones] zones: " + ' | '.join(txt(z.get('label','')) for z in dz) + ' ;; étiquettes: ' + ' | '.join(txt(((e.get('type') or {}).get('params') or {}).get('text','')) or '(image)' for e in els))
    elif lib=='Essay':
        m.questions+=1; m.essais+=1; kw=p.get('keywords',[])
        L(f"{ind}[ESSAY {len(kw)} mots-clés, min {(p.get('behaviour') or {}).get('minimumLength','?')} car.] {txt(p.get('taskDescription',''))}")
        L(f"{ind}   mots-clés: " + ' | '.join(txt(k.get('keyword',''))+('/'+'/'.join(k.get('alternatives',[])) if k.get('alternatives') else '') for k in kw))
        if txt(p.get('solution',{}).get('sample','')): L(f"{ind}   modèle: {txt(p['solution']['sample'])[: (2000 if not court else 200)]}")
    elif lib=='Accordion':
        pn=p.get('panels',[]); L(f"{ind}[ACCORDÉON x{len(pn)}]")
        for x in pn:
            t=txt(((x.get('content') or {}).get('params') or {}).get('text','')); m.lecture+=mots(t); L(f"{ind}   · {txt(x.get('title',''))} : {t if not court else t[:160]}")
    elif lib=='Dialogcards':
        ds=p.get('dialogs',[]); L(f"{ind}[CARTES x{len(ds)}] {txt(p.get('description',''))}")
        for d in ds: L(f"{ind}   · {txt(d.get('text',''))} => {txt(d.get('answer',''))[: (1000 if not court else 120)]}")
    elif lib=='BranchingScenario':
        cs=(p.get('branchingScenario') or p).get('content',[]); m.questions+=1; L(f"{ind}[SCÉNARIO À EMBRANCHEMENTS {len(cs)} nœuds]")
        for c in cs:
            t=c.get('type',{}); tl=(t.get('library') or '').split(' ')[0].replace('H5P.',''); tp=t.get('params') or {}
            if tl=='BranchingQuestion':
                bq=tp.get('branchingQuestion',{}); L(f"{ind}   ? {txt(bq.get('question',''))} | " + ' / '.join(txt(a.get('text','')) for a in bq.get('alternatives',[])))
            else: L(f"{ind}   · {tl}: {txt(tp.get('text',''))[:200]}")
    elif lib=='DocumentationTool':
        pg=p.get('pagesList',[]); m.questions+=1; m.essais+=1; L(f"{ind}[OUTIL DE DOCUMENTATION {len(pg)} pages] {txt(p.get('taskDescription',''))}")
        for x in pg:
            xp=x.get('params') or {}; L(f"{ind}   · {(x.get('library') or '').split(' ')[0].replace('H5P.','')}: {txt(xp.get('title',''))} " + ' | '.join(txt(((e.get('params') or {}).get('taskDescription','')) or ((e.get('params') or {}).get('text','')))[:120] for e in xp.get('elementList',[])))
    elif lib=='StructureStrip':
        se=p.get('sections',[]); m.questions+=1; m.essais+=1; L(f"{ind}[BANDE DE STRUCTURE {len(se)} parties] {txt(p.get('taskDescription',''))}")
        for x in se: L(f"{ind}   · {txt(x.get('title',''))}: {txt(x.get('description',''))[:200]}")
    elif lib in ('QuestionSet',):
        qs=p.get('questions',[]); L(f"{ind}[SÉRIE DE {len(qs)} QUESTIONS, seuil {p.get('passPercentage','?')} %]")
        for q in qs: decrire(q, m, niv+1, court)
    elif lib=='InteractiveVideo':
        m.video+=1; iv=p.get('interactiveVideo',{}); src=(iv.get('video',{}).get('files') or [{}])[0].get('path','')
        inter=iv.get('assets',{}).get('interactions',[]); m.questions+=len(inter)
        L(f"{ind}[VIDÉO INTERACTIVE {src} · {len(inter)} questions] {txt(iv.get('video',{}).get('startScreenOptions',{}).get('title',''))}")
        for i in inter:
            a_=i.get('action',{}); ap=a_.get('params') or {}; d_=i.get('duration',{})
            if 'answers' in ap: L(f"{ind}   @{d_.get('from')}s ? {txt(ap.get('question',''))} | " + ' / '.join(('*' if x.get('correct') else '')+txt(x.get('text','')) for x in ap['answers']))
            else: L(f"{ind}   @{d_.get('from')}s V/F({ap.get('correct')}) {txt(ap.get('question',''))}")
    elif lib=='Timeline':
        t=p.get('timeline',{}); ev=t.get('date',[]); L(f"{ind}[FRISE {len(ev)} dates] {txt(t.get('headline',''))} :: " + ' | '.join(str(e.get('startDate',''))+' '+txt(e.get('headline','')) for e in ev)); m.lecture+=sum(mots(txt(e.get('text',''))) for e in ev)
    elif lib=='ImageHotspotQuestion':
        q=p.get('imageHotspotQuestion',{}).get('hotspotSettings',{}); m.questions+=1; hs=q.get('hotspot',[])
        L(f"{ind}[TROUVER LA ZONE {sum(1 for h in hs if (h.get('userSettings') or {}).get('correct'))} bonne(s)/{len(hs)}] {txt(q.get('taskDescription',''))}")
    elif lib=='GuessTheAnswer':
        L(f"{ind}[DEVINE] {txt(p.get('taskDescription',''))} => {txt(p.get('solutionText',''))[:200]}")
    elif lib=='Questionnaire':
        qs=p.get('questionnaireElements',[]); L(f"{ind}[QUESTIONNAIRE sans note x{len(qs)}] " + ' | '.join(txt(((q.get('library') or {}).get('params') or {}).get('question','')) for q in qs))
    elif lib=='Chart':
        L(f"{ind}[GRAPHIQUE {p.get('graphMode')}] {txt(p.get('figureDefinition',''))} :: " + ' | '.join(f"{txt(x.get('text',''))}={x.get('value')}" for x in p.get('listOfTypes',[])))
    elif lib=='CoursePresentation':
        sl=p.get('presentation',{}).get('slides',[]); L(f"{ind}[PRÉSENTATION {len(sl)} diapos]")
        for k,sd in enumerate(sl,1):
            for e in sd.get('elements',[]):
                if e.get('action'): decrire(e['action'], m, niv+2, True)
    elif lib=='ImageHotspots':
        hs=p.get('hotspots',[]); L(f"{ind}[IMAGE À POINTS x{len(hs)}] " + ' | '.join(txt(h.get('header','')) for h in hs)); m.lecture+=sum(mots(txt(json.dumps(h.get('content',[]),ensure_ascii=False))) for h in hs)//2
    elif lib in ('ImageSlider','Agamotto','MemoryGame','MultiMediaChoice','AudioRecorder','Crossword','Collage'):
        d_=txt(p.get('taskDescription','') or p.get('question','') or p.get('title','') or '')
        n=len(p.get('imageSlides',[]) or p.get('items',[]) or p.get('cards',[]) or p.get('options',[]) or p.get('words',[]))
        if lib in ('MultiMediaChoice','Crossword','MemoryGame'): m.questions+=1
        extra=''
        if lib=='Crossword': extra=' :: ' + ' | '.join(f"{w.get('answer')}: {txt(w.get('clue',''))}" for w in p.get('words',[]))
        if lib=='MultiMediaChoice': extra=' :: ' + ' / '.join(('*' if (o.get('correct')) else '')+txt(((o.get('media') or {}).get('params') or {}).get('alt','')) for o in p.get('options',[]))
        L(f"{ind}[{lib.upper()} x{n}] {d_}{extra}")
    elif lib=='':
        pass
    elif lib in ('Video','Audio'):
        m.video+=1; L(f"{ind}[{lib.upper()}] {json.dumps(p, ensure_ascii=False)[:200]}")
    elif lib=='IFrameEmbed':
        L(f"{ind}[CADRE] {p.get('source','')}")
    else:
        m.notes.append(lib); L(f"{ind}[{lib}] {txt(json.dumps(p, ensure_ascii=False))[:300]}")
def module(mid, court=False):
    d=json.load(open(f'{R}/{mid}/content/content.json')); h=json.load(open(f'{R}/{mid}/h5p.json')); m=M(); main=h['mainLibrary']
    m.lignes.append(f"##### {mid} · {main} · {h.get('title')}")
    if main=='H5P.InteractiveBook':
        if d.get('showCoverPage'): m.lignes.append('[COUVERTURE] '+txt((d.get('bookCover') or {}).get('coverDescription','')))
        m.chap=len(d.get('chapters',[]))
        for i,c in enumerate(d.get('chapters',[]),1):
            m.lignes.append(f"\n=== Chapitre {i} : {txt((c.get('metadata') or {}).get('title',''))}")
            decrire(c, m, 1, court)
    elif main=='H5P.GameMap':
        g=d.get('gamemapSteps',{}).get('gamemap',{}); els=g.get('elements',[]); m.chap=len(els)
        m.lignes.append('[INTRO] '+txt((d.get('titleScreen') or {}).get('titleScreenIntroduction','')) + ' | vies: ' + str((d.get('behaviour') or {}).get('lives')) + ' | fin: ' + txt(json.dumps(d.get('endScreen',{}),ensure_ascii=False))[:300])
        for e in els:
            m.lignes.append(f"\n=== Étape : {txt(e.get('label',''))} (type {e.get('specialStageType') or 'exercice'})")
            if e.get('contentsList'):
                for c in e['contentsList']: decrire(c.get('contentType',{}), m, 1, court)
    else: decrire({'library':main+' x','params':d}, m, 0, court)
    return m
if __name__=='__main__':
    court = os.environ.get('COURT')=='1'
    for mid in sys.argv[1:]:
        m=module(mid, court); print('\n'.join(m.lignes)); print()
