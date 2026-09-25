# ORBYTE — thème Shopify « centre de contrôle »

Site **d'information** sur le Système solaire, avec une interface futuriste : champ d'étoiles, planètes en 3D dessinées en direct, carte orbitale interactive et écrans de télémétrie.
C'est un **projet fictif** : ORBYTE n'est affilié à aucune agence spatiale. Les données viennent de la fiche planétaire de la NASA (NSSDCA Planetary Fact Sheet).

Il n'y a **ni prix, ni panier, ni vente**.

## Pages

| Page | Contenu |
|---|---|
| Accueil | Hero avec planète 3D et réticule de visée, bande de données en défilement, catalogue des 9 mondes, carte animée du Système solaire, échelle des tailles, chiffres clés, journal de bord, FAQ, inscription aux « transmissions » |
| Fiche planète (`/pages/planetes/<nom>`) | Planète 3D, télémétrie (8 mesures avec jauges et comparaison à la Terre), simulateur de poids, temps de trajet de la lumière, orbite comparée, dossier, fait marquant, planète précédente/suivante |
| Journal de bord | Articles du blog `journal` |
| Autres | Recherche (planètes + articles), contact, accessibilité, 404 « Signal perdu », mot de passe |

## Le contenu vient de Shopify

- **Planètes** : métaobjets de type `planete` (Contenu → Métaobjets). Chaque entrée publiée obtient sa propre page, et le thème lit tous les champs : nom, catégorie, rendu 3D, couleurs, diamètre, masse, gravité, jour, année, distance, température, lunes, anneaux, résumé, dossier, fait marquant…
- **Journal de bord** : le blog `journal` (Boutique en ligne → Articles de blog).

Pour ajouter un monde (une lune, une exoplanète…), il suffit de créer une nouvelle entrée « Planète » : la page, la carte orbitale, le catalogue et la bande de données se mettent à jour automatiquement.

## Installation

1. Boutique en ligne → Thèmes → **Ajouter un thème → Connecter depuis GitHub** → dépôt `siteclaude`, branche **`orbyte`**.
2. Menu principal (Boutique en ligne → Navigation) : par exemple Planètes (`/#catalogue`), Système solaire (`/#systeme`), Journal de bord (`/blogs/journal`), À propos.
3. Créer les pages Contact (modèle `page.contact`) et Accessibilité (modèle `page.accessibility`), puis les choisir dans *Personnaliser → Pied de page*.

## Accessibilité

- Conforme à l'objectif WCAG 2.1 AA : contrastes vérifiés (7:1 minimum pour le texte secondaire) et focus visible.
- Chaque planète 3D a un texte alternatif, et toutes les données existent aussi en texte.
- Bouton **« Tout mettre en pause »** et boutons pause pour la bande de données et les orbites (WCAG 2.2.2). Le réglage système « réduire les animations » est respecté.
- Aucun script tiers ni police Google.
