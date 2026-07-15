# Déployer PsyZero sur Hostinger (app Node.js + MySQL)

Ton hébergement Hostinger (plan Business) a une fonctionnalité **Node.js App** qui se connecte directement à GitHub et redéploie automatiquement à chaque push — pas de VPS, pas de SSH, pas de nginx/pm2 à gérer à la main. C'est le même système que celui déjà utilisé pour `panasse.club`.

Le stockage (comptes + progression) utilise une vraie base **MySQL** plutôt que des fichiers, parce que le dossier de l'appli est reconstruit à neuf à chaque déploiement Git — des fichiers JSON locaux seraient effacés à chaque mise à jour du code. En local (sur ton Mac), sans base configurée, l'appli continue d'utiliser des fichiers JSON automatiquement — aucune installation MySQL locale n'est nécessaire pour développer.

## 1. Créer la base de données MySQL

Dans hPanel → ton site → **Bases de données → Gestion** :
1. Choisis un nom de base et un nom d'utilisateur (ou laisse les valeurs proposées, du type `u421821389_xxx`).
2. Définis un mot de passe fort, clique sur **Créer**.
3. Note ces 4 informations, elles serviront de variables d'environnement :
   - Hôte (souvent `localhost` pour une base sur le même compte — vérifie la valeur exacte affichée après création)
   - Nom de la base
   - Nom d'utilisateur
   - Mot de passe

## 2. Créer l'application Node.js reliée à GitHub

Dans hPanel → **Sites web** → ton plan Business → **Ajouter un site web** (ou l'équivalent "Créer une application Node.js") :
1. Connecte le compte GitHub s'il ne l'est pas déjà (bouton "Connecté avec GitHub" visible sur le tableau de bord de panasse.club — probablement déjà lié).
2. Choisis le dépôt `MaxPanasse/aeropsy`, branche `main`.
3. Framework : **Express**. Fichier/point d'entrée : `server.js`. Répertoire racine : `./`.
4. Version Node : la plus récente proposée (22.x).
5. Active le **déploiement automatique** (comme sur panasse.club) pour que chaque `git push` redéploie tout seul.

## 3. Configurer les variables d'environnement

Dans la section **Variables d'environnement** de l'application, ajoute :

| Variable | Valeur |
|---|---|
| `DB_HOST` | l'hôte noté à l'étape 1 |
| `DB_USER` | l'utilisateur MySQL noté à l'étape 1 |
| `DB_PASSWORD` | le mot de passe MySQL noté à l'étape 1 |
| `DB_NAME` | le nom de la base noté à l'étape 1 |
| `JWT_SECRET` | une longue chaîne aléatoire (génère-la avec `openssl rand -hex 48` dans un terminal, ou demande-moi de la générer) |

**Important** : `JWT_SECRET` est obligatoire dès que `DB_HOST` est défini — le serveur refuse de démarrer sans lui plutôt que d'improviser un secret non fiable. Garde une copie de cette valeur en lieu sûr : la changer déconnecterait tous les comptes existants.

## 4. Déployer

Clique sur **"Redéployer"** (ou attends le déploiement automatique après le prochain `git push`). Le journal de déploiement doit afficher l'installation des dépendances (`npm install`, qui inclut `mysql2`) puis le démarrage réussi.

## 5. Vérifier

1. Va sur ton domaine, crée un compte de test.
2. Dans hPanel → **Bases de données → phpMyAdmin**, ouvre ta base : une table `users` doit contenir la ligne de ce compte, et une table `states` doit apparaître après une première session d'entraînement.
3. Repousse un commit anodin (ou clique "Redéployer") et vérifie que le compte de test existe toujours après — c'est la preuve que les données survivent bien aux redéploiements.

## Mettre à jour le site plus tard

Depuis ton Mac :
```
git add -A
git commit -m "Description du changement"
git push
```
Si le déploiement automatique est activé, c'est tout — Hostinger redéploie tout seul en quelques dizaines de secondes. Sinon, reclique sur "Redéployer" dans hPanel.

## Limites à connaître

- Pas de récupération de mot de passe oublié, pas de vérification d'email, pas de limitation anti-bruteforce sur `/api/login` — acceptable à petite échelle, à muscler avant une grosse audience.
- `JWT_SECRET` doit être configuré manuellement en production (volontaire — voir étape 3) ; en local sans base MySQL configurée, un secret est généré et stocké automatiquement dans `data/.jwt_secret` pour le confort du développement.
