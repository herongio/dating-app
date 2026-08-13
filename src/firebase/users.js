import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./config";

const usersCol = collection(db, "users");

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

export async function listAllUsers() {
  const snap = await getDocs(usersCol);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
