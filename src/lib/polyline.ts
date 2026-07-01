/**
 * Décodeur de polyline encodée (algorithme Google/OSRM).
 *
 * L'API transport renvoie `geometryPolyline` en **précision 5** et en ordre
 * **[lat, lon]** (piège classique : ce n'est pas [lon, lat]). On décode donc en
 * paires `[lat, lng]` directement traçables sur une carte.
 */
export function decodePolyline(
  encoded: string | null | undefined,
  precision = 5,
): [number, number][] {
  if (!encoded) return []

  const factor = Math.pow(10, precision)
  const coordinates: [number, number][] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let result = 1
    let shift = 0
    let byte: number
    do {
      byte = encoded.charCodeAt(index++) - 63 - 1
      result += byte << shift
      shift += 5
    } while (byte >= 0x1f)
    lat += result & 1 ? ~(result >> 1) : result >> 1

    result = 1
    shift = 0
    do {
      byte = encoded.charCodeAt(index++) - 63 - 1
      result += byte << shift
      shift += 5
    } while (byte >= 0x1f)
    lng += result & 1 ? ~(result >> 1) : result >> 1

    coordinates.push([lat / factor, lng / factor])
  }

  return coordinates
}
