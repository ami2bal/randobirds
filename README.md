# Rando Birds 🏔️🥾

Sondage simple pour les dates de rando au Château d'Oche.

## Le problème initial

Les votes étaient stockés **uniquement dans le localStorage du navigateur**.

→ Chaque participant voyait **uniquement ses propres votes**.
→ Pas de persistance partagée entre les membres de l'équipe.
→ Si tu changes de téléphone/navigateur ou vide le cache → votes perdus.

## Solution : stockage persistant partagé SANS base de données

On utilise **Firebase Realtime Database** (plan gratuit "Spark") :

- Pas de serveur à lancer
- Pas de DB à installer / gérer (Postgres, SQLite, etc.)
- Gratuit pour ce volume (quelques dizaines de votes max)
- API REST simple en JSON pur → parfait pour un site statique
- Fiable et rapide

Les votes sont maintenant **partagés en temps réel** (avec un petit rafraîchissement) entre tous ceux qui ont la page ouverte.

## Comment activer le stockage persistant (5-7 minutes max) - Instructions détaillées

**Statut actuel :** L'URL Firebase est déjà renseignée dans `script.js` (`randobirds-oche`).

**Important avant de commencer :**
- Tu n'as **pas besoin** de me fournir ton compte, mot de passe, ou une clé secrète.
- La seule chose que tu mettras dans le code est une **URL publique** (type `https://.../votes.json`). Cette URL sera de toute façon visible par n'importe qui qui inspecte le JavaScript une fois le site déployé.
- Tu n'as besoin que d'un compte Google gratuit.

**Action critique restante :** Tu dois encore mettre les règles de sécurité (étape 5 ci-dessous), sinon rien ne marchera.

### Étapes précises :

1. **Va sur la console Firebase**
   - Ouvre ce lien : [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Connecte-toi avec ton compte Google (ou crée-en un gratuit si tu n'en as pas).

2. **Crée un nouveau projet**
   - Clique sur **"Créer un projet"** (ou "Add project" en anglais).
   - Nom du projet : `randobirds-oche` (ou ce que tu veux).
   - Clique sur **Continuer**.
   - Pour Google Analytics : **désactive** l'option (pas nécessaire pour ce petit sondage).
   - Clique sur **Créer le projet** et attends 10-20 secondes que ce soit prêt.

3. **Ouvre Realtime Database**
   - Une fois dans ton projet, regarde le menu à gauche.
   - Clique sur **Build** (ou "Développement" selon la langue).
   - Puis clique sur **Realtime Database**.
   - Clique sur le gros bouton **"Créer une base de données"**.

4. **Configure la base de données**
   - **Emplacement de la base** : choisis **europe-west1** (c'est en Belgique, plus rapide pour la France).
   - Clique **Suivant**.
   - **Mode de sécurité** : choisis **"Commencer en mode test"** (le plus simple pour l'instant).
   - Clique **Activer**.

5. **Règles de sécurité (très important)**
   - Tu arrives sur l'onglet **"Données"**.
   - Clique sur l'onglet **"Règles"** juste à côté.
   - Remplace tout le contenu par ceci :

     ```json
     {
       "rules": {
         "votes": {
           ".read": true,
           ".write": true
         }
       }
     }
     ```

   - Clique sur **Publier** (en haut à droite).

   > Ces règles disent : "Tout le monde peut lire et écrire uniquement dans le nœud `votes`". C'est suffisant et voulu pour un sondage d'équipe.

6. **Récupère l'URL de la base**
   - Retourne sur l'onglet **"Données"**.
   - En haut, tu verras une URL qui ressemble à ça :
     ```
     https://randobirds-oche-default-rtdb.europe-west1.firebasedatabase.app/
     ```
   - **L'URL qu'il faut utiliser** est celle-ci **avec `/votes.json` à la fin** :
     ```
     https://randobirds-oche-default-rtdb.europe-west1.firebasedatabase.app/votes.json
     ```

     (Copie-la précisément, c'est cette ligne complète qu'on va coller.)

7. **L'URL est déjà configurée**
   - Dans `script.js`, la constante est déjà mise à jour avec ton URL :

     ```js
     const REMOTE_VOTES_URL = 'https://randobirds-oche-default-rtdb.europe-west1.firebasedatabase.app/votes.json';
     ```

   - Vérifie simplement que c'est bien cette valeur, puis sauvegarde.

8. **Déploie le site mis à jour**
   - Si tu utilises GitHub Pages, Netlify, Vercel, etc. : commit + push.
   - Si tu ouvres juste le fichier `index.html` en local : ça marchera aussi (mais pour que les autres membres de l'équipe puissent voter, il faut que le site soit accessible en ligne).

C'est terminé ! Le premier vote qui sera fait créera automatiquement le tableau de votes dans Firebase.

### Comment tester rapidement
1. Ouvre le site dans un navigateur normal et vote pour 1-2 dates.
2. Ouvre le site dans une **fenêtre navigation privée** (ou un autre navigateur/téléphone).
3. Rafraîchis la page → tu devrais voir les votes apparaître.
4. Vote depuis la 2e fenêtre → rafraîchis la première → les votes se mettent à jour.

### Comment revenir en mode "localStorage seulement" (désactiver le partage)
Ouvre `script.js` et remets simplement :

```js
const REMOTE_VOTES_URL = '';
```

Puis redéploie. Tout redevient comme avant (chaque personne voit seulement ses votes).

## Comment revenir en local-only (désactiver)

Laisse simplement `const REMOTE_VOTES_URL = '';` (vide).

Le site redevient 100% localStorage comme avant.

## Détails techniques

- Au chargement : on récupère les votes distants (avec fallback localStorage en cas de problème).
- Au vote : on fait un "read-modify-write" pour éviter d'écraser les votes des autres (sécurisé pour un petit groupe).
- Les suppressions et "tout effacer" mettent aussi à jour le stockage distant.
- Un petit polling (toutes les ~20s) met à jour les résultats si quelqu'un d'autre a voté.
- Export JSON reste disponible pour backup.

## Alternative (si tu ne veux pas Firebase)

On peut utiliser un service "JSON storage" pur comme :
- [JSONBin.io](https://jsonbin.io/) (il faut créer un compte + une Access Key limitée)
- [getpantry.cloud](https://getpantry.cloud/)

Le code est prêt à être adapté (il suffit de changer la couche de fetch). Dis-moi si tu préfères.

## Notes

- Les données du sondage (pseudos + avatars + dates) sont visibles par quiconque a l'URL du site. C'est voulu pour un sondage d'équipe interne.
- Pour un usage plus "protégé", on pourrait ajouter une passphrase ou passer sur Supabase/Firebase Auth, mais c'est overkill ici.

Bon rando ! 🥾🏔️
