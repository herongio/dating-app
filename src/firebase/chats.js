import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./config";

function messagesCol(matchId) {
  return collection(db, "matches", matchId, "messages");
}

export function subscribeToMessages(matchId, callback) {
  const q = query(messagesCol(matchId), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function sendMessage(matchId, senderId, text) {
  const trimmed = text.trim();
  await addDoc(messagesCol(matchId), {
    senderId,
    text: trimmed,
    createdAt: serverTimestamp(),
  });
  // Denormalized onto the match doc so the chat list can show a preview
  // without subscribing to every match's message subcollection.
  await updateDoc(doc(db, "matches", matchId), {
    lastMessage: trimmed,
    lastMessageAt: serverTimestamp(),
  });
}
