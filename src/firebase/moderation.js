import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "./config";

const blocksCol = collection(db, "blocks");
const blockPairsCol = collection(db, "blockPairs");
const reportsCol = collection(db, "reports");

function blockId(blockerId, blockedId) {
  return `${blockerId}_${blockedId}`;
}

export async function blockUser(blockerId, blockedId) {
  await setDoc(doc(blocksCol, blockId(blockerId, blockedId)), {
    blockerId,
    blockedId,
    createdAt: serverTimestamp(),
  });
}

export async function unblockUser(blockerId, blockedId) {
  await deleteDoc(doc(blocksCol, blockId(blockerId, blockedId)));
}

// `blocks` docs are readable only by the blocker, so this reads the
// symmetric `blockPairs` mirror the onBlockWritten Cloud Function keeps —
// which hides *that* someone blocked you without revealing *who*.
export function subscribeToBlockedIds(uid, callback) {
  const q = query(blockPairsCol, where("users", "array-contains", uid));
  return onSnapshot(q, (snap) => {
    const ids = snap.docs.flatMap((d) => d.data().users.filter((id) => id !== uid));
    callback(new Set(ids));
  });
}

// The blocks *you* created — the only ones you're allowed to undo, and the
// only ones you're allowed to read.
export function subscribeToMyBlocks(uid, callback) {
  const q = query(blocksCol, where("blockerId", "==", uid));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data().blockedId));
  });
}

export const REPORT_REASONS = [
  { value: "inappropriate", label: "부적절한 사진 또는 프로필" },
  { value: "harassment", label: "욕설 · 괴롭힘" },
  { value: "spam", label: "스팸 · 광고" },
  { value: "scam", label: "사기 의심" },
  { value: "underage", label: "미성년자로 의심됨" },
  { value: "other", label: "기타" },
];

export async function reportUser({ reporterId, reportedId, reason, detail = "" }) {
  await addDoc(reportsCol, {
    reporterId,
    reportedId,
    reason,
    detail: detail.trim(),
    createdAt: serverTimestamp(),
  });
}
