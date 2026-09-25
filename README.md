# Squizio Mist — thème Shopify

Thème Shopify 2.0 sur mesure pour **squizio** (diffuseurs d'arômes). Les produits, prix, stocks et avis viennent **en direct de la boutique Shopify** : rien n'est codé en dur.

## Ce qu'il contient

| Page | Contenu |
|---|---|
| Accueil | Hero animé (brume, titre mot à mot, visuel qui s'incline à la souris), texte défilant, collection en « bento », grand texte, produit à la une avec parallaxe, avantages, avis clients, FAQ, newsletter |
| Fiche produit | Galerie + zoom plein écran, variantes, quantité, ajout au panier sans recharger, paiement express, stock réel, onglets (description, livraison, rétractation, sécurité produit), barre d'achat collante, avis, produits similaires |
| Panier | Tiroir latéral animé + page panier, barre « livraison offerte » (facultative) |
| Autres | Collection (filtres + tri), recherche prédictive, contact, **Se rétracter**, **Déclaration d'accessibilité**, blog, 404, mot de passe, carte cadeau |

Tout est modifiable dans **Boutique en ligne → Thèmes → Personnaliser**.

## Installation (5 minutes)

1. Shopify admin → **Boutique en ligne → Thèmes**.
2. **Ajouter un thème → Connecter depuis GitHub** → autorise GitHub → choisis `galaldylan-netizen/siteclaude`, branche `main`.
3. Le thème arrive dans la bibliothèque. Clique **Personnaliser** pour le vérifier, puis **Publier** quand tout est prêt.
4. Crée les pages ci-dessous (Boutique en ligne → Pages), puis choisis-les dans *Personnaliser → Pied de page*.

| Page à créer | Modèle à choisir |
|---|---|
| Se rétracter | `page.withdrawal` |
| Accessibilité | `page.accessibility` |
| Contact | `page.contact` |

## Conformité — ce que le thème fait, ce que TU dois faire

Le thème fournit les outils. Certaines obligations dépendent de réglages ou d'informations que toi seul peux fournir.

### Accessibilité (WCAG 2.1 AA / Acte européen sur l'accessibilité)
Fait par le thème : navigation au clavier, lien « Aller au contenu », focus visible, lecteurs d'écran (titres, textes alternatifs, libellés, annonces du panier), contrastes ≥ 4,5:1 vérifiés, animations désactivables + respect du réglage système, cibles tactiles ≥ 44 px, zoom 200 %, mode contraste élevé.
À faire :
- [ ] Remplir le **texte alternatif** de chaque image produit (Produits → image → « Ajouter un texte alternatif »).
- [ ] Publier la page **Accessibilité**.
- [ ] Ne pas installer de « widget d'accessibilité » (overlay) : ils ne rendent pas un site conforme et gênent souvent les lecteurs d'écran.

### Droit de rétractation (UE, 14 jours + bouton en ligne depuis le 19.06.2026)
Fait : page « Se rétracter » avec le bouton **« Se rétracter du contrat ici »**, puis **« Confirmer la rétractation »**, et le formulaire type.
À faire :
- [ ] Créer la page avec le modèle `page.withdrawal` et la lier dans le pied de page.
- [ ] **Envoyer un accusé de réception par e-mail** au client pour chaque demande (obligation légale). Le formulaire t'envoie la demande, mais il n'envoie pas l'e-mail au client automatiquement. Tu peux aussi activer les retours en libre-service Shopify ou utiliser une app de retours.
- [ ] Paramètres → Politiques : rédiger la **politique de remboursement** (14 jours, qui paie le retour, délai de remboursement ≤ 14 jours).

### Prix (directive Omnibus UE, ordonnance suisse sur l'indication des prix OIP)
Fait : prix TTC, mention « TVA incluse », frais de livraison indiqués, prix barré seulement si « Prix avant réduction » est rempli.
À faire, pour chaque promotion vers l'UE :
- [ ] Renseigner le métachamp produit **`custom.lowest_price_30d`** (type *Argent*) : c'est le prix le plus bas des 30 jours avant la promo.

### Sécurité des produits (règlement GPSR, obligatoire pour vendre dans l'UE)
Pour des diffuseurs électriques en dropshipping, c'est le point le plus important.
À faire (Paramètres → Données personnalisées → Produits → ajouter les définitions) :
- [ ] `custom.gpsr_manufacturer` (texte multiligne) : nom, adresse postale et e-mail du **fabricant**.
- [ ] `custom.gpsr_eu_responsible` (texte multiligne) : **personne responsable dans l'UE**, obligatoire si le fabricant est hors UE.
- [ ] `custom.gpsr_warnings` (texte multiligne) : avertissements et consignes de sécurité.
- [ ] `custom.gpsr_identifier` (texte d'une ligne, facultatif) : modèle, lot…
- [ ] Demander à ton fournisseur les **marquages CE / déclaration de conformité**. Pour la Suisse, garder aussi la documentation de sécurité.

### Avis clients (UE Omnibus + LCD suisse)
Fait : aucun faux avis. La note n'apparaît que si de vrais avis existent. Un texte « Comment les avis sont vérifiés » est affiché.
À faire :
- [ ] Installer une app d'avis (ex. Judge.me ou Shopify Product Reviews), puis ajouter son bloc dans *Fiche produit → Avis produit*.
- [ ] Adapter le texte « Comment les avis sont vérifiés » (Paramètres du thème → Avis clients) pour qu'il décrive **ta vraie méthode**.

### Données personnelles (RGPD / nLPD suisse)
Fait : aucun traceur, aucune police Google, aucun script tiers dans le thème. Bouton « Préférences cookies » dans le pied de page (s'affiche quand la bannière Shopify est active).
À faire :
- [ ] Paramètres → **Confidentialité des clients** → activer la **bannière de cookies** (régions UE/EEE, Royaume-Uni, Suisse).
- [ ] Paramètres → Politiques : **politique de confidentialité** (générateur Shopify, puis relecture).
- [ ] Marketing par e-mail : activer le **double opt-in** (réglage proposé dans les paramètres de marketing par e-mail / notifications clients de Shopify).

### Mentions obligatoires (LCD art. 3 al. 1 let. s en Suisse, directive e-commerce dans l'UE)
- [ ] Paramètres → Politiques : **Coordonnées** et **Mentions légales** avec nom ou raison sociale, **adresse postale**, e-mail et, si applicable, n° IDE/TVA.
- [ ] Remplir « Raison sociale / n° IDE » dans *Personnaliser → Pied de page*.
- [ ] Rédiger les **CGV**.

> Ce guide résume les obligations principales, mais ce n'est pas un avis juridique. Pour les CGV et les mentions légales, fais relire tes textes par un professionnel, surtout si tu vends dans plusieurs pays de l'UE.

## Métachamps utilisés

| Métachamp | Rôle |
|---|---|
| `reviews.rating`, `reviews.rating_count` | Note moyenne (remplis automatiquement par les apps d'avis) |
| `custom.lowest_price_30d` | Prix le plus bas des 30 derniers jours (Omnibus) |
| `custom.gpsr_manufacturer`, `custom.gpsr_eu_responsible`, `custom.gpsr_warnings`, `custom.gpsr_identifier` | Sécurité produit (GPSR) |

## Structure

```
layout/     theme.liquid, password.liquid
sections/   header, footer, hero, marquee, featured-collection, spotlight, benefits,
            testimonials, faq, newsletter, rich-text, main-product, product-reviews,
            related-products, cart-drawer, main-*, header-group.json, footer-group.json
snippets/   product-card, price, rating, gpsr-info, cart-items, cart-summary, icon, …
templates/  index, product, collection, cart, search, page(.contact/.withdrawal/.accessibility), …
assets/     base.css, theme.js (aucune dépendance externe)
locales/    fr.default.json
```
