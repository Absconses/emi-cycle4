# Exemple : transformation complète d’un livre (QCM, aide après la question, texte à trous tolérant, série finale, trace écrite).
# Script déjà appliqué au dépôt : il sert de modèle, ses vérifications (assert) échouent si on le relance.
import sys, json, copy, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
from livre import *
F=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','modules/5e-les-outils-pour-s-informer/content/content.json')
c=json.load(open(F)); ch=c['chapters']
assert len(ch)==9 and ch[7]['metadata']['title'].startswith('7 · À toi')
gab=ch[5]['params']['content'][5]['content']; assert gab['library'].startswith('H5P.MultiChoice')

# --- chapitre 1 : la question avant l'aide (la boîte à outils passe après le quiz)
c1=ch[1]['params']['content']; assert c1[1]['content']['library'].startswith('H5P.ImageHotspots') and c1[3]['content']['library'].startswith('H5P.SingleChoiceSet')
rep(c1[0],'<p>Voici la boîte à outils d\'Inès. <strong>Clique sur chaque +</strong> pour découvrir à quoi sert chaque outil.</p>','<p>Inès a quatre outils sous la main&nbsp;: le <strong>portail du CDI</strong>, une <strong>encyclopédie en ligne</strong>, un <strong>moteur de recherche</strong> et la <strong>presse</strong>. Lequel choisir&nbsp;? Cela dépend de ce qu’elle cherche.</p>')
rep(c1[2],'Réponds vite&nbsp;: la question suivante arrive toute seule.','Réponds vite&nbsp;: la question suivante arrive toute seule. Essaie d’abord sans aide&nbsp;: la boîte à outils d’Inès t’attend juste après.')
ch_=c1[3]['content']['params']['choices']
assert 'hier' in ch_[1]['question'] and 'définition' in ch_[2]['question']
ch_[1]['answers']=['<p>La presse</p>','<p>Une encyclopédie</p>','<p>Le portail du CDI</p>']
ch_[2]['answers']=['<p>Une encyclopédie</p>','<p>Un journal télévisé</p>','<p>Un réseau social</p>']
assert 'site officiel' in ch_[3]['question']; ch_[3]['answers']=['<p>Un moteur de recherche</p>','<p>Une encyclopédie en ligne</p>','<p>Un magazine papier</p>']
ch[1]['params']['content']=[c1[0],c1[2],c1[3],adv('<p><strong>Vérifie avec la boîte à outils d’Inès.</strong> Clique sur chaque + pour voir à quoi sert chaque outil.</p>','Consigne boîte à outils'),c1[1],c1[4],c1[5]]

# --- chapitre 4 : texte à trous, zéro faux négatif
b=ch[4]['params']['content'][3]['content']['params']; q=b['questions']
for a,n in (('*tout le monde:','*tout le monde/n’importe qui/n\'importe qui/chacun/tous/tout le monde peut:'),('*sources:','*sources/source/références/references:'),('*références/notes:','*références/notes/référence/note/references/sources:'),('*historique:','*historique/l’historique/l\'historique:')):
    k=[i for i,x in enumerate(q) if a in x]; assert len(k)==1, a; q[k[0]]=q[k[0]].replace(a,n)
b['behaviour']['acceptSpellingErrors']=True

# --- chapitre 5 : QCM de la vidéo et QCM sur l'autorité
iv=ch[5]['params']['content'][1]['content']['params']['interactiveVideo']['assets']['interactions']
maj_video(iv,0,[('Il suit les liens de page en page, et lit chaque page.',None),('Il surveille ce que chaque internaute fait sur Internet.',None),('Il vérifie que les informations des pages sont vraies.',None),('Il efface les pages dangereuses avant que tu les voies.',None)])
maj_video(iv,1,[('Il les envoie au moteur, qui les range dans son index.',None),('Il les envoie par message à tous les internautes connectés.',None),('Il corrige les fautes d’orthographe qu’il trouve dans la page.',None),('Il les oublie dès qu’il passe à la page suivante.',None)])
maj_video(iv,2,[('Dans son index, préparé à l’avance par ses robots.',None),('Sur tous les sites du web, en direct, au moment du clic.',None),('Dans les fichiers enregistrés sur son ordinateur.',None),('Dans le portail du CDI et les livres de son collège.',None)])
maj_video(iv,3,[('La popularité&nbsp;: beaucoup de liens mènent vers la page.',None),('La vérité&nbsp;: des personnes vérifient chaque page avant.',None),('L’âge de la personne qui fait la recherche.',None),('L’ordre alphabétique&nbsp;: les sites en A passent d’abord.',None)])
maj_video(iv,5,[('Un vendeur a payé pour apparaître quand on tape ces mots.',None),('C’est le site le plus populaire sur les citoyens de Rome.',None),('C’est la page où le mot «&nbsp;citoyen&nbsp;» revient le plus souvent.',None),('Le moteur a vérifié que c’est un bon site de déguisements.',None)])
a=gab['params']['answers']; assert a[0]['correct'] and len(a)==4
for x,t in zip(a,('Un musée, une encyclopédie et un manuel font un lien vers elle.','Elle répète «&nbsp;citoyen romain&nbsp;» deux cents fois dans son texte.','Cinquante blogs vides, créés le même jour, font un lien vers elle.','Elle a payé pour apparaître dans le cadre «&nbsp;Annonces&nbsp;».')):
    x['text']='<div>'+t.replace('&nbsp;',' ')+'</div>'
