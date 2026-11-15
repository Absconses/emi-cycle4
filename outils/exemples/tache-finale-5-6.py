# Exemple : tâche finale sur un dossier de vrais documents (dossier, crible, production écrite).
# Script déjà appliqué au dépôt : il sert de modèle, ses vérifications (assert) échouent si on le relance.
import sys, json, copy, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
from livre import *
from documents import redaction
D=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','modules/5e-qui-parle-evaluer-une-source/content/')
F=D+'content.json'; c=json.load(open(F)); ch=c['chapters']
assert ch[6]['metadata']['title']=='6 · À toi : expertise une page'
gmc=copy.deepcopy(ch[5]['params']['content'][5]['content']['params']['questions'][0])
ges=[e['content'] for x in ch[:6] for e in x['params']['content'] if e['content']['library'].startswith('H5P.Essay')][0]
def lien(u): return '<a href="'+u+'" target="_blank" rel="noopener">Lire la page d’origine</a>'
def fiche(qui, quand, dit, citation, url):
    return ('<p style="margin:0 0 .5em;color:#555;font-size:.92em">'+qui+'<br>'+quand+'</p>'
            '<p><strong>Ce que dit la page.</strong> '+dit+'</p>'
            '<p style="border-left:4px solid #1d3557;padding:.2em 0 .2em .8em;margin:.6em 0"><em>«&nbsp;'+citation+'&nbsp;»</em></p>'
            '<p>'+lien(url)+'</p>')
