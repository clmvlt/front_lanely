# Features - couche API scalable

Organisation **par domaine** (feature-sliced). Aucune route ne vit dans un
fichier global : chaque domaine est autonome. Pensé pour passer à l'échelle
(des centaines de routes) sans fichier géant.

Domaines actuels : `auth/`, `companies/`, `invitations/`, `ors/`.

> `ors/` cible une **API externe ouverte** (ors.stack.bzh : routing, optimisation
> de tournées, geocodage), pas le backend Spring. Même structure, mais chaque
> appel passe `{ baseUrl: config.orsBaseUrl, auth: false }` au client `http`
> (option `baseUrl` = hôte alternatif, `auth: false` = pas de Bearer). On reste
> donc sur le client central, sans `fetch` brut.

## Structure d'un domaine

```
src/features/<domaine>/
  types.ts                 # entités, filtres, inputs (DTO)
  <domaine>.keys.ts        # query keys factory (cache TanStack Query)
  <domaine>.api.ts         # fonctions HTTP brutes (http.get/post/…)
  <domaine>.queries.ts     # hooks React (useXxx) basés sur TanStack Query
  index.ts                 # barrel d'export
```

## Briques communes (`src/lib/`, à réutiliser, ne pas dupliquer)

- `http` - client HTTP : `http.get/post/put/patch/delete`. Injecte l'access
  token (Bearer), sérialise le JSON, gère les query params et les uploads
  (`FormData`). **Intercepteur 401** : tente `POST /auth/refresh` une fois
  (single-flight), rejoue la requête, sinon purge les jetons et émet
  `lanely:unauthorized`. Lève `ApiError` (avec `fieldErrors`).
- `auth` - store des jetons : access en mémoire, refresh persistant.
  `setTokens` / `clearTokens` / `getAccessToken` / `hasSession` /
  `onUnauthorized`.
- `images.imageUrl(path)` - préfixe une URL d'image relative (`/images/<id>`)
  par l'URL de base de l'API.
- `permissions` - `CompanyRole`, `Permission` (string, catalogue-driven),
  `KNOWN_PERMISSIONS`.
- `pagination` - `Page<T>` (forme Spring Data) pour les endpoints paginés.
- `query-client` - `QueryClient` partagé.

## Authentification (2 jetons + refresh)

- **access** (JWT, ~15 min) : en mémoire, envoyé en `Authorization: Bearer`.
- **refresh** (opaque, ~30 j) : `localStorage`, sert à renouveler le couple.
- 401 → refresh automatique + rejeu (géré dans `http`, transparent pour les
  hooks). Rotation : chaque refresh remplace le refresh stocké.
- Au rechargement de page : appeler `useMe()` (actif si `hasSession()`) ;
  l'access manquant déclenche un refresh via l'intercepteur.
- `onUnauthorized(cb)` (depuis `@/lib/auth`) : à brancher au niveau app pour
  rediriger vers la connexion quand la session est définitivement perdue.

## Ajouter un nouveau domaine

1. Copier un dossier existant (`companies/`) et renommer.
2. `types.ts` : décrire entités + inputs.
3. `*.api.ts` : `RESOURCE = "/<resource>"` + fonctions HTTP. Routes non-CRUD ?
   ajouter une méthode (ex. `accept: (i) => http.post('/invitations/accept', i)`).
4. `*.keys.ts` : factory de clés.
5. `*.queries.ts` : hooks `useXxx`.
6. `index.ts` : ré-exporter.

## Règles

- Un domaine n'importe pas l'`api`/les hooks d'un autre domaine. Exception
  tolérée : importer ses **query keys** depuis son `index.ts` pour invalider le
  cache (ex. invalider `authKeys.me` après création d'entreprise).
- Toujours typer les réponses (`http.get<MonType>(…)`).
- Pagination Spring : `http.get<Page<T>>(path, { query: { page, size, sort } })`.
- Endpoints publics : passer `{ auth: false }` (pas de Bearer).
