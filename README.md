# Relais

> Application de suivi de pièces, de relais entre établis et de pointage du temps
> pour atelier horloger. Ce dépôt part d'une maquette React (en mémoire) que
> l'on transforme en application **multi-postes, persistante et fiable**.

`tymios` — gestion de tâches / suivi d'atelier.

Ce README sert de **document de référence** pour passer du prototype à la v1
réelle. Il est destiné au développeur qui réalisera la v1. Le prototype actuel
reste la meilleure spécification fonctionnelle et visuelle ; ce document fixe les
fondations.

---

## 1. Objectif de la v1

Transformer la maquette en application multi-postes, persistante et fiable,
utilisable au quotidien dans un atelier horloger de 5 à 15 personnes.

La v1 doit faire **trois choses irréprochablement** (le reste vient après) :

1. **Suivre une pièce** qui passe de main en main entre établis, avec
   acceptation du relais.
2. **Tracer** tout le parcours d'une pièce de façon fiable (registre).
3. **Pointer le temps** par opération, sans trou avant chaque relais.

Tout le reste (statistiques, pilotage avancé, signatures, QR) est explicitement
**hors périmètre v1** — on y reviendra une fois les fondations solides.

---

## 2. Principe directeur : le registre est sacré

C'est la décision d'architecture la plus importante, parce qu'elle découle
directement du concept.

**On n'efface jamais l'historique. On ajoute des écritures correctives.**

Concrètement : un relais, un pointage, une correction = un **événement** ajouté à
un journal. On ne modifie pas une ligne passée, on en écrit une nouvelle qui la
corrige. C'est ce qui rend la traçabilité opposable (SAV, garantie, assurance) et
ce qui distingue Relais d'un simple Kanban.

Conséquence technique : le cœur de la donnée n'est pas « l'état actuel d'une
pièce » mais **le flux d'événements** qui la concerne. L'état actuel se recalcule
à partir des événements. (C'est exactement la logique `history[]` de la maquette
— on la durcit côté serveur.)

---

## 3. Modèle de données

Six tables suffisent pour la v1.