docs=[
 ('Document A · anses.fr','Site de l’Anses, l’Agence nationale de sécurité sanitaire de l’alimentation, de l’environnement et du travail.','Actualité du 1<sup>er</sup> octobre 2013, publiée avec un avis de l’agence.',
  'L’agence a étudié 212 signalements d’effets indésirables. Elle recommande de ne pas boire ces boissons avec de l’alcool ni pendant un effort physique, et de surveiller la caféine que consomment les enfants et les adolescents. Elle demande aussi d’encadrer la publicité qui les vise.',
  'Boissons dites énergisantes&nbsp;: l’Anses met en garde contre des modes de consommation à risques','https://www.anses.fr/fr/content/boissons-dites-energisantes-lanses-met-en-garde-contre-des-modes-de-consommation-risques'),
 ('Document B · pourquoidocteur.fr','Site d’information sur la santé <em>Pourquoi Docteur</em>. Article signé Stanislas Deve.','Publié le 8 octobre 2026.',
  'Un rapport de deux députés, Sandrine Runel et Yannick Neuder, rendu public le 7 octobre 2026, recommande d’interdire la vente de ces boissons aux moins de 16 ans et de les retirer des distributeurs. Le rapport s’appuie sur des données de l’Anses. Le ministère de la Santé ne soutient pas une interdiction immédiate, mais veut étudier la mesure. La phrase ci-dessous vient du rapport, cité par l’article.',
  'peut bel et bien engendrer des effets nocifs','https://www.pourquoidocteur.fr/Articles/Question-d-actu/55963-Boissons-energisantes-risques-sante-ados'),
 ('Document C · inc-conso.fr','Site de l’Institut national de la consommation, un établissement public. La parole est donnée à Audrey Morice, de l’association foodwatch.','Publié le 19 février 2026.',
  'Ces boissons contiennent surtout de la caféine, du sucre et de la taurine, et n’ont pas d’intérêt nutritionnel. Les adolescents sont très sensibles à la caféine&nbsp;: palpitations, troubles du rythme du cœur, anxiété. Les risques augmentent avant ou pendant le sport, et avec de l’alcool.',
  'Les boissons énergisantes sont déconseillées aux enfants et adolescents.','https://www.inc-conso.fr/content/les-boissons-energisantes-sont-elles-dangereuses-pour-mon-enfant-avec-foodwatch'),
 ('Document D · redbull.com','Site français de la marque Red Bull, rubrique «&nbsp;Questions et réponses&nbsp;».','Ni auteur, ni date.',
  'La marque écrit que sa boisson ne déshydrate pas, et qu’une certaine dose de caféine avant un effort intense ne pose pas de problème de sécurité. Elle renvoie pour cela à l’autorité européenne de sécurité des aliments, sans donner de lien. Autour du texte, des boutons «&nbsp;Voir le produit&nbsp;» mènent aux canettes.',
  'Red Bull Energy Drink n’est pas une boisson pour la réhydratation.','https://www.redbull.com/fr-fr/energydrink/questions/y-a-t-il-des-recommandations-sur-l-utilisation-de-red-bull-energy-drink-dans-le-sport'),
 ('Document E · umvie.com','Site umvie.com. Article signé «&nbsp;La Rédaction&nbsp;», sans nom de personne.','Publié le 15 juin 2023. Le site prévient lui-même que la page n’est pas mise à jour régulièrement.',
  'La page déconseille ces boissons aux moins de 18 ans, puis ajoute que des experts les acceptent dès 16 ans. Elle affirme que la France en interdit la vente aux moins de 16 ans, sans citer de loi. Elle parle des «&nbsp;autorités sanitaires&nbsp;» sans dire lesquelles.',
  'certains experts estiment que les jeunes peuvent commencer à consommer des boissons énergisantes','https://umvie.com/a-partir-de-quel-age-peut-on-boire-du-red-bull/'),
]
dossier={'params':{'hTag':'h3','panels':[{'title':t,'content':{'params':{'text':fiche(q,d,dit,ci,url)},'library':'H5P.AdvancedText 1.1','subContentId':u(),'metadata':meta(t,'Text')}} for t,q,d,dit,ci,url in docs]},'library':'H5P.Accordion 1.0','subContentId':u(),'metadata':meta('Le dossier : cinq vrais documents','Accordion')}
crible=qcm(gmc,'Le dossier au crible','<p><strong>2. Passe le dossier au crible.</strong> Coche toutes les affirmations que le dossier permet de confirmer. Il y en a plusieurs. Pour chacune, retourne lire les documents&nbsp;: ne réponds pas de mémoire.</p>',[
 ('Deux organismes publics du dossier mettent en garde les adolescents.',True,'Oui&nbsp;: l’Anses (A) demande de surveiller la caféine des adolescents, et l’Institut national de la consommation (C) leur déconseille ces boissons.','Il fallait la cocher&nbsp;: l’Anses (A) et l’Institut national de la consommation (C) mettent tous deux en garde les adolescents.'),
 ('En France, la vente de ces boissons est déjà interdite aux moins de 16 ans.',False,'Non&nbsp;: seul le document E l’affirme, sans citer de loi. Le document B montre qu’en octobre 2026 des députés <em>proposent</em> seulement de l’interdire.'),
 ('Le document B relaie un rapport, qui s’appuie lui-même sur le document A.',True,'Oui&nbsp;: l’article rend compte du rapport des députés, et ce rapport s’appuie sur les données de l’Anses. En remontant la chaîne, on arrive au document A.','Il fallait la cocher&nbsp;: l’article (B) rend compte du rapport, qui s’appuie sur les données de l’Anses (A).'),
 ('Le document D a été écrit par des spécialistes indépendants de la marque.',False,'Non&nbsp;: c’est le site de la marque elle-même, sans auteur ni date. Elle parle de son propre produit, et des boutons mènent aux canettes.'),
 ('Deux documents fiables déconseillent d’en boire pendant le sport.',True,'Oui&nbsp;: l’Anses (A) et l’Institut national de la consommation (C). La marque (D) dit seulement que sa boisson ne déshydrate pas.','Il fallait la cocher&nbsp;: l’Anses (A) et l’Institut national de la consommation (C) le déconseillent tous les deux.'),
 ('Le document E cite précisément les études sur lesquelles il s’appuie.',False,'Non&nbsp;: «&nbsp;certains experts&nbsp;», «&nbsp;les autorités sanitaires&nbsp;»… Aucun nom, aucun lien&nbsp;: impossible de remonter à la source.'),
 ('Le document le plus ancien du dossier est aussi la source d’origine.',True,'Oui&nbsp;: l’actualité de l’Anses date de 2013. C’est sur ses travaux que s’appuient le rapport des députés et l’article qui en parle.','Il fallait la cocher&nbsp;: l’actualité de l’Anses (A) date de 2013, et les autres s’appuient sur ses travaux.'),
 ('Chaque document du dossier est signé par une personne que l’on peut nommer.',False,'Non&nbsp;: le document D n’a pas d’auteur, et le document E est signé «&nbsp;La Rédaction&nbsp;». Seuls B et C nomment une personne.')],multi=True)
