# Espace scolaire (inspiré de PRONOTE) – Vercel + Blob + /admin

Site web avec comptes élèves / profs : emploi du temps, cahier de textes (devoirs), notes avec moyennes,
absences et justifications, messagerie, actualités, forum, support. Le panel `/admin` gère tout le reste.
Ce n'est PAS connecté au vrai PRONOTE : toutes les données sont les tiennes, dans Vercel Blob.

## Déploiement
1. Pousse ce dossier sur GitHub, puis « Add New Project » sur vercel.com.
2. Dans le projet : **Storage → Create → Blob**, connecte-le au projet (`BLOB_READ_WRITE_TOKEN` s'ajoute seul).
3. **Settings → Environment Variables** : `ADMIN_PASSWORD` et `ADMIN_SECRET` (longue chaîne aléatoire). Ne change plus `ADMIN_SECRET` ensuite : elle sert aussi à retrouver les fichiers de données.
4. Redéploie. Élèves/profs : `/login`. Admin : `/admin` → onglet **Démo** pour créer `eleve` / `prof` (mot de passe `demo1234`).

## Rôles
- **Élève** : voit SON emploi du temps (selon sa classe), ses devoirs (coche « fait »), ses notes, ses absences (peut les justifier), écrit aux profs.
- **Professeur** : donne des devoirs, met des notes, signale absences/retards, valide les justifications, écrit à tout le monde.
- **Admin** (`/admin`) : comptes, emploi du temps, actualités, annonces (bêta, maintenance…), support, modération du forum, mode maintenance.

## Limites à connaître
- Blobs en accès public, mais le chemin est dérivé d'un HMAC secret (non devinable). Les mots de passe sont hachés (scrypt). Pour de vraies données d'élèves, passe plutôt sur une base (Postgres) et vérifie le RGPD.
- Pas de limite de tentatives de connexion ni de verrou d'écriture : adapté à un petit site.
