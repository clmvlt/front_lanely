/**
 * Types de l'API ORS (ors.stack.bzh) : routing, optimisation de tournees et
 * geocodage d'adresses (BAN). API ouverte, 100 % locale, sans authentification.
 *
 * Trois briques, chacune avec son endpoint de statut. Tant qu'une brique n'a
 * pas charge ses donnees, ses endpoints renvoient 503 (corps problem+json).
 */

/** Coordonnees WGS84. */
export interface Coordinate {
  lat: number
  lon: number
}

/** Format de geometrie demande dans les reponses. */
export type GeometryFormat = "POINTS" | "POLYLINE" | "NONE"

/* ----------------------------- Geocoding ------------------------------ */

/** Etat de l'index Lucene d'adresses. */
export interface GeocodingStatus {
  ready: boolean
}

/** Parametres de recherche d'adresse (`GET /geocoding/search`). */
export interface GeocodingSearchParams {
  /** Texte recherche ; autocompletion sur le dernier mot. */
  q: string
  /** Nombre maximum de resultats (1 a 50). Defaut 10. */
  limit?: number
  /** Latitude de reference pour le biais de proximite (lon requis si fourni). */
  lat?: number
  /** Longitude de reference pour le biais de proximite (lat requis si fourni). */
  lon?: number
}

/** Un resultat de geocodage. */
export interface AddressResult {
  label: string
  houseNumber: string
  street: string
  postcode: string
  city: string
  lat: number
  lon: number
  /** `housenumber` (adresse precise) ou `street` (agregat de voie). */
  type: string
  /** Distance reelle a la position de reference, sinon null. */
  distanceMeters: number | null
  score: number
}

/* ------------------------------ Routing ------------------------------- */

/** Etat du moteur de routing (graphe GraphHopper). */
export interface RoutingStatus {
  ready: boolean
  profile: string
}

/**
 * Requete d'itineraire. Deux modes exclusifs :
 * - point a point : `from` + `to` ;
 * - multi-points ordonne : `points` (>= 2), parcourus DANS L'ORDRE fourni.
 */
export interface RouteRequest {
  from?: Coordinate
  to?: Coordinate
  points?: Coordinate[]
  geometryFormat?: GeometryFormat
}

export interface RouteResponse {
  distanceMeters: number
  durationSeconds: number
  geometryFormat: GeometryFormat
  /** Liste [lat, lon] si POINTS, sinon null. */
  geometry: [number, number][] | null
  /** Encodage polyline (precision 5, ordre lat/lon) ; null si NONE. */
  geometryPolyline: string | null
}

export interface MatrixRequest {
  points: Coordinate[]
}

export interface MatrixResponse {
  size: number
  /** durationsSeconds[i][j] = temps du point i au point j (diagonale = 0). */
  durationsSeconds: number[][]
}

/* ---------------------------- Optimisation ---------------------------- */

/** Un point a visiter dans une tournee. */
export interface VisitDto {
  id: string
  name?: string
  lat: number
  lon: number
  /** Charge consommee (defaut 0). */
  demand?: number
  /** Temps de service sur place en secondes (defaut 0). */
  serviceDurationSeconds?: number
}

export interface OptimizeRequest {
  /** Depot commun (depart/retour). Obligatoire et rattachable au reseau. */
  depot: Coordinate
  visits: VisitDto[]
  /** Nombre de vehicules (defaut 1). */
  vehicleCount?: number
  /** Capacite par vehicule (omis = illimite). */
  vehicleCapacity?: number
  /** Heure de depart ISO (omis = heure serveur). */
  departureTime?: string
  /** Inclure la geometrie des trajets (defaut selon serveur). */
  includeGeometry?: boolean
  geometryFormat?: GeometryFormat
}

/** Troncon entre deux points consecutifs. */
export interface LegDto {
  distanceMeters: number
  durationSeconds: number
  geometry: [number, number][] | null
  geometryPolyline: string | null
}

/** Un arret d'une tournee (dans l'ordre de passage optimal). */
export interface StopDto {
  visitId: string
  name?: string
  lat: number
  lon: number
  legFromPrevious: LegDto
  cumulativeDistanceMeters: number
  cumulativeDrivingSeconds: number
  arrivalTime: string
  departureTime: string
  demand: number
}

/** Une tournee affectee a un vehicule. */
export interface RouteDto {
  vehicleId: string
  departureTime: string
  returnTime: string
  drivingTimeSeconds: number
  serviceTimeSeconds: number
  distanceMeters: number
  totalDemand: number
  stops: StopDto[]
  returnLeg: LegDto
  /** Trace COMPLETE de la tournee (depot -> arrets -> depot), d'un seul trait. */
  geometry: [number, number][] | null
  geometryPolyline: string | null
}

/** Pourquoi un point a ete ecarte de l'optimisation. */
export type SkippedReason = "UNROUTABLE" | "TOO_FAR"

export interface SkippedVisitDto {
  visitId: string
  name?: string
  lat: number
  lon: number
  reason: SkippedReason
  snapDistanceMeters: number
}

export interface OptimizeResponse {
  score: string
  totalDrivingTimeSeconds: number
  totalDistanceMeters: number
  routes: RouteDto[]
  /** Points non rattachables au reseau ou trop eloignes : a corriger cote client. */
  skippedVisits: SkippedVisitDto[]
}
