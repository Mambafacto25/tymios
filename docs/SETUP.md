# Mise en route — socle v1 (étape 1)

Ce socle est l'**étape 1** du plan (cf. README §9) : base de données + auth +
déploiement vide qui tourne. Stack : **Next.js (App Router, TypeScript)** +
**Supabase** (PostgreSQL, Auth, Realtime), déployé sur **Vercel**.

## 1. Installer les dépendances

```bash
npm install
```

## 2. Créer le projet Supabase

1. Créer un projet sur https://supabase.com.
2. Appliquer le schéma : dans le **SQL Editor**, exécuter dans l'ordre
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_events_immutable_rls.sql`
   - `supabase/seed.sql` (référentiel des pôles)

   Ou, avec la CLI Supabase :

   ```bash
   supabase db push        # applique les migrations
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```

## 3. Variables d'environnement

```bash
cp .env.example .env.local
```

Renseigner depuis **Supabase → Settings → API** :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 4. Créer un premier utilisateur

Pour l'instant, l'inscription se fait côté Supabase (**Auth → Users → Add
user**, email + mot de passe). Ensuite, créer la ligne `users` correspondante
(même `id` que `auth.users.id`) — l'écran d'administration des établis viendra
dans une étape ultérieure.

## 5. Lancer en local

```bash
npm run dev      # http://localhost:3000
```

Non connecté → redirigé vers `/login`. Après connexion → tableau de bord du
socle.

## 6. Déployer sur Vercel

1. Importer le dépôt dans Vercel.
2. Renseigner les deux variables d'environnement (même valeurs que `.env.local`).
3. Déployer. Le front est servi par Vercel, les données par Supabase.

## Ce qui est garanti par le socle

- **Auth réelle** (email + mot de passe) via Supabase Auth.
- **Routes protégées** : le middleware redirige les non-connectés vers `/login`
  et rafraîchit la session à chaque requête.
- **Registre sacré garanti par la base** : la table `events` est en insertion
  seule (RLS sans politique UPDATE/DELETE + trigger anti-altération couvrant
  même `service_role`).

## Prochaines étapes (plan §9)

2. Lecture des pièces réelles depuis la base.
3. Écriture d'events + temps réel (Supabase Realtime) multi-écrans.
4. Le relais (envoi → acceptation/refus, PIN).
5. Pointage (chrono, saisie manuelle, correction tracée, règle de blocage).
6. Fiche PDF, archive, recherche.
7. Import OF (CSV).
