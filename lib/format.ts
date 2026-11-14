export function formatArea(km2?: number): string {
  if (km2 === undefined) return "—";
  if (km2 >= 10) return `${Math.round(km2).toLocaleString("en-US")} km²`;
  if (km2 >= 0.01) return `${km2.toFixed(2)} km²`;
  return `${Math.round(km2 * 1e6).toLocaleString("en-US")} m²`;
}

export function formatLength(km?: number): string {
  if (km === undefined) return "—";
  if (km >= 1) return `${km.toFixed(1)} km`;
  return `${Math.round(km * 1000)} m`;
}

export function formatCoords(lng: number, lat: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