gab['params']['behaviour']['randomAnswers']=True

# --- chapitre 7 : tâche finale corrigée (la fiche de comparaison de 11 champs disparaît)
c7=ch[7]['params']['content']; assert c7[1]['content']['library'].startswith('H5P.DocumentationTool')
rep(c7[0],'Compare deux moteurs sur une même recherche</h2>','À toi&nbsp;: la veille de l’exposé</h2>')
rep(c7[0],'<p>Choisis ton sujet d\'exposé (ou celui d\'Inès) et fais <strong>la même recherche dans deux moteurs</strong>. Remplis la fiche, puis clique sur <strong>Créer mon document</strong> et télécharge-le pour le garder dans ton ENT.</p>',
 '<p>Demain, Inès présente son exposé sur les boissons énergisantes. Il lui reste cinq décisions à prendre.</p>\n<p>Voici la tâche finale du livre&nbsp;: aide-la à choisir. Tout ce qu’il te faut est dans les chapitres 1 à 6.</p>')
Q=lambda t,q,r: qcm(gab,t,'<p>'+q+'</p>',r)
qs=question_set('La veille de l’exposé',[
 Q('Une page sans auteur','Inès trouve une page qui affirme que les boissons énergisantes sont «&nbsp;sans aucun danger&nbsp;». Elle n’a ni auteur, ni date, ni mentions légales. Que fait Inès&nbsp;?',[
  ('Elle la garde&nbsp;: le moteur l’a classée tout en haut de ses résultats.',False,'Premier ne veut pas dire vrai&nbsp;: le moteur classe les pages par un calcul, il ne vérifie pas ce qu’elles disent. Et ici, on ne sait pas qui parle.'),
  ('Elle cherche une autre page&nbsp;: ici, elle ne sait pas qui lui parle.',True,'Oui&nbsp;: sans auteur, sans date et sans mentions légales, impossible de savoir qui publie. Ce pourrait être une marque.'),
  ('Elle la garde&nbsp;: le site est clair, coloré et très bien présenté.',False,'Un site bien présenté peut être celui d’une marque. Ce qui compte, ce sont les repères&nbsp;: l’auteur, la date, et qui publie le site.')]),
 Q('L’article au bandeau orange','Dans l’encyclopédie collaborative, l’article «&nbsp;Caféine&nbsp;» porte un bandeau orange. Que met Inès dans son exposé&nbsp;?',[
  ('Le texte de l’article&nbsp;: une encyclopédie ne se trompe pas.',False,'Elle est souvent juste, mais une erreur peut y rester un moment. Et le bandeau prévient que l’article ne cite pas assez ses sources&nbsp;: on vérifie avec les références.'),
  ('Rien du tout&nbsp;: un article avec un bandeau est forcément faux.',False,'Le bandeau ne dit pas que l’article est faux&nbsp;: il dit qu’il ne cite pas assez ses sources. L’article sert à comprendre, les références à vérifier.'),
  ('Les références du bas de la page, après les avoir lues.',True,'Oui&nbsp;: l’article sert à comprendre le sujet. Les vraies sources, ce sont les références, et ce sont elles qu’on cite.')]),
 Q('Trouver le livre au CDI','Au CDI, le portail affiche la notice d’un livre sur le sommeil des adolescents. Quelle information permet à Inès de le trouver dans les rayons&nbsp;?',[
  ('La cote du livre',True,'Oui&nbsp;: la cote est collée sur le dos du livre, et elle indique où il est rangé.'),
  ('Le nom de l’éditeur',False,'L’éditeur est la maison qui a publié le livre&nbsp;: il ne dit pas où le livre est rangé. C’est la cote qu’il faut noter.'),
  ('Le nombre de pages',False,'Le nombre de pages dit si le livre est long, pas où il est rangé. C’est la cote qu’il faut noter.')]),
 Q('Le résultat sponsorisé','Dans le moteur, le premier résultat porte la mention «&nbsp;Sponsorisé&nbsp;»&nbsp;: c’est le site d’une marque de boisson. Qu’en pense Inès&nbsp;?',[
  ('C’est le meilleur site&nbsp;: le moteur l’a placé en premier.',False,'«&nbsp;Sponsorisé&nbsp;» veut dire payé&nbsp;: la marque a acheté cette place. Le moteur ne dit pas que le site est bon.'),
  ('C’est une publicité&nbsp;: la marque a payé pour apparaître en premier.',True,'Oui&nbsp;: Inès saute ce résultat, et regarde qui publie les sites suivants.'),
  ('C’est un site officiel&nbsp;: sinon il ne serait pas tout en haut.',False,'Un site officiel se reconnaît à celui qui le publie, dans les mentions légales, pas à sa place. Ici, la place a été payée par une marque.')]),
 Q('Tous les moteurs se valent ?','Son grand frère lui dit&nbsp;: «&nbsp;Tous les moteurs se valent.&nbsp;» Que répond Inès&nbsp;?',[
  ('Oui&nbsp;: ils montrent tous exactement les mêmes pages, dans le même ordre.',False,'Non&nbsp;: chaque moteur a son index et son calcul. Au chapitre 6, les deux moteurs ne montraient pas les mêmes résultats.'),
  ('Oui&nbsp;: aucun moteur ne garde la trace de ce que l’on cherche.',False,'Si&nbsp;: un moteur peut garder tes recherches, ta position et les sites où tu cliques. Relis le message de Trouvetout, au chapitre 6.'),
  ('Non&nbsp;: certains gardent mes recherches pour cibler leurs publicités.',True,'Oui&nbsp;: un moteur gratuit vit de la publicité. Certains gardent ton historique pour la cibler, d’autres non&nbsp;: on choisit aussi son moteur pour ses données.')]),
 ],'Relis les chapitres où tu t’es trompé, puis recommence.','L’exposé d’Inès repose sur de bons outils&nbsp;: tu sais les choisir.',seuil=80)