encadre=redaction(ges,'L’encadré du Tilleul','<p><strong>3. Écris l’encadré du <em>Tilleul</em></strong>, en six à huit lignes&nbsp;: «&nbsp;Faut-il interdire les boissons énergisantes aux moins de 16 ans&nbsp;?&nbsp;» Dis où en est la loi, explique les risques, donne un conseil aux élèves, et <strong>cite au moins deux sources du dossier</strong>.</p>',[
 ('Anses',['agence nationale','agence'],'Tu cites l’Anses.','Tu ne cites pas l’Anses, la source d’origine du dossier.'),
 ('rapport',['député*','depute*','INC','institut national','foodwatch','Pourquoi Docteur'],'Tu cites une deuxième source.','Il manque une deuxième source&nbsp;: le rapport des députés, ou l’Institut national de la consommation.'),
 ('interdi*',['propos*','recommand*','pas encore','loi'],'Tu dis où en est la loi.','Tu n’as pas dit où en est la loi&nbsp;: l’interdiction existe-t-elle déjà, ou est-elle seulement proposée&nbsp;?'),
 ('caféine',['cafeine','cœur','coeur','cardia*','palpitation*','sommeil','anxiété','anxiete'],'Tu expliques un risque.','Tu n’as pas expliqué les risques. Relis les documents A et C.'),
 ('déconseill*',['deconseill*','éviter','eviter','évite*','evite*','mieux vaut','se passer','ne pas en boire','prudence'],'Tu donnes un conseil.','Il manque ton conseil aux élèves du collège.'),
],'<p><strong>Faut-il interdire les boissons énergisantes aux moins de 16 ans&nbsp;?</strong> Pour l’instant, ce n’est pas la loi. En octobre 2026, deux députés l’ont proposé dans un rapport. Ils s’appuient sur l’Anses, l’agence publique qui étudie les risques pour la santé&nbsp;: depuis 2013, elle met en garde contre ces boissons riches en caféine, surtout avec de l’alcool ou pendant le sport. L’Institut national de la consommation les déconseille lui aussi aux enfants et aux adolescents. La marque Red Bull présente sa boisson autrement, mais c’est elle qui la vend. Notre conseil&nbsp;: mieux vaut s’en passer.<br><em>Sources&nbsp;: Anses (2013), Pourquoi Docteur (8 octobre 2026), Institut national de la consommation (2026).</em></p>',minimum=250)
c6=ch[6]['params']['content']
mission=adv('<p><em>Le Tilleul</em> prépare un encadré sur une question d’actualité&nbsp;: <strong>faut-il interdire les boissons énergisantes aux moins de 16 ans&nbsp;?</strong> Inès a réuni cinq documents. Ils sont tous réels, et ils ne se valent pas.</p>\n'
 '<p>Voici la tâche finale du livre. Personne ne te guide&nbsp;: à toi de lire, de recouper et d’écrire. Compte une vingtaine de minutes.</p>\n'
 '<p><strong>1. Lis le dossier.</strong> Ouvre chaque document. Pour lire le texte entier, clique sur «&nbsp;Lire la page d’origine&nbsp;»&nbsp;: la vraie page s’ouvre dans un nouvel onglet.</p>','Mission dossier')
note=adv('<p style="font-size:.85em;color:#555">Pages consultées le 15 novembre 2026. Les courtes citations sont exactes&nbsp;; le reste résume chaque page. Une page web peut changer ou disparaître&nbsp;: si un lien ne répond plus, sers-toi du résumé.</p>','Note sur les sources')
ch[6]['params']['content']=[c6[0],mission,bloc(dossier),note,bloc(crible),bloc(encadre)]
rep(c6[0],'À toi&nbsp;: expertise une page</h2>','À toi&nbsp;: le dossier du Tilleul</h2>')
T6='6 · À toi : le dossier du Tilleul'; ch[6]['metadata']['title']=ch[6]['metadata']['extraTitle']=T6
i=ch[0]['params']['content']
rep(i[4],'Pour le prouver, tu expertiseras seul une page web que tu n’as jamais vue.','Pour le prouver, tu passeras au crible un dossier de vrais documents, puis tu écriras pour <em>Le Tilleul</em>.')
rep(i[5],'<li>À toi&nbsp;: expertise une page</li>','<li>À toi&nbsp;: le dossier du Tilleul</li>')
rep(ch[-1]['params']['content'][0],'la chaîne des relais, ton expertise et la carte du livre','la chaîne des relais, le dossier du Tilleul et la carte du livre')
json.dump(c,open(F,'w'),ensure_ascii=False)
if os.path.exists(D+'images/page-tonus.jpg'): os.remove(D+'images/page-tonus.jpg')
print('écrit', T6, '| page-tonus:', open(F).read().count('page-tonus'))
