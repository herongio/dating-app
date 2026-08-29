import { collection, doc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "./config";

const requestsCol = collection(db, "tripRequests");

function requestId(fromUserId, toUserId) {
  return `${fromUserId}_${toUserId}`;
}

// The doc id is the uid pair, so two people can only have one open thread
// between them no matter how many trips they end up sharing. The trip ids
// are carried along so both sides can see which trip started it.
export async function sendTripRequest({ fromUserId, toUserId, fromTripId, toTripId, message = "" }) {
  await setDoc(doc(requestsCol, requestId(fromUserId, toUserId)), {
    fromUserId,
    toUserId,
    fromTripId,
    toTripId,
    message: message.trim(),
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export async function getSentRequestStatusMap(fromUserId) {
  const q = query(requestsCol, where("fromUserId", "==", fromUserId));
  const snap = await getDocs(q);
  const map = {};
  snap.docs.forEach((d) => {
    map[d.data().toUserId] = d.data().status;
  });
  return map;
}

export function subscribeToReceivedRequests(uid, callback) {
  const q = query(requestsCol, where("toUserId", "==", uid), where("status", "==", "pending"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// Accepting only flips the status — the onTripRequestResponded Cloud
// Function is what creates the match.
export async function respondToRequest(request, accept) {
  await updateDoc(doc(requestsCol, request.id), {
    status: accept ? "accepted" : "declined",
    respondedAt: serverTimestamp(),
  });
}
