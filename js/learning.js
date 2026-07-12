/* ============================================================
   learning.js — pedagogical content: how to think, technique by
   technique, for each of the 9 PSY0 exercise categories.
   ============================================================ */

const LEARNING_CONTENT = {
  logique: {
    tested: "Compléter une suite de nombres, de lettres ou une suite alternée (deux opérations qui reviennent tour à tour).",
    method: [
      "Écris les écarts entre chaque terme et le suivant, juste en dessous de la suite.",
      "Si les écarts sont constants → suite arithmétique (+N à chaque fois). S'ils sont multipliés → suite géométrique (×N).",
      "Si les écarts ne sont pas constants, regarde s'ils suivent eux-mêmes un motif, ou si la suite alterne deux règles (+a puis -b, +a puis -b...).",
      "Pour les lettres, convertis-les en position alphabétique (A=1, B=2, ... Z=26) et applique la même méthode que pour les nombres.",
      "Une fois ta réponse trouvée, vérifie-la en recalculant la suite depuis le début avec ta règle.",
    ],
    techniques: [
      "Toujours écrire les différences sur le papier (ou mentalement dans l'ordre) — ne jamais deviner à l'œil.",
      "Calcule le rapport (terme suivant ÷ terme actuel) : s'il est constant, c'est une suite géométrique.",
      "Pour une suite alternée, sépare les positions impaires et paires : elles suivent souvent deux règles distinctes.",
      "Élimine d'abord les options qui ne respectent clairement pas le sens de variation (croissant/décroissant).",
    ],
    pitfalls: [
      "Confondre une suite géométrique avec une suite arithmétique à grands pas.",
      "Oublier qu'une suite de lettres boucle après Z (le modulo 26).",
    ],
  },

  verbal: {
    tested: "Synonymes, antonymes et analogies (\"A est à B ce que C est à ?\").",
    method: [
      "Pour un synonyme/antonyme : élimine d'abord les mots dont le sens t'est clairement étranger, puis compare les mots restants par nuance et intensité.",
      "Pour une analogie : identifie précisément la relation entre A et B (fonction, catégorie, partie-tout, cause-effet, outil-usage) avant même de regarder les propositions.",
      "Construis une phrase-modèle avec A et B (ex : \"A sert à produire B\"), puis reformule cette même phrase avec C et chaque option.",
      "La bonne réponse est celle qui respecte EXACTEMENT la même relation, pas juste une association vaguement liée.",
    ],
    techniques: [
      "Cherche la racine latine ou grecque d'un mot inconnu pour déduire son sens approximatif.",
      "Pour un antonyme, méfie-toi des mots simplement \"différents\" : le contraire logique n'est pas toujours le mot qui semble le plus éloigné.",
      "Pour une analogie, résiste à la première association qui vient spontanément à l'esprit — vérifie-la avec la phrase-modèle.",
    ],
    pitfalls: [
      "Choisir un mot de la même famille grammaticale mais qui n'est pas un vrai synonyme.",
      "Dans une analogie, se tromper de sens de la relation (A→B n'est pas la même chose que B→A).",
    ],
  },

  attention: {
    tested: "Deux formats mélangés : (1) repérer toutes les occurrences d'une lettre cible dans une grille, parmi des lettres qui lui ressemblent (E/F, O/Q, P/R, M/N, I/L) ; (2) un test \"formes et couleurs\" (Stroop) où tu dois donner la couleur d'affichage d'un mot en ignorant ce que le mot signifie.",
    method: [
      "Grille de lettres : scanne ligne par ligne, toujours dans le même sens — jamais en diagonale ou de façon désordonnée.",
      "Grille de lettres : concentre-toi sur le détail qui distingue la cible de son \"sosie\" plutôt que sur sa ressemblance générale (ex : le E a une barre médiane, le F non).",
      "Formes et couleurs : lis d'abord la couleur d'affichage à voix haute (ou mentalement) avant de laisser ton cerveau lire automatiquement le mot — le réflexe de lecture est plus rapide que la perception de la couleur, il faut le court-circuiter.",
      "Formes et couleurs : si le mot et la couleur correspondent, réponds vite ; si ça ne correspond pas, ralentis légèrement pour ne pas répondre le sens du mot par automatisme.",
    ],
    techniques: [
      "Avant de commencer une grille, rappelle-toi explicitement le détail qui différencie la cible de son piège le plus proche.",
      "La précision compte autant que la vitesse : les clics sur de mauvaises lettres pénalisent le score.",
      "Pour le Stroop, regarde d'abord un coin flou du mot (pas les lettres elles-mêmes) pour percevoir la couleur sans te laisser distraire par le sens.",
      "Si le temps presse, valide ce que tu es sûr d'avoir vu plutôt que de risquer une réponse incertaine à la dernière seconde.",
    ],
    pitfalls: [
      "Se laisser piéger par la lettre confusable qui apparaît volontairement en grand nombre.",
      "Au Stroop, répondre automatiquement le sens du mot plutôt que sa couleur réelle — c'est l'erreur la plus fréquente et la plus rapide à commettre.",
    ],
  },

  spatial: {
    tested: "Deux formats mélangés : (1) reconnaître une figure plate tournée de 90°/180°/270°, parmi des options dont certaines sont en réalité une image miroir ; (2) un test \"cubes 2D/3D\" où deux cubes affichent chacun 3 faces visibles, et tu dois dire si c'est le même cube vu sous un autre angle ou deux cubes différents.",
    method: [
      "Figure plate : choisis un point de repère fixe et unique sur la figure de référence (le coin qui dépasse, la case isolée) plutôt que de regarder la figure entière.",
      "Figure plate : imagine uniquement la rotation de ce point de repère : où se retrouve-t-il après 90°, 180° ou 270° ?",
      "Cubes : repère le sens de rotation (horaire ou antihoraire) des 3 symboles autour du sommet commun sur le cube de référence, puis vérifie si ce même sens se retrouve sur le second cube.",
      "Cubes : si le second cube montre les 3 mêmes symboles mais dans l'ordre inverse autour du sommet, c'est un cube différent (ou son image miroir) — jamais une simple rotation.",
    ],
    techniques: [
      "Rotation à 90° dans le sens horaire : le haut de la figure devient sa droite. Utilise tes mains pour t'entraîner au début.",
      "Un piège miroir inverse le sens de l'asymétrie (la partie qui dépasse passe de gauche à droite) — une vraie rotation ne fait jamais ça, que ce soit en 2D ou pour l'ordre des symboles sur un cube en 3D.",
      "Pour les cubes, fixe un seul symbole comme référence et suis seulement son voisin direct (dans le sens horaire) : si ce voisin change entre les deux cubes, c'est un cube différent.",
      "Décompose une figure complexe en 2-3 sous-parties simples plutôt que de la traiter comme un bloc.",
    ],
    pitfalls: [
      "Confondre une rotation de 180° avec un simple retournement (miroir) — ce sont deux transformations différentes.",
      "Pour les cubes, essayer de comparer les 3 symboles un par un sans tenir compte de leur ORDRE relatif, ce qui fait rater le piège miroir à chaque fois.",
    ],
  },

  memoire: {
    tested: "Deux formats mélangés : (1) mémoriser une séquence de 4 à 8 chiffres ou lettres affichée brièvement, puis la retaper dans l'ordre exact ; (2) un \"2-back numérique\" où des chiffres défilent un par un et tu dois signaler chaque fois que le chiffre actuel est identique à celui d'il y a 2 crans.",
    method: [
      "Séquence à retaper : regroupe les éléments par blocs de 2 ou 3 (\"chunking\") plutôt que de les retenir un par un — le cerveau retient mieux des groupes que des unités isolées.",
      "Séquence à retaper : répète mentalement la séquence pendant qu'elle est encore affichée (répétition subvocale), ne te contente pas de la regarder passivement.",
      "2-back : ne garde en tête que les 2 derniers chiffres vus, pas toute la suite — à chaque nouveau chiffre, compare-le au plus ancien des deux, puis mets à jour ta mémoire de travail (le plus ancien sort, le nouveau entre).",
      "2-back : dis mentalement \"chiffre actuel... chiffre d'avant... chiffre d'il y a 2\" comme une routine fixe à chaque nouvel affichage, pour ne pas perdre le fil.",
    ],
    techniques: [
      "\"8-3-8-1\" se retient mieux découpé en \"83\" puis \"81\" que comme 4 chiffres isolés.",
      "Porte une attention particulière au début et à la fin de la séquence : le milieu est statistiquement ce qu'on oublie en premier (effets de primauté et de récence).",
      "Au 2-back, mieux vaut rater une correspondance de temps en temps que cliquer au hasard : les fausses alertes sont pénalisées autant que les oublis.",
      "Entraîne-toi progressivement (séquences plus longues, rythme du 2-back plus rapide) plutôt que de viser d'emblée la difficulté maximale.",
    ],
    pitfalls: [
      "Essayer de tout retenir d'un bloc sans regrouper, ce qui sature la mémoire de travail au-delà de 4-5 éléments.",
      "Au 2-back, comparer au chiffre juste précédent au lieu de celui d'il y a exactement 2 crans — l'erreur la plus fréquente sur ce format.",
    ],
  },

  vitesse: {
    tested: "Trois formats mélangés : (1) un calcul simple à résoudre vite ; (2) \"pair ou impair\" — dire si un nombre est pair ou impair en un temps très court ; (3) une \"grille de calculs\" où une seule égalité parmi plusieurs est fausse, à repérer.",
    method: [
      "Calcul simple : arrondis un des deux nombres pour simplifier le calcul, puis corrige le résultat (ex : 39 + 27 = 40 + 27 − 1).",
      "Calcul simple : décompose les multiplications difficiles en calculs plus simples (ex : 7 × 8 = 7 × 10 − 7 × 2).",
      "Pair ou impair : regarde uniquement le dernier chiffre du nombre — c'est lui seul qui détermine la parité, inutile de traiter le nombre entier.",
      "Grille de calculs : pour chaque égalité, vérifie d'abord l'ordre de grandeur du résultat (est-il dans la bonne fourchette ?) avant de recalculer précisément — ça élimine vite les 3/4 des égalités correctes.",
    ],
    techniques: [
      "Entraîne-toi à calculer de tête, sans poser l'opération sur papier, en utilisant systématiquement les arrondis.",
      "Connaître par cœur les tables de multiplication jusqu'à 12 × 12 évite d'avoir à les reconstruire à chaque fois.",
      "Grille de calculs : recalcule en dernier recours seulement les égalités qui \"semblent\" correctes après la vérification d'ordre de grandeur — l'erreur s'y cache souvent.",
      "Beaucoup de sessions courtes et régulières améliorent la vitesse plus efficacement que de rares sessions longues.",
    ],
    pitfalls: [
      "Vouloir être exact au prix de la vitesse alors que le temps est compté — trouve le bon compromis.",
      "Sur la grille de calculs, recalculer les égalités une par une dans l'ordre au lieu de scanner rapidement les ordres de grandeur en premier.",
    ],
  },

  anglais: {
    tested: "Vocabulaire courant, grammaire (temps et structures) et anglais aéronautique de base (phraséologie radio, situations de vol).",
    method: [
      "Pour le vocabulaire : identifie la racine du mot et le contexte (positif/négatif, formel/informel) pour déduire son sens si tu ne le connais pas par cœur.",
      "Pour la grammaire : repère d'abord les mots-clés qui indiquent le temps ou la structure attendue (\"by the time\", \"neither...nor\", \"if...had...\") avant de regarder les options.",
      "Pour l'anglais aéronautique : apprends le vocabulaire par famille de situation (urgence, communication radio, météo, procédures d'approche) plutôt que mot par mot isolé.",
    ],
    techniques: [
      "Utilise la répétition espacée intégrée à cette catégorie : elle te refait repasser automatiquement les mots que tu as ratés.",
      "Pour les questions de grammaire, essaie de formuler la règle à voix haute (\"present perfect avec by the time\") avant de choisir une option.",
      "Associe chaque terme aéronautique à une image mentale de la situation réelle où il est utilisé.",
    ],
    pitfalls: [
      "Traduire mot à mot au lieu de raisonner sur le sens global de la phrase.",
      "Confondre des mots aéronautiques proches en anglais mais aux usages différents (ex : \"holding\" vs \"go-around\").",
    ],
  },

  aero: {
    tested: "Culture générale aéronautique : principes de vol, axes et gouvernes, instruments, réglementation (IFR/VFR), histoire de l'aviation, vocabulaire d'exploitation.",
    method: [
      "Structure tes révisions par thème plutôt que question par question : principes de vol, axes de rotation et gouvernes associées, instruments de bord, réglementation, histoire, vocabulaire d'aéroport.",
      "Relie chaque notion à un exemple concret et mémorable (ex : roulis → ailerons → axe longitudinal).",
      "Cherche à comprendre le \"pourquoi\" de chaque principe (pourquoi la portance existe, pourquoi on utilise le QNH) plutôt que de mémoriser par cœur — ça permet de déduire la réponse à des questions jamais vues.",
    ],
    techniques: [
      "Fais des fiches courtes par thème (ex : \"les 3 axes et leurs gouvernes\") que tu relis régulièrement.",
      "Utilise la répétition espacée de cette catégorie pour ancrer les définitions sur le long terme plutôt que de tout réviser la veille.",
      "Regarde des schémas de cockpit ou d'aéronef pour visualiser concrètement ce que chaque terme désigne.",
    ],
    pitfalls: [
      "Confondre les trois axes de rotation (roulis / tangage / lacet) et leurs gouvernes associées.",
      "Apprendre des sigles sans comprendre ce qu'ils recouvrent concrètement, ce qui les rend impossibles à retrouver sous stress.",
    ],
  },

  psychomoteur: {
    tested: "Temps de réaction simple et capacité à rester précis et concentré sous la pression du temps.",
    method: [
      "Adopte une posture d'alerte détendue : ni crispé sur le bouton, ni relâché au point de te déconcentrer.",
      "Garde le regard fixé au centre de la zone où la cible peut apparaître plutôt que de balayer les bords.",
      "N'anticipe jamais le clic avant que la cible soit réellement visible : un faux départ pénalise davantage qu'une réaction un peu lente.",
    ],
    techniques: [
      "Entraîne-toi en courtes sessions répétées : la fatigue dégrade très vite le temps de réaction, mieux vaut plusieurs sessions courtes qu'une seule longue.",
      "Respire calmement entre deux essais pour rester réactif sans monter en tension.",
      "Concentre-toi sur un seul objectif à la fois (cliquer vite) plutôt que d'essayer de deviner quand la cible va apparaître.",
    ],
    pitfalls: [
      "Cliquer par anticipation avant l'apparition réelle de la cible (faux départ).",
      "Se crisper après un mauvais essai, ce qui dégrade les temps de réaction suivants.",
    ],
  },
};
