import { collection, doc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "./config";
import { createMatchIfNeeded } from "./matches";

const requestsCol = collection(db, "friendRequests");

function requestId(fromUserId, toUserId) {
  return `${fromUserId}_${toUserId}`;
}

export async function sendFriendRequest(fromUserId, toUserId) {
  await setDoc(doc(requestsCol, requestId(fromUserId, toUserId)), {
    fromUserId,
    toUserId,
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

export async function respondToRequest(request, accept) {
  await updateDoc(doc(requestsCol, request.id), {
    status: accept ? "accepted" : "declined",
    respondedAt: serverTimestamp(),
  });
  if (accept) {
    await createMatchIfNeeded(request.fromUserId, request.toUserId, "nearby");
  }
}
