# 🏉 RugbyNation

Web app responsive (React + TypeScript + Vite), **interface en anglais**, pour consulter les résultats des matchs de rugby
entre les nations de la Coupe du monde et comparer les bilans historiques d'une équipe contre une autre.

## Fonctionnalités

- **Face-à-face** : choisissez deux équipes → bilan V/N/D, points, moyenne, forme sur les 10 derniers
  matchs, série en cours, bilan selon le lieu (domicile / extérieur / neutre), bilan en Coupe du monde,
  records (plus larges victoires, match le plus prolifique, plus longues séries), victoires par
  décennie et courbe « qui mène la série ? », liste complète des matchs.
- **Compétitions** : Coupe du monde (podium, phase finale, poules), Tournoi des Six Nations (et Tournoi
  britannique / Cinq Nations), Tri-Nations / Rugby Championship, Pacific Nations Cup, Championnat d'Europe,
  Nations Championship, tests d'automne et qualifications : classement calculé et résultats de chaque édition.
  Certaines éditions sont **reconstituées** (règles commentées dans `src/competitions.ts`) car la source ne nomme
  pas leurs matchs (Cinq Nations 1952–1999, Tri-Nations 1996–1999, Rugby Championship 2021 et 2023) ; d'autres
  sont signalées **incomplètes** quand des matchs contre des nations hors de l'app manquent
  (`public/data/competitions.json`, généré par le script de mise à jour).
- **Résultats** : tous les matchs, filtrables par équipe, adversaire, compétition/lieu, années et
  Coupe du monde.
- **Période** (sous le titre des pages Head-to-head et Rankings) : depuis 1871, ère pro (1995+) ou depuis 2010. Elle
  s'applique aux pages Head-to-head et Rankings (les pages Competitions et Results montrent toujours
  tous les matchs) et reste dans l'URL (`&period=pro`).
- **Bilans** : classement au % de victoires par groupe (Six Nations + Rugby Championship, qualifiés 2027,
  toutes), bilan d'une équipe
  contre chaque adversaire, matrice de tous les face-à-face.
- **Ajouter un résultat** : enregistre un match récent dans le navigateur (localStorage) ; il est pris
  en compte dans toutes les statistiques.
- Les anciens liens en français (`#/face-a-face`, `#/resultats`, `#/bilans`, `equipe=`, `periode=`…) restent valides.
- L'état est dans l'URL (`#/head-to-head?a=France&b=New+Zealand`) : chaque vue se partage.
- Thème clair / sombre automatique, mise en page mobile.

## Données

`public/data/rugby_results.csv` : **5 096 test-matchs** entre les **27 nations** qui ont disputé au moins
une Coupe du monde (1987–2023) ou sont qualifiées pour celle de 2027 (Hong Kong Chine), de 1871 au
**21 novembre 2026** : Afrique du Sud, Angleterre, Argentine, Australie, Canada, Chili, Côte d'Ivoire,
Écosse, Espagne, États-Unis, Fidji, France, Géorgie, Hong Kong Chine, Irlande, Italie, Japon, Namibie,
Nouvelle-Zélande, pays de Galles, Portugal, Roumanie, Russie, Samoa, Tonga, Uruguay, Zimbabwe.

Seuls les matchs entre deux de ces nations sont gardés (les matchs contre d'autres pays, sélections
régionales ou XV « B » sont exclus), ainsi que les matchs abandonnés ou attribués sur tapis vert.

Source : [Nuck's Rugby Archive](https://rugbyarchive.github.io/) ([dépôt](https://github.com/rugbyarchive/rugbyarchive.github.io)).
⚠️ Cette archive ne publie pas de licence : demander l'accord de son auteur avant toute diffusion publique.

Mise à jour des données : **automatique chaque lundi soir** (19 h 17 UTC, soit 20 h 17 / 21 h 17 à Paris)
via `.github/workflows/update-rugby-data.yml` : re-télécharge l'archive, régénère le CSV, lance les tests
et, s'il y a de nouveaux matchs, commite sur `main` et redéploie le site. Lancement manuel possible via
*Actions → Weekly rugby data update → Run workflow*, ou en local : `python3 scripts/update_data.py`.
La mise à jour est refusée si l'archive renvoie nettement moins de matchs qu'avant (source cassée).

## Mise en ligne (GitHub Pages)

Le workflow `.github/workflows/deploy-rugby-app.yml` teste, construit et publie l'app à chaque push
sur `main` touchant `rugby-app/` (ou manuellement via *Actions → Run workflow*).
Réglage unique : *Settings → Pages → Build and deployment → Source : GitHub Actions*.
Adresse : https://stmarceau.github.io/Paris_real_estate/

## Développement

```bash
npm install
npm run dev      # serveur de dev
npm test         # tests des calculs statistiques
npm run build    # build statique dans dist/ (déployable sur n'importe quel hébergement statique)
```