### `users` (les établis / personnes)
- `id`, nom, prénom, email, rôle, pôle (secteur), code PIN (pour l'acceptation),
  actif (oui/non)

### `poles` (secteurs)
- `id`, libellé, couleur, icône
- Référentiel fixe au départ (Méthodes, Production, Qualité, Appro, Service,
  Sous-traitance), éditable plus tard.

### `ateliers`
- `id`, nom, `pole_id`

### `pieces` (l'objet central — une opération sur une pièce/OF)
- `id`, n° de série, n° OF, désignation article (réf.), titre de l'opération
- `atelier_id`, priorité, échéance
- statut courant (à faire / en cours / bloquée / terminée) — *dérivé, mais stocké
  en cache pour la perf*
- propriétaire courant (`user_id`) — *dérivé du dernier relais accepté*
- sous-traitant + date de retour prévue (si applicable)

### `events` (LE journal — le cœur)
- `id`, `piece_id`, type, auteur (`user_id`), date/heure, payload (JSON)
- Types : `creation`, `envoi_relais`, `acceptation`, `refus`,
  `annulation_envoi`, `changement_statut`, `pointage`, `pointage_manuel`,
  `correction_temps`, `mise_sous_traitance`, `retour_sous_traitance`
- **Insertion seule. Jamais de UPDATE ni DELETE.**

### `time_entries` (optionnel, ou dérivé des events)
- Peut être entièrement reconstruit depuis les events de type pointage. À garder
  dérivé pour rester cohérent avec le principe « registre sacré ».

> **Note OF :** `OF` n'est pas une table à créer en v1 si l'ERP les possède déjà.
> On stocke le numéro d'OF comme référence et on regroupe les pièces par ce
> numéro. Voir §7.

---

## 4. Architecture technique recommandée

Choix optimisés pour : rapidité de développement, temps réel natif, et un seul
prestataire à gérer.

**Recommandation principale : Supabase + Next.js**

- **Base de données** : PostgreSQL (via Supabase). Robuste, relationnel, parfait
  pour un journal d'événements.
- **Temps réel** : Supabase Realtime — quand Cédric envoie un relais, l'écran de
  Yanis se met à jour **sans rafraîchir**. Natif, pas besoin de tout
  reconstruire.
- **Authentification** : Supabase Auth (email + mot de passe, ou lien magique).
  Règle le problème « n'importe qui devient Cédric ».
- **Front** : Next.js (React) — on réutilise le travail d'interface de la
  maquette quasi tel quel.
- **Hébergement** : Vercel (front) + Supabase (données).

**Pourquoi ce choix plutôt qu'un backend sur-mesure :** pas besoin de réinventer
l'authentification, le temps réel et les permissions ; Supabase les fournit. Une
v1 fonctionnelle est livrée **bien plus vite**, et la facture d'infrastructure
reste minime à l'échelle d'un atelier.

**Sécurité des données (important pour le registre) :** PostgreSQL permet de
**bloquer techniquement** les modifications/suppressions sur la table `events`
(politiques RLS en insertion seule). Le « registre sacré » n'est alors pas qu'une
règle de code, c'est garanti par la base elle-même.

---

## 5. Le temps réel, concrètement

Scénario type :

1. Cédric (Qualité) termine son contrôle, pointe son temps, clique « Passer le
   relais → Yanis ».
2. Un événement `envoi_relais` est écrit. La pièce passe « en transit ».
3. **Instantanément**, sans action de Yanis, sa pastille « 📥 à prendre »
   s'incrémente et la pièce apparaît dans son inbox.
4. Yanis clique « Prendre » (avec son PIN). Événement `acceptation`. La
   responsabilité bascule.
5. L'écran de Cédric se met à jour seul : la pièce a quitté son établi.

Tout cela existe déjà visuellement dans la maquette — il « suffit » de brancher
la lecture/écriture sur Supabase Realtime au lieu du `useState` local.

---

## 6. Authentification & responsabilité

- **Connexion réelle** par email + mot de passe (fini le « je clique sur
  Cédric »).
- **PIN court** pour les actions sensibles (acceptation de relais, correction de
  temps) — rapide à saisir à l'établi, mais qui prouve l'identité.
- Chaque événement porte l'auteur **vérifié**. C'est ce qui donne sa valeur
  juridique au registre.

---

## 7. Intégration ERP (à cadrer dès la v1, livrée en v1.1)

Décision structurante : **Relais ne crée pas les OF, il les consomme.**

- Import des OF/pièces depuis l'ERP (fichier CSV/Excel exporté au départ, puis
  connexion directe si l'ERP le permet).
- L'utilisateur, en créant une opération, **choisit** un OF existant dans une
  liste — il ne le ressaisit pas.
- Évite la double-saisie (cause n°1 d'abandon d'un outil) et positionne Relais
  comme **complément** de l'ERP, pas concurrent.

Pour la v1, même un simple import CSV manuel des OF en cours suffit à valider
l'usage.

---

## 8. Périmètre v1 vs plus tard

**Dans la v1 :**
- Comptes + connexion réelle
- Données persistantes (base) + temps réel multi-postes
- Pièces : création, statuts, échéances, priorités, secteurs
- Relais avec acceptation/refus (le cœur)
- Pointage du temps (chrono + saisie manuelle + correction tracée) + règle « pas
  de relais sans temps »
- Journal d'événements immuable
- Fiche de traçabilité PDF par n° de série
- Archive (pièces terminées / OF bouclés) filtrable par secteur
- Recherche (n° série, OF, réf.)

**Volontairement repoussé (v1.1+) :**
- Statistiques et pilotage avancé (camemberts, délais moyens, coût de revient)
- Signatures pour pièces précieuses
- Mode QR / scan établi
- Multi-langue FR/DE/EN
- Relances email automatiques (nécessite un planificateur côté serveur)
- Connexion ERP automatisée (au-delà de l'import CSV)

---

## 9. Plan d'exécution

Chaque étape produit quelque chose de **démontrable** — pas un tunnel de 3 mois
avant de voir un résultat.

| # | Étape | Livrable démontrable | Dépend de |
|---|-------|----------------------|-----------|
| 1 | **Socle** | Base de données + auth + déploiement vide qui tourne | — |
| 2 | **Lecture** | Afficher les pièces réelles depuis la base (remplace le `useState`) | 1 |
| 3 | **Écriture + temps réel** | Créer, changer de statut, voir les changements en direct sur un 2ᵉ écran | 2 |
| 4 | **Le relais** | Envoi → acceptation/refus avec PIN — jalon qui prouve la valeur | 3 |
| 5 | **Pointage** | Chrono, saisie manuelle, correction tracée, règle de blocage du relais | 4 |
| 6 | **Registre & sorties** | Verrouillage RLS de `events`, fiche PDF, archive, recherche | 5 |
| 7 | **Import OF** | Import CSV depuis l'ERP | 2 |

### Détail par étape

1. **Socle** — Initialiser le projet Supabase (Postgres), créer les 6 tables et
   le référentiel `poles`. Brancher Supabase Auth. Déployer un Next.js vide sur
   Vercel relié à Supabase.
2. **Lecture** — Requêtes de lecture `pieces` + vue dérivée de l'état courant.
   Remplacer la donnée en mémoire de la maquette par les données réelles.
3. **Écriture + temps réel** — Écrire des `events` (`creation`,
   `changement_statut`). Recalcul de l'état. Abonnement Supabase Realtime pour la
   mise à jour multi-écrans sans rafraîchir.
4. **Le relais** — `envoi_relais` / `acceptation` / `refus` /
   `annulation_envoi`, contrôle PIN, état « en transit », inbox.
5. **Pointage** — `pointage`, `pointage_manuel`, `correction_temps`. Règle
   métier : pas de `envoi_relais` sans temps pointé sur l'opération.
6. **Registre & sorties** — Politiques RLS insertion-seule sur `events`
   (blocage UPDATE/DELETE en base). Génération de la fiche de traçabilité PDF par
   n° de série. Vue archive filtrable + recherche.
7. **Import OF** — Parsing CSV/Excel exporté de l'ERP, sélection d'un OF existant
   à la création d'une opération.

---

## 10. Décisions à trancher avant de lancer

Trois questions à trancher avec l'atelier :

1. **L'ERP** — lequel est utilisé, et peut-il exporter les OF (CSV/Excel) ou
   exposer une API ? (Détermine le §7.)
2. **Le parc** — les gens pointeront depuis un PC partagé, leur propre poste, ou
   un mobile/tablette à l'établi ? (Détermine l'effort sur le tactile/mobile.)
3. **Le niveau d'exigence du registre** — usage interne simple, ou besoin de
   valeur probante (garantie, assurance, audit) ? (Détermine si on investit tout
   de suite dans l'immuabilité stricte et les signatures.)

---

*État actuel du dépôt : ce README de cadrage. Le code de la v1 (socle Supabase +
Next.js, étape 1 du plan) reste à initialiser une fois les décisions du §10
tranchées.*
