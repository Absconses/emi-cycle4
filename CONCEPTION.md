# Plateforme EMI cycle 4 : conception et état du chantier

Ce fichier garde les décisions prises pendant la refonte des modules, pour que le travail
ne dépende d'aucune conversation. À lire avant de toucher à un module. Dernière mise à jour :
15 novembre 2026.

## 1. Le projet

- **But.** Permettre à des élèves de 5e, 4e et 3e de se former en autonomie à l'éducation aux
  médias et à l'information. La plateforme est destinée à être vendue.
- **Contenu.** 30 modules H5P : 27 livres interactifs (9 par niveau, trois domaines) et 3 Game Maps.
- **Fil narratif.** Le journal du collège, *Le Tilleul*, et ses rédacteurs : Inès, Sami, Yanis.
- **Deux lecteurs.** `module.html` (plateforme, progression dans le navigateur) et
  `lumi/module.html` (Lümi : comptes enseignants et classes, en mode démonstration, base non branchée).
- **Référence.** La revue critique des 30 modules est un document Claude à part
  (« Plateforme EMI cycle 4 : revue critique des 30 modules »).

## 2. Les six règles de conception

Fixées par M. Pempie. Elles s'appliquent à toute activité.

0. **Des distracteurs qui ont du sens**, dont la correction détrompe. **Varier la réponse la
   plus longue** : sinon l'élève devine la bonne réponse à sa forme.
1. **Zéro faux négatif.** Accepter toutes les réponses plausibles : synonymes, fautes
   d'orthographe, mots-indices raisonnables.
2. **Les mots des élèves, pas les nôtres.** Faire relire une consigne par un élève.
3. **La question avant l'aide.** Tableau, accordéon ou carte viennent en « coup de pouce »,
   après la question. Sinon l'élève recopie au lieu de chercher.
4. **Un retour qui explique** pourquoi c'est faux, pas seulement « faux ».
5. **L'interactivité doit avoir un sens.** Un clic qui fait réfléchir vaut mieux qu'une suite
   de glisser-déposer. Varier les types dans un même livre.
6. **Une tâche finale faisable.**

Contrôle : `scripts/audit-reponses.py` du skill `h5p-lumi` doit sortir **0 ligne « LONGUE »**
sur le `content.json` d'un module. Seule exception : une série qui réutilise les mêmes étiquettes
courtes d'une question à l'autre (les quatre familles de genres, par exemple).

**Pas de mots croisés** (M. Pempie, 29 octobre 2026). Dans une Game Map, le défi final devient un
choix rapide (Single Choice Set) : une définition, trois mots. Il en reste dans les Game Maps de 4e
et de 3e, à remplacer pendant leur refonte.

## 3. Le plan d'un livre

1. **Introduction** : la situation, « À la fin de ce livre, tu sauras… », et la **promesse**
   (« Pour le prouver, tu… »).
2. **Chapitres** : un par notion. Activité d'abord, coup de pouce ensuite.
3. **« À toi »** : la tâche finale.
4. **« Tout relier »** : la carte du livre à reconstituer.
5. **« Ma trace écrite »** : dernier chapitre.

## 4. La tâche finale

**Principe (M. Pempie).** Lancer l'élève, instruit par le reste du module, sur une **tâche
complexe réalisable en autonomie**. Elle répond à la **promesse** du module et **valide que
l'élève est capable**. C'est le lieu de l'inventivité pédagogique : on ne lésine pas.

**Ce qui a été écarté**

- **Le Documentation Tool comme tâche finale** : une fiche de 6 à 13 champs, non corrigée,
  dont l'export ne sert à rien. Rappel de M. Pempie (15 novembre 2026) : **aucun Documentation
  Tool en dehors de la trace écrite**, même en attendant mieux. Quand on refond un livre, on le
  retire dans la même demande de fusion.
- **Une simple série de questions** : ce n'est pas une tâche complexe.
- **Des tampons à poser sur un document inventé** (essayé sur les 5.6 et 5.8) : jugé trop
  artificiel et trop simple.

**Le modèle retenu : le dossier de vrais documents** (livre 5.6, « Le dossier du Tilleul »)

1. Une question d'actualité réelle, posée au *Tilleul*.
2. Un dossier de cinq documents **réels**, de fiabilité inégale. Pour chacun : une courte
   citation exacte, un résumé fidèle, et le lien vers la page d'origine (nouvel onglet).
   L'élève peut sortir du module.
