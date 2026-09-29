# Mon espace équin

Application web (PWA) de suivi de chevaux : rendez-vous, finances, planning d'activités et fiche.
HTML/CSS/JavaScript purs (modules ES, sans étape de build) + Firebase gratuit (Auth e-mail et Realtime Database).

## Structure

```
index.html              structure de l'application
css/                    tokens, thème (cuir/cognac), base, composants, mise en page, vues
js/core/                utilitaires, dates, validation, schéma des données, store local
js/services/            Firebase (auth + synchronisation fine), stockage local
js/features/            export calendrier .ics (iPhone)
js/ui/                  icônes, toasts, fenêtres, thème, statut, graphiques
js/views/               accueil, finances, planning, fiche
database.rules.json     règles Realtime Database (chaque compte ne voit que ses données)
```

## Données

- Local : `localStorage`, clés `mon_espace_equin_v1_*` (compatibles avec l'ancienne version).
- Cloud : `users/<uid>/app`, écritures clé par clé ; les modifications faites hors ligne sont renvoyées à la reconnexion.
- Mode hors ligne disponible si Firebase est injoignable.

## Test local

```
python3 -m http.server 8000
```
puis ouvrir http://localhost:8000.

## Déploiement

Un push sur `main` déploie automatiquement sur Firebase Hosting (`.github/workflows/firebase-hosting.yml`).
