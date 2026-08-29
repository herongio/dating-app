import * as Location from "expo-location";
import { distanceBetween, geohashForLocation } from "geofire-common";

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

// Stored next to `location` on the user profile so nearby search can run as
// a Firestore range query instead of downloading every user.
export function geohashFor(location) {
  return geohashForLocation([location.lat, location.lng]);
}

// The two fields always have to move together, so build them together.
export function locationFields(location) {
  return { location, geohash: geohashFor(location) };
}

export function distanceKm(a, b) {
  return distanceBetween([a.lat, a.lng], [b.lat, b.lng]);
}