3. Le dossier passé au crible : des affirmations à confirmer ou non en recoupant les documents.
4. Une production écrite (l'encadré du *Tilleul*), validée par critères, puis comparée à une
   réponse possible.

Modèle **validé par M. Pempie le 15 novembre 2026** : il s'applique à toutes les tâches finales.
Marche à suivre, pour chaque livre : proposer d'abord le sujet et les documents réels (liens ouverts,
citations exactes), attendre son accord, puis construire.

**Contraintes à connaître**

- Mots-clés d'une production écrite : la tolérance aux fautes rapproche les mots courts
  (« peur » est reconnu dans « peux »). Préférer des expressions (« a peur », « la loi ») et
  essayer une bonne réponse d'élève et une mauvaise avant de livrer.
- La machine ne valide que ce que l'élève assemble. Une production libre se valide par
  critères (mots-clés larges, avec jokers) et par une réponse possible. Les mots-clés peuvent
  manquer une bonne réponse formulée autrement.
- Droit d'auteur : une seule courte citation exacte par document, le reste en résumé, avec le
  lien. Les textes de loi peuvent être cités en entier.
- Une page web peut changer ou disparaître : le résumé doit suffire, et une note le dit à l'élève.

## 5. La trace écrite

Décision : le **Documentation Tool sert de trace écrite**, préparée par tout le reste du module.

- Une page, **quatre phrases à terminer** (amorces), toutes obligatoires.
- Sous chaque phrase, un **coup de pouce** : où relire, ce que la phrase doit contenir, une
  phrase pour comparer. L'élève écrit d'abord, vérifie ensuite.
- Le « À retenir » quitte « Tout relier » et devient la **dernière vérification**.
- L'export ne reprend que les consignes des champs et les réponses : les amorces portent donc
  la leçon. Le titre de page est tronqué au-delà de 57 caractères : rester sous 50.
- Limite : les phrases ne sont pas corrigées par la machine, et le professeur ne reçoit pas
  la trace. À traiter dans Lümi quand la base sera branchée.

## 6. Notes techniques

- **Types acceptés dans un livre** (H5P.Column 1.18) : 34 types seulement. Les types
  « exotiques » (scénario à embranchements, onglets…) passent par un **module compagnon** :
  champ `compagnon` dans `modules.json`, affiché sous le livre.
- **`h5p-emi.css`** : retouches chargées dans le cadre H5P par les deux lecteurs (`customCss`).
- **Glisser-déposer** : `x` et `y` en pourcentage, largeur et hauteur en **em** (16 px pour
  une toile de 860 px).
- **« Trouve la zone »** : l'image s'affiche à sa taille réelle au plus. Pour une image en
  hauteur, fournir un fichier plus petit plutôt qu'une règle CSS.
- **Texte à trous** : `acceptSpellingErrors` à vrai, et variantes séparées par `/`.
- **Réponses de QCM** : écrire de vrais espaces insécables, pas `&nbsp;` (l'audit compte les caractères).
- **Bibliothèques ajoutées** : H5P.BranchingScenario 1.8, H5P.BranchingQuestion 1.0.

## 7. Images

- **Une image = un module.** Varier aussi les sujets.
- Doublons connus au 15 novembre 2026 : le kiosque d'Athènes (4 modules), l'interview et la
  salle informatique du collège de Baozhong, le carnet aux crayons, les collégiens reporters
  d'East Joplin, l'activité de club du Tamil Nadu, et quelques images en 4e et en 3e.
  Les lister : `python scripts/registre-images.py modules` (skill `h5p-lumi`, demande de fusion n° 35).
- Le skill s'ouvre à d'autres banques que Wikimedia (même demande de fusion).
- Accès vérifié le 15 novembre 2026 depuis une session en ligne : Wikimedia Commons, **Pixabay**
  (par son API, clé dans la variable `PIXABAY` ; appeler avec `curl`, la bibliothèque Python est
  refusée) et la recherche Flickr répondent. Unsplash et Pexels demandent une clé. Openverse,
  Library of Congress, Europeana, Gallica et Légifrance refusent l'accès.
- Crédit d'une photo Pixabay : « Sujet — auteur, Pixabay (licence Pixabay) », avec le lien vers
  la page de la photo.
- Éviter les élèves reconnaissables dans un produit vendu.
- **Esquisses.** Un récit gagne à être dessiné, même à gros traits (demande de M. Pempie,
  15 novembre 2026, pour la frise « L'histoire d'une photo » du 5.9). Dessins faits maison avec
  `outils/esquisses/` (trait à main levée, 800 × 500, PNG 48 couleurs, 25 à 35 ko pièce).
  Dans une frise (Timeline), le dessin va dans `asset.media` de chaque date, sous la forme
  `data:image/png;base64,…` : ce champ n'accepte qu'une adresse, pas un fichier du module.
  `h5p-emi.css` place alors le dessin au-dessus du texte ; régler `height` à 720.
  Personnages inventés, traits simples, peu de mots dans l'image : le texte reste dans la frise.

## 8. État d'avancement (15 novembre 2026)

| Livre | QCM, aides, variété | Trace écrite | Tâche finale |
|---|---|---|---|
| 5.1 Comment et pourquoi je m'informe | fait | faite | **à refaire** (clic sur l'affiche + 3 questions) |
| 5.2 Les médias et ceux qui font l'information | fait | faite | **à refaire** (série de 4 questions) |
| 5.3 Langages, faits et opinions | fait | faite | gardée : chronique enregistrée |
| 5.4 Choisir le bon outil | fait | faite | **à refaire** (série de 5 questions) |
| 5.5 Chercher avec méthode | fait | faite | **à refaire** (série de 5 questions) |
| 5.6 Évaluer une source | fait | faite | refaite : dossier de vrais documents, à valider |
| 5.7 Mettre en valeur une information | fait | faite | refaite : dossier de vrais documents « portable en pause », crible, brève, choix du format |
| 5.8 Publier de façon éthique | fait | faite | **à refaire** (tampons) ; le scénario reste au chapitre 4 |
| 5.9 Mes traces, mes réactions | fait ; frise illustrée | faite | provisoire : réponse à Sami, production écrite validée par critères ; dossier réel proposé le 15 novembre |
| Game Map 5e | fait | sans objet | sans objet ; le défi final est un choix rapide (les mots croisés sont retirés) |
| 4e (9 livres + Game Map), 3e (9 livres + Game Map) | à faire | à faire | à faire |

