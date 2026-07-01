# Lanely - Frontend

TMS (gestion de transport). Frontend du SaaS. Backend = API **Spring Boot** séparée.

## Stack

Vite 6 · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · react-i18next · Mapbox GL (cartes).

## Cartes

**Toujours utiliser Mapbox GL (`mapbox-gl`) pour tout affichage de carte.** Jamais Leaflet/MapLibre/Google Maps ni un rendu maison. Le jeton public est centralisé dans `config.mapboxToken` (`src/lib/config.ts`), alimenté par `VITE_MAPBOX_TOKEN` (même valeur sur tous les environnements, repli codé en dur).

**Tout passe par la feature carte `src/features/map/`** (jamais `mapbox-gl` directement dans une vue) : points GPS, trajets, adresses, sélection de point. Les vues importent depuis `@/features/map` :
- `RouteMap` : trace une polyline d'itinéraire + place des `markers` (`MapPoint[]`) avec métriques distance/durée. Mode dégradé via `unavailable`.
- `LocationPickerMap` : sélection d'un point unique (marqueur déplaçable + clic carte), coordonnées saisies manuellement.
- Les deux sont chargés à la demande (Mapbox est volumineux) via `./lazy` ; le barrel n'expose que ces wrappers.

**Style des points GPS** (`src/features/map/markers.ts`) : un point a un `tone` prédéfini (`depot`, `stop`, `pickup`, `delivery`, `default`) qui fixe couleur/forme, surchargeable finement via `MarkerStyle` (`color`, `textColor`, `borderColor`, `size`, `shape`). Les couleurs viennent de `@/lib/colors` (jamais en dur). Le socle de cycle de vie d'une carte est le hook `useMap` (`use-map.ts`) ; la config commune (jeton, style, centre) est dans `setup.ts`. Importer la CSS Mapbox (`mapbox-gl/dist/mapbox-gl.css`) se fait déjà dans les composants de la feature. Textes génériques sous l'espace i18n `map.*`.

## Commandes

- `npm run dev` - dev local (mode `development`, `.env.development`)
- `npm run build:beta` / `build:demo` / `build:prod` - build par environnement
- `npm run lint` - ESLint

4 environnements (`dev`, `beta`, `demo`, `prod`), chacun avec sa propre `VITE_API_BASE_URL` dans `.env.*`. Voir `README.md`.

## Règles d'or (à respecter toujours)

