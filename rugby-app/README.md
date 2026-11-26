# 🏉 Rugby Face-à-Face

Web app responsive (React + TypeScript + Vite) pour consulter les résultats des matchs de rugby
entre grandes nations et comparer les bilans historiques d'une équipe contre une autre.

## Fonctionnalités

- **Face-à-face** : choisissez deux équipes → bilan V/N/D, points, moyenne, forme sur les 10 derniers
  matchs, série en cours, bilan selon le lieu (domicile / extérieur / neutre), bilan en Coupe du monde,
  records (plus larges victoires, match le plus prolifique, plus longues séries), victoires par
  décennie et courbe « qui mène la série ? », liste complète des matchs.
- **Résultats** : tous les matchs, filtrables par équipe, adversaire, compétition/lieu, années et
  Coupe du monde.
- **Bilans** : classement au % de victoires (depuis 1871, ère pro, depuis 2010), bilan d'une équipe
  contre chaque adversaire, matrice de tous les face-à-face.
- **Ajouter un résultat** : enregistre un match récent dans le navigateur (localStorage) ; il est pris
  en compte dans toutes les statistiques.
- L'état est dans l'URL (`#/face-a-face?a=France&b=New+Zealand`) : chaque vue se partage.
- Thème clair / sombre automatique, mise en page mobile.

## Données

`public/data/rugby_results.csv` — 2 727 matchs officiels entre l'Afrique du Sud, l'Angleterre,
l'Argentine, l'Australie, l'Écosse, la France, l'Irlande, l'Italie, la Nouvelle-Zélande et le pays
de Galles, de 1871 au **15 juillet 2023**. Source : [Ad882/Rugby-match-analysis](https://github.com/Ad882/Rugby-match-analysis)
(licence MIT, © 2023 Adrien M.). Pour mettre à jour, ajoutez des lignes au CSV au même format.

## Développement

```bash
npm install
npm run dev      # serveur de dev
npm test         # tests des calculs statistiques
npm run build    # build statique dans dist/ (déployable sur n'importe quel hébergement statique)
```
