import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "./config";
import { createMatchIfNeeded } from "./matches";

const swipesCol = collection(db, "swipes");

function swipeId(swiperId, targetId) {
  return `${swiperId}_${targetId}`;
}

export async function recordSwipe(swiperId, targetId, direction) {
  await setDoc(doc(swipesCol, swipeId(swiperId, targetId)), {
    swiperId,
    targetId,
    direction,
    createdAt: serverTimestamp(),
  });
}

export async function hasLiked(swiperId, targetId) {
  const snap = await getDoc(doc(swipesCol, swipeId(swiperId, targetId)));
  return snap.exists() && snap.data().direction === "like";
}

export async function getSwipedTargetIds(swiperId) {
  const q = query(swipesCol, where("swiperId", "==", swiperId));
  const snap = await getDocs(q);
  return new Set(snap.docs.map((d) => d.data().targetId));
}

// Records the swipe and, on a mutual like, creates the match. Returns
// whether this swipe resulted in a match.
export async function performSwipe(swiperId, targetId, direction) {
  await recordSwipe(swiperId, targetId, direction);
  if (direction === "like" && (await hasLiked(targetId, swiperId))) {
    await createMatchIfNeeded(swiperId, targetId, "swipe");
    return true;
  }
  return false;
}
