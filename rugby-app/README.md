# 🏉 Rugby Face-à-Face

Web app responsive (React + TypeScript + Vite) pour consulter les résultats des matchs de rugby
entre les nations de la Coupe du monde et comparer les bilans historiques d'une équipe contre une autre.

## Fonctionnalités

- **Face-à-face** : choisissez deux équipes → bilan V/N/D, points, moyenne, forme sur les 10 derniers
  matchs, série en cours, bilan selon le lieu (domicile / extérieur / neutre), bilan en Coupe du monde,
  records (plus larges victoires, match le plus prolifique, plus longues séries), victoires par
  décennie et courbe « qui mène la série ? », liste complète des matchs.
- **Résultats** : tous les matchs, filtrables par équipe, adversaire, compétition/lieu, années et
  Coupe du monde.
- **Bilans** : classement au % de victoires par groupe (Six Nations + Rugby Championship, qualifiés 2027,
  toutes) et par période (depuis 1871, ère pro, depuis 2010), bilan d'une équipe
  contre chaque adversaire, matrice de tous les face-à-face.
- **Ajouter un résultat** : enregistre un match récent dans le navigateur (localStorage) ; il est pris
  en compte dans toutes les statistiques.
- L'état est dans l'URL (`#/face-a-face?a=France&b=New+Zealand`) : chaque vue se partage.
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

Mise à jour des données : `python3 scripts/update_data.py` (re-télécharge l'archive et régénère le CSV).

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
