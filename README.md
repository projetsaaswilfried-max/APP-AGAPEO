# Agape — Plateforme sociale chrétienne pour le mariage

Application Next.js (App Router) + Supabase (Auth, PostgreSQL, Storage, Realtime).

## Démarrage local

### 1. Créer un projet Supabase

Sur [supabase.com](https://supabase.com/dashboard), crée un nouveau projet (gratuit). Récupère dans **Project Settings > API** :
- Project URL
- clé `anon` `public`
- clé `service_role` (secrète)

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env.local
```

Renseigne les valeurs récupérées à l'étape précédente dans `.env.local`.

### 3. Appliquer le schéma de base de données

Deux options :

**Option A — via le Dashboard (le plus simple)** : ouvre l'éditeur SQL de ton projet Supabase et exécute, dans l'ordre, le contenu des fichiers de `supabase/migrations/` (par ordre alphabétique/chronologique du nom de fichier).

**Option B — via la CLI Supabase** :
```bash
npx supabase login
npx supabase link --project-ref <ton-project-ref>
npx supabase db push
```

### 4. Installer les dépendances et lancer le serveur

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

### 5. (Optionnel) Générer les types Supabase officiels

Une fois le projet lié, tu peux remplacer les types écrits à la main par la version générée automatiquement :

```bash
npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

### 6. Créer un compte administrateur

Après inscription normale via `/register`, promeus ton compte en base :

```sql
update profiles set role = 'ADMIN' where id = '<ton-user-id>';
```

Tu pourras alors publier dans le fil officiel depuis `/admin/posts`.

## Stack

- **Frontend** : Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Framer Motion
- **Backend** : Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Validation** : Zod, React Hook Form (partiellement adopté — cf. rapport de livraison)

## Structure

```
src/
  app/                → Routes (groupes (auth), (onboarding), (dashboard), (admin))
  components/         → UI (design system) + features (par domaine métier)
  domain/             → Types, services (accès Supabase), mappers, matching
  lib/                → Clients Supabase, Server Actions, validation, storage
  core/               → Providers React, hooks partagés
supabase/
  migrations/         → Schéma SQL, RLS, Storage (à appliquer dans l'ordre)
```
