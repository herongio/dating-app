import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "./config";

const matchesCol = collection(db, "matches");

export function matchIdFor(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

export async function createMatchIfNeeded(uidA, uidB, source) {
  const id = matchIdFor(uidA, uidB);
  await setDoc(
    doc(matchesCol, id),
    { participants: [uidA, uidB].sort(), source, matchedAt: serverTimestamp() },
    { merge: true }
  );
  return id;
}

// Sorts client-side (instead of orderBy in the query) so this doesn't
// require a composite Firestore index to be created for participants +
// matchedAt.
export function subscribeToMatches(uid, callback) {
  const q = query(matchesCol, where("participants", "array-contains", uid));
  return onSnapshot(q, (snap) => {
    const matches = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.matchedAt?.toMillis?.() ?? 0) - (a.matchedAt?.toMillis?.() ?? 0));
    callback(matches);
  });
}
