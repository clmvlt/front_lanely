# Lanely - Frontend

Frontend du TMS **Lanely**. Stack : **Vite + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui**.
Le backend est une API **Spring Boot** (séparée).

## Prérequis

- Node.js ≥ 20
- npm ≥ 10

## Installation

```bash
npm install
```

## Environnements

4 environnements, chacun avec sa propre URL d'API (via `VITE_API_BASE_URL`) :

| Env     | Fichier            | Mode Vite     | URL de déploiement        | Commande              |
| ------- | ------------------ | ------------- | ------------------------- | --------------------- |
| **dev** | `.env.development` | `development` | local (localhost)         | `npm run dev`         |
| **beta**| `.env.beta`        | `beta`        | beta.lanely.fr            | `npm run build:beta`  |
| **demo**| `.env.demo`        | `demo`        | demo.lanely.fr            | `npm run build:demo`  |
| **prod**| `.env.production`  | `production`  | lanely.fr                 | `npm run build:prod`  |

> ⚠️ Les URLs d'API dans les fichiers `.env.*` sont des **valeurs par défaut à
> adapter** à ton infrastructure réelle (sous-domaine API, port, chemin `/api`…).

### Variables disponibles

- `VITE_APP_ENV` - `dev | beta | demo | prod`
- `VITE_API_BASE_URL` - URL de base de l'API Spring Boot (sans slash final)

Seules les variables préfixées `VITE_` sont exposées au navigateur.
Pour un override **local non versionné**, crée un `.env.<mode>.local` (ignoré par git).

## Scripts

```bash
npm run dev          # serveur de dev (mode development → .env.development)
npm run build:beta   # build beta  → dist/   (.env.beta)
npm run build:demo   # build demo  → dist/   (.env.demo)
npm run build:prod   # build prod  → dist/   (.env.production)
npm run preview      # prévisualise le dernier build
npm run lint         # ESLint
```

Chaque build génère le dossier `dist/` à pousser sur le site correspondant.

## Architecture

```
src/
  components/      # ui/ (shadcn), status-badge, language-switcher
  features/        # couche API par domaine (cf. features/README.md)
    auth/          #   register, login, refresh, me, sessions
    companies/     #   entreprises, membres, permissions
    invitations/   #   invitations + acceptation
  i18n/            # index.ts + locales/{en,fr}.json
  lib/
    http.ts        # client HTTP central (Bearer auto, intercepteur 401→refresh)
    auth.ts        # store des jetons (access mémoire, refresh persistant)
    images.ts      # imageUrl() - préfixe les URLs d'images relatives
    permissions.ts # CompanyRole, Permission, KNOWN_PERMISSIONS
    query-client.ts# QueryClient TanStack Query partagé
    pagination.ts  # Page<T> (forme Spring Data)
    config.ts      # config dérivée des variables d'env
    colors.ts      # charte couleurs (source de vérité)
    utils.ts       # helper cn()
  App.tsx
  main.tsx
  index.css        # Tailwind v4 + design tokens (cf. color_chart.md)
```

### Ajouter un composant shadcn/ui

```bash
npx shadcn@latest add card input dialog ...
```

### Appeler l'API

Couche API scalable, organisée par domaine - voir [`src/features/README.md`](src/features/README.md).
Auth à 2 jetons (access + refresh), intercepteur 401→refresh transparent.

```tsx
import { useLogin, useMe } from "@/features/auth"
import { useCreateCompany } from "@/features/companies"

const login = useLogin()
login.mutate({ input: { email, password }, deviceLabel: "Chrome - Windows" })

const { data: me } = useMe()            // réhydrate l'app après un reload
const createCompany = useCreateCompany() // le créateur devient OWNER
```

Nouveau domaine → copier `src/features/companies/`.
