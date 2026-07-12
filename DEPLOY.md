# Déployer PSY0 Trainer sur un VPS Hostinger

## 1. Se connecter au VPS en SSH

Depuis ton Mac :
```
ssh root@TON_IP_VPS
```
(identifiants dans hPanel → VPS → vue d'ensemble)

## 2. Installer Node.js (si pas déjà présent)

```
node -v
```
S'il n'existe pas ou est trop vieux (< 18) :
```
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt-get install -y nodejs
```

## 3. Envoyer les fichiers du projet

Depuis ton Mac (pas depuis le VPS), à la racine de `psy0-trainer/` :
```
rsync -avz --exclude node_modules --exclude data \
  "/Users/maximelecru/Documents/Claude Code/psy0-trainer/" \
  root@TON_IP_VPS:/var/www/psy0-trainer/
```
(`node_modules` et `data/` ne doivent jamais être copiés depuis ton Mac — `node_modules` sera réinstallé sur le serveur, et `data/` contient les comptes/mots de passe, tu ne veux pas les écraser à chaque déploiement.)

## 4. Installer les dépendances sur le VPS

```
cd /var/www/psy0-trainer
npm install --production
```

## 5. Garder le serveur actif en permanence (pm2)

```
sudo npm install -g pm2
pm2 start server.js --name psy0-trainer
pm2 save
pm2 startup   # suit les instructions affichées pour démarrer au boot du VPS
```

Commandes utiles ensuite :
- `pm2 logs psy0-trainer` — voir les logs
- `pm2 restart psy0-trainer` — redémarrer après une mise à jour
- `pm2 status` — vérifier que ça tourne

## 6. Exposer le site sur ton domaine (nginx + HTTPS)

```
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

Crée `/etc/nginx/sites-available/psy0-trainer` :
```nginx
server {
    listen 80;
    server_name tondomaine.com;

    location / {
        proxy_pass http://127.0.0.1:4173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
Puis :
```
sudo ln -s /etc/nginx/sites-available/psy0-trainer /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d tondomaine.com
```
Certbot configure le HTTPS et renouvelle automatiquement le certificat.

## 7. Firewall

```
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```
Le port 4173 (Node) n'a pas besoin d'être ouvert publiquement — seul nginx (80/443) doit l'être, il fait relais vers Node en interne.

## 8. Vérifier

Va sur `https://tondomaine.com`, crée un compte de test, fais une session d'entraînement, vérifie que `data/states/<uuid>.json` se crée bien sur le serveur :
```
ls /var/www/psy0-trainer/data/states/
```

## Mettre à jour le site plus tard

Depuis ton Mac, après avoir modifié le code ici :
```
rsync -avz --exclude node_modules --exclude data \
  "/Users/maximelecru/Documents/Claude Code/psy0-trainer/" \
  root@TON_IP_VPS:/var/www/psy0-trainer/
ssh root@TON_IP_VPS "cd /var/www/psy0-trainer && npm install --production && pm2 restart psy0-trainer"
```

## Limites à connaître

Ce backend est volontairement simple (adapté à un usage personnel / petit nombre de comptes) :
- Stockage par fichiers JSON, pas de vraie base de données — largement suffisant à cette échelle, mais ne scale pas à des milliers d'utilisateurs.
- Pas de récupération de mot de passe oublié, pas de vérification d'email, pas de limitation anti-bruteforce sur `/api/login`.
- Le secret JWT est généré et stocké automatiquement dans `data/.jwt_secret` au premier lancement — ne supprime jamais ce fichier une fois en prod (ça déconnecterait tous les comptes), et ne le copie jamais publiquement.
