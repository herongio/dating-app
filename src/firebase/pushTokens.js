import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./config";

// Kept out of `users/{uid}` because profiles are readable by every signed-in
// user, and a push token is enough to send someone notifications.
export async function savePushToken(uid, token) {
  await setDoc(doc(db, "pushTokens", uid), { token, updatedAt: serverTimestamp() });
}

export async function clearPushToken(uid) {
  await deleteDoc(doc(db, "pushTokens", uid));
}