ch[7]['params']['content']=[c7[0],bloc(qs)]
T7='7 · À toi : la veille de l’exposé'; ch[7]['metadata']['title']=ch[7]['metadata']['extraTitle']=T7

# --- introduction, « Bravo » déplacé à la fin, trace écrite
i=ch[0]['params']['content']
rep(i[4],'Et tu repartiras avec <strong>ta fiche de comparaison de deux moteurs</strong>, à garder dans ton ENT.','Et tu repartiras avec <strong>ta trace écrite</strong>&nbsp;: ce que tu retiens, rédigé avec tes mots.')
rep(i[5],'<li>À toi&nbsp;: compare deux moteurs</li>','<li>À toi&nbsp;: la veille de l’exposé</li>')
c8=ch[8]['params']['content']; assert 'Bravo, tu as terminé ce livre' in c8[-1]['content']['params']['text']
bravo=c8.pop(-1)
T=ajoute_trace(c,'Choisir le bon outil : ce que je retiens',[
 ('Pour commencer une recherche, j’utilise d’abord…','chapitre 1, «&nbsp;Quel outil pour quel besoin&nbsp;?&nbsp;».','elle cite le <strong>portail du CDI</strong> et une <strong>encyclopédie</strong>, et dit à quoi sert l’un des deux.','…le portail du CDI, pour des documents choisis pour mon âge, et une encyclopédie, pour comprendre le sujet.'),
 ('Avant de croire une page web, je regarde…','chapitre 2, «&nbsp;Lire une page web&nbsp;».','elle cite <strong>au moins trois repères</strong>&nbsp;: le nom du site, l’auteur, la date, qui publie le site, ce qui est de la publicité.','…le nom du site, l’auteur, la date, et qui publie le site dans les mentions légales.'),
 ('Je peux me servir d’une encyclopédie écrite par tous, à condition de…','chapitre 4, «&nbsp;Une encyclopédie écrite par tous&nbsp;».','elle parle des <strong>références</strong> du bas de la page, qui servent à vérifier.','…vérifier avec les références du bas de la page&nbsp;: ce sont elles que je cite.'),
 ('Dans un moteur de recherche, le premier résultat n’est pas forcément le plus vrai, parce que…','chapitres 5 et 6, sur les moteurs de recherche.','elle donne au moins une raison&nbsp;: le moteur <strong>classe par un calcul</strong> (les mots-clés, la popularité), ou certains résultats sont des <strong>publicités payées</strong>.','…le moteur classe les pages par un calcul, sans vérifier ce qu’elles disent, et certains résultats sont des publicités payées.'),
],None,'La page web, le portail, l’encyclopédie, les deux moteurs et la carte du livre t’ont préparé&nbsp;: tu sais maintenant ce qu’il faut retenir.')
ch[-1]['params']['content'].append(bravo)
json.dump(c,open(F,'w'),ensure_ascii=False)
s=open(F).read(); print('écrit', T, '| DocTool:', s.count('"H5P.DocumentationTool '), '| ton ENT:', s.count('ton ENT'))
