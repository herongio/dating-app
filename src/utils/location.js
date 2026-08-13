import * as Location from "expo-location";

// Seoul city hall — used as a fallback when location permission is denied
// or unavailable (e.g. running in Expo Go on a simulator without GPS).
export const FALLBACK_LOCATION = { lat: 37.5665, lng: 126.978 };

export async function getCurrentLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return FALLBACK_LOCATION;

    const position = await Location.getCurrentPositionAsync({});
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  } catch {
    return FALLBACK_LOCATION;
  }
}

// Haversine formula — distance between two lat/lng points, in kilometers.
export function distanceKm(a, b) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}
