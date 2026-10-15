import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "./config";

const swipesCol = collection(db, "swipes");

function swipeId(swiperId, targetId) {
  return `${swiperId}_${targetId}`;
}

// Records the swipe only. Mutual likes are detected by the onSwipeCreated
// Cloud Function, so the client never needs to read anyone else's swipes —
// the resulting match arrives through the matches subscription.
export async function recordSwipe(swiperId, targetId, direction) {
  await setDoc(doc(swipesCol, swipeId(swiperId, targetId)), {
    swiperId,
    targetId,
    direction,
    createdAt: serverTimestamp(),
  });
}

export async function getSwipedTargetIds(swiperId) {
  const q = query(swipesCol, where("swiperId", "==", swiperId));
  const snap = await getDocs(q);
  return new Set(snap.docs.map((d) => d.data().targetId));
}
