import {
  collection,
  doc,
  endAt,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAt,
  updateDoc,
} from "firebase/firestore";
import { geohashQueryBounds } from "geofire-common";
import { db } from "./config";
import { distanceKm } from "../utils/location";

const usersCol = collection(db, "users");

// The swipe deck pulls a page of profiles rather than the whole collection.
// It's deliberately larger than a session's worth of swiping so filtering
// out already-swiped and blocked users still leaves a usable deck.
const DISCOVER_PAGE_SIZE = 100;

export async function createUserProfile(uid, profile) {
  await setDoc(doc(usersCol, uid), profile);
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(usersCol, uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateUserProfile(uid, updates) {
  await updateDoc(doc(usersCol, uid), updates);
}

export async function listCandidateUsers() {
  const snap = await getDocs(query(usersCol, limit(DISCOVER_PAGE_SIZE)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Geohash range queries: geohashQueryBounds() turns a circle into a handful
// of prefix ranges that Firestore can serve with its single-field index on
// `geohash`. The bounds over-cover the circle (they're rectangular), so the
// exact distance check afterwards is what actually enforces the radius.
export async function listUsersNear(center, radiusKm) {
  const bounds = geohashQueryBounds([center.lat, center.lng], radiusKm * 1000);
  const snaps = await Promise.all(
    bounds.map(([start, end]) =>
      getDocs(query(usersCol, orderBy("geohash"), startAt(start), endAt(end)))
    )
  );

  // Bounds can overlap, so the same user may come back from several queries.
  const byId = new Map();
  snaps.forEach((snap) =>
    snap.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() }))
  );

  return [...byId.values()]
    .filter((user) => user.location)
    .map((user) => ({ ...user, distanceKm: distanceKm(center, user.location) }))
    .filter((user) => user.distanceKm <= radiusKm);
}
