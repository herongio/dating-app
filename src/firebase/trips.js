import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./config";
import { todayKey } from "../utils/trips";

const tripsCol = collection(db, "trips");

// One destination's travellers is a small set, so this cap only exists to
// stop a wildly popular city from pulling down thousands of docs at once.
const DESTINATION_PAGE_SIZE = 200;

function sortByStart(trips) {
  return trips.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function subscribeToMyTrips(uid, callback) {
  const q = query(tripsCol, where("ownerId", "==", uid));
  return onSnapshot(q, (snap) => {
    callback(sortByStart(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  });
}

export async function createTrip(ownerId, { destinationId, startDate, endDate, intent, note }) {
  const ref = await addDoc(tripsCol, {
    ownerId,
    destinationId,
    startDate,
    endDate,
    intent,
    note: note.trim(),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTrip(tripId, updates) {
  await updateDoc(doc(tripsCol, tripId), updates);
}

export async function deleteTrip(tripId) {
  await deleteDoc(doc(tripsCol, tripId));
}

// Because every trip carries a `destinationId` from the curated catalog,
// finding fellow travellers is one equality filter plus one range filter —
// no geo scan, and Firestore can serve it from a single composite index.
// Trips that already ended are excluded server-side.
export async function listTripsAtDestination(destinationId) {
  const q = query(
    tripsCol,
    where("destinationId", "==", destinationId),
    where("endDate", ">=", todayKey()),
    orderBy("endDate"),
    limit(DESTINATION_PAGE_SIZE)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