1. **Ne commente jamais le code** sauf demande explicite.
2. **Charte de couleurs** : toujours passer par `src/lib/colors.ts` (source de vérité, fidèle à `color_chart.md`). Jamais de couleur en dur. Tu peux **ajouter/modifier** une couleur dans `colors.ts` si besoin (et la répliquer dans le `@theme` de `src/index.css` pour l'avoir en classe Tailwind).
3. **Design cohérent** : tout nouvel écran/composant doit respecter l'apparence existante du projet et de ce qui l'entoure (espacements, rayons, typographie, tokens shadcn `bg-background`, `text-foreground`, `primary`…). Pas d'élément qui détonne.
4. **i18n obligatoire** : aucun texte visible en dur. Tout passe par `useTranslation()` + clés dans `src/i18n/locales/en.json` et `fr.json`. **Langue par défaut : anglais.** Toute nouvelle chaîne ajoutée en EN **et** FR. **L'i18n couvre aussi les messages renvoyés par l'API** (validation, erreurs métier) : `http.ts` envoie automatiquement l'en-tête `Accept-Language` = langue active sur chaque requête. Ne jamais coder une langue en dur - s'appuyer sur ce header central. Côté UI, réserver l'espace des messages d'erreur (cf. `FormField`) pour éviter tout décalage de mise en page.
5. **Appels API** : jamais de `fetch` brut. Client central `src/lib/http.ts` (`http.get/post/…`, Bearer auto, query params, upload `FormData`). Données serveur via **TanStack Query** (hooks `useXxx`), jamais de `useState`+`useEffect` pour fetcher.
6. **Responsive obligatoire (mobile + desktop)** : tout écran/composant doit être pleinement utilisable du mobile (~360 px) au desktop, sans débordement horizontal. Approche **mobile-first** : styles de base = mobile, puis montée en gamme via les breakpoints Tailwind (`sm:` 640, `md:` 768, `lg:` 1024…). Réflexes : conteneurs `min-w-0` + `truncate` pour les textes longs ; rangées de liste en `flex flex-wrap` (les actions passent à la ligne au lieu de déborder) ; paddings/gaps réduits sur mobile et élargis au `sm:` (ex. `px-4 py-6 sm:px-6 sm:py-10`) ; libellés secondaires masqués sur mobile (`hidden sm:inline`) en gardant l'icône ; cibles tactiles confortables. Les `Dialog`/formulaires (`max-w-*` + `px-4`) et la navbar (`AppLayout`) sont déjà adaptés - s'en inspirer. Vérifier chaque nouvel écran aux deux tailles avant de considérer la tâche terminée.
7. **Pas de caractères typographiques « IA »** : ne jamais utiliser de tiret cadratin (`—`) ni de tiret demi-cadratin (`–`), ni aucun caractère de ponctuation « décoratif » qui trahit un texte généré par IA. Utiliser uniquement la ponctuation standard : virgule, deux-points, point, parenthèses ou simple trait d'union (`-`). Cette règle vaut partout : textes visibles (i18n EN **et** FR), commentaires de code et documentation.
8. **Navigation « retour » qui préserve l'état de l'écran d'origine** : un aller-retour (liste -> détail -> retour) ne doit JAMAIS perdre l'état de la liste (recherche, filtres, onglet, pagination). Deux volets : (a) **l'état d'un écran à filtres vit dans l'URL** (`useSearchParams`, lecture à l'init + écriture en `replace`), pas seulement en `useState` volatil ; (b) **tout bouton « retour » de page passe par le hook `useBack(fallback)`** (`src/lib/use-back.ts`) qui fait `navigate(-1)` quand un historique applicatif existe (donc revient à l'URL exacte précédente, filtres compris) et retombe sur `fallback` en accès direct. Ne jamais coder un bouton retour avec `navigate("/chemin/fixe")` ni un `<Link to="/chemin/fixe">` : ça écrase l'écran d'origine. Le `fallback` n'est qu'un repli pour le cas « pas d'historique ».
9. **Occuper tout l'espace disponible** : toute page (a fortiori une page dédiée : véhicules, clients, quais…) doit remplir la largeur et la hauteur disponibles, jamais laisser l'écran à moitié vide avec un contenu tassé au centre. Réflexes : conteneur de page en pleine largeur (largeur max généreuse type `max-w-7xl mx-auto` ou pleine largeur quand c'est pertinent), contenu qui s'étale (tableaux/listes/grilles `w-full`, grilles responsives `grid-cols-*` qui montent en colonnes au `lg:`/`xl:` plutôt qu'une colonne étroite isolée), zones qui prennent la hauteur restante (`flex-1`, `min-h-0`). Une page dédiée ne doit pas « faire vide ». Toujours penser large d'abord, puis condenser pour le mobile (cf. règle 6). Vérifier le rendu desktop large (≥1280 px) avant de considérer la tâche terminée.

## API - architecture (scalable, des centaines de routes)

Organisation **par domaine** dans `src/features/<domaine>/` (cf. `src/features/README.md`). Jamais de fichier de routes global. Domaines : `auth/`, `companies/`, `invitations/`.

```
src/features/<domaine>/
  types.ts              entités, inputs (DTO)
  <domaine>.keys.ts     query keys factory (invalidation ciblée)
  <domaine>.api.ts      fonctions HTTP (http.*), RESOURCE = "/xxx"
  <domaine>.queries.ts  hooks useXxx (TanStack Query)
  index.ts              barrel
```

Nouveau domaine → copier `companies/`.

**Bases API** : URL sous sous-domaine `api.`, **sans préfixe `/api`** (ex. `POST /auth/login`). Libellés/messages API en anglais.

**Auth (2 jetons)** : access JWT (~15 min, en mémoire) + refresh opaque (~30 j, `localStorage`). L'intercepteur 401 de `http` tente `POST /auth/refresh` une fois (single-flight) puis rejoue ; sinon purge + événement `lanely:unauthorized`. Rotation du refresh à chaque renouvellement. Store : `@/lib/auth` (`setTokens`/`clearTokens`/`hasSession`/`onUnauthorized`). Reload → `useMe()`. Endpoints publics : `{ auth: false }`.

**Permissions** : catalogue dynamique via `GET /companies/permissions` - **ne pas coder en dur** (`Permission = string`, `KNOWN_PERMISSIONS` pour les constantes connues). OWNER = toutes les permissions.

**Images** : `profileImageUrl` est relative (`/images/<id>`) → l'afficher via `imageUrl()` (`@/lib/images`).

Pagination Spring : `http.get<Page<T>>(path, { query })` (`@/lib/pagination`).

## API ORS (ors.stack.bzh) - trajets, tournées, geocodage

API **ouverte** (sans authentification, 100 % locale côté serveur) pour la **gestion des trajets**, distincte du backend Spring. Trois briques : **routing** (`/routing` - itinéraire + matrice de temps, GraphHopper/OSM France), **optimisation** (`/optimization` - ordre de passage optimal VRP/TSP via Timefold) et **geocodage** (`/geocoding` - recherche/autocomplétion d'adresse sur la Base Adresse Nationale).

- **Domaine** : `src/features/ors/` (même forme que les autres domaines). Hooks : `useAddressSearch`, `useRoute`, `useMatrix`, `useOptimizeTour`, `useRoutingStatus`, `useGeocodingStatus`. Tout est typé (`Coordinate`, `RouteRequest`, `OptimizeRequest`, `AddressResult`…).
- **Base URL** : `config.orsBaseUrl` (`VITE_ORS_BASE_URL`, repli `https://ors.stack.bzh`). Les appels passent par le client central `http` avec `{ baseUrl: config.orsBaseUrl, auth: false }` (jamais de `fetch` brut, jamais de Bearer). L'option `baseUrl` de `http` sert exactement à viser un hôte externe en gardant sérialisation/query/`ApiError`.
- **Disponibilité** : tant qu'une brique n'a pas chargé ses données, ses endpoints renvoient **503** (corps `application/problem+json`) ; interroger `useRoutingStatus`/`useGeocodingStatus` (`ready`) avant un appel et gérer le 503 (`ApiError.status`).
- **Geocodage** : `q` sans numéro → résultats agrégés par voie (`type=street`) ; avec numéro → adresses précises (`type=housenumber`). `lat`+`lon` (les deux ou aucun) activent un biais de proximité (`distanceMeters`). Penser à **debouncer** `q`.
- **Optimisation** : ordre des arrêts retourné = ordre de passage optimal. Toujours inspecter `skippedVisits[]` (points écartés `UNROUTABLE`/`TOO_FAR`) et utiliser `routes[].geometry`/`geometryPolyline` pour tracer la tournée complète d'un seul trait (les polylignes par segment ne se concatènent pas). Affichage carte = feature `src/features/map/` (cf. `RouteMap`).

## Bonnes pratiques & pièges à éviter

**React 19**
- Composants fonctionnels + hooks. TypeScript strict.
- React Compiler → ne pas sur-mémoïser (`useMemo`/`useCallback`/`memo` seulement si profilé).
- Listes longues → virtualisation (`react-window`).
- `startTransition` uniquement pour le non-urgent, pas pour masquer un render lent.

**Tailwind v4**
- Config **CSS-first** dans `src/index.css` (`@theme`), pas de `tailwind.config.js`.
- Bordure par défaut = `currentColor` → toujours préciser la couleur (`border-border` appliqué en base).
- Classes v3 supprimées : `flex-shrink-0`→`shrink-0`, `bg-gradient-to-r`→`bg-linear-to-r`.
- Responsive cassé ? vérifier un `container-type` manquant pour les container queries.
- Espacements multiples de 4.

**shadcn/ui**
- Composants **possédés** (copiés dans `src/components/ui/`), on les édite directement.
- Variantes via **CVA**, pas de longues chaînes de classes conditionnelles.
- Thème via variables CSS, pas de couleurs en dur.
- `npx shadcn@latest add <composant>` pour en ajouter.
- **Dialog / overlay gris figé (Radix #3701, React 19)** : à l'ouverture, Radix met tout ce qui est hors du dialog en `aria-hidden`/`inert`. Si un élément (souvent un **input**) garde le focus à ce moment, le navigateur bloque `aria-hidden` sur son ancêtre, le `FocusScope` reste coincé et on ne voit plus que l'overlay → **popup gris non interactif**. Le wrapper `Dialog` (`src/components/ui/dialog.tsx`) corrige ça globalement en défocalisant l'élément resté hors du dialog à l'ouverture - **ne pas retirer ce garde** `useLayoutEffect`. Tout `Dialog`/`AlertDialog` doit passer par ce wrapper (jamais `DialogPrimitive.Root` brut).

## App / routing

React Router (`App.tsx` = routes). Garde de routes `src/app/protected-route.tsx` (`ProtectedRoute` / `PublicOnlyRoute`) + contexte `src/app/auth-context.tsx` (`useAuth` : `user`, `isAuthenticated`, `isLoading` ; redirige sur `lanely:unauthorized`). Pages dans `src/pages/`, layouts dans `src/layouts/` (`AuthLayout` centré, `AppLayout` avec en-tête + déconnexion). Routes : `/login`, `/register`, `/join?code=…`, `/verify-email?token=…`, `/app` (protégée, redirige vers `/app/company/settings`), `/app/company/settings` (paramètres de l'entreprise active), `/app/company/members` (membres, profils de livraison, invitations), `/app/profile`. La navbar (`AppLayout`) est responsive : sur **desktop** (`sm:`+) elle expose à gauche le logo + un menu déroulant **« Entreprise »** (`nav.*`, → Paramètres / Membres & profils, ouverture au survol) et à droite le menu profil (au survol) + le sélecteur de langue ; sur **mobile** le nom du logiciel disparaît (logo réduit à la pastille `markOnly`) et toute la navigation est regroupée dans un **menu burger** (icône `Menu`, ouverture au clic) qui rassemble identité, liens Entreprise, profil, changement d'entreprise + création, langues et déconnexion.

**Entreprise active (« utilisée »)** : `src/app/company-context.tsx` (`useCompany` : `companies`, `selectedCompany`, `selectCompany`). Sélectionner une entreprise dans le menu (`AppLayout`) la rend **active/utilisée** ; elle est persistée dans `localStorage` (`lanely.companyId`) et retombe sur la première dispo si invalide. **Les pages `/app/company/*` affichent toujours l'entreprise active** ; le shell partagé `src/components/company-shell.tsx` rend l'en-tête (logo + nom) et l'état vide « aucune entreprise », et passe le `selectedCompany` à ses enfants. `company-settings-page.tsx` = paramètres (nom/logo) ; `company-members-page.tsx` = membres, profils de livraison, invitations. Pas de liste d'entreprises sur ces pages. La création passe uniquement par `CreateCompanyDialog` ouvert depuis le menu. Gating UI via `hasPermission(membership, perm)` (`@/lib/permissions`, OWNER = toutes) : `MANAGE_COMPANY` → éditer nom/logo, `MANAGE_PERMISSIONS` → éditer les permissions d'un membre.

## Arborescence

```
src/
  app/          auth-context, protected-route
  components/    ui/ (shadcn), form-field, language-switcher, full-page-spinner
  features/      auth/ companies/ invitations/ ors/ routing/ (couche API) · map/ (cartes Mapbox)
  i18n/          index.ts, locales/{en,fr}.json
  layouts/       auth-layout, app-layout
  lib/           http, auth, images, permissions, colors, config, utils, …
  pages/         login, register, accept-invitation, dashboard, not-found
  App.tsx  main.tsx  index.css
```