Pistes proposées pour les tâches finales à refaire, avant l'abandon des tampons (à repenser
sur le modèle du dossier réel) : 5.1 décrypter une campagne jamais vue ; 5.2 composer le plan
de couverture d'un événement ; 5.4 mener une recherche sur un nouveau sujet ; 5.5 sa propre
fiche de recherche en deux pages ; 5.8 relire un article avant publication, avec de vrais
textes de loi ; 5.7 écrire une brève à partir d'un dossier réel, puis choisir son format.

## 9. Chantiers ouverts

- **« Et toi ? »** : 25 de ces questions donnent un point dès l'ouverture du livre, d'où un score affiché avant tout travail.
- Le score d'un module compagnon n'apparaît pas dans le tableau de l'enseignant.
- Lümi : base Supabase non branchée ; le nom « Lümi » est aussi celui d'un éditeur H5P.
- Vidéos : hébergées sur YouTube, jamais visionnées pendant la refonte (les questions gardent
  le sens des anciennes bonnes réponses).
- Aucun essai avec des élèves ; Firefox, Safari et les postes du CDI non testés.
- Demande de fusion n° 7, obsolète, toujours ouverte.

## 10. Façon de travailler

- Chaque changement passe par une branche et une demande de fusion.
- Sur ce dépôt, la fusion est **automatique** après vérification dans un navigateur (décision
  du 14 novembre 2026). Sur le skill `h5p-lumi`, on ne fusionne pas sans accord.
- Après fusion, vérifier le déploiement (Actions : « pages build and deployment ») et donner
  le lien en ligne.
- Dire ce qui est vérifié et ce qui ne l'est pas.

## 11. Outils (`outils/`)

| Fichier | Rôle |
|---|---|
| `livre.py` | Fabrication : trace écrite (`ajoute_trace`), QCM, coups de pouce, séries de questions |
| `documents.py` | Document dessiné en HTML puis rendu en image, glisser-déposer sur image, production écrite validée par critères |
| `verifier-livre.py` | Ouvre un livre dans Chromium, parcourt chaque chapitre, relève les erreurs |
| `extraire.py` | Sort le contenu d'un module en texte lisible : `python3 outils/extraire.py <id>` |
| `pol2.py` | Sert les polices en local pendant les tests sans réseau |
| `esquisses/` | Dessins à main levée (rough.js) : une page HTML par série, `rendre.py` en fait des PNG |
| `exemples/` | Deux transformations déjà appliquées, à prendre comme modèles |

Pour tester : `python3 -m http.server 8766` à la racine, puis
`python3 outils/verifier-livre.py <id du module>`. Il faut Python, Playwright et Chromium.

Dans une session en ligne : `pip install playwright==<version du Playwright déjà installé>` (la
même que celle de Node, pour retrouver son Chromium), puis installer les polices avec la commande
`npm` indiquée en tête de `pol2.py` et donner leur dossier dans la variable `POLICES`. Sans les
polices, la page ne finit pas de charger.
