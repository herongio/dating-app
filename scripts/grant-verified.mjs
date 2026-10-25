// Marks an account as phone-verified without an SMS round trip — for test
// accounts on a deployment that has no SMS provider yet, and for support
// cases where a real person could not receive the code.
//
//   npm run grant-verified -- someone@example.com
//   npm run grant-verified -- <uid>
//
// Against production this needs the same credentials `firebase deploy` uses
// (FIREBASE_TOKEN or GOOGLE_APPLICATION_CREDENTIALS) plus GCLOUD_PROJECT;
// against the emulators, FIREBASE_AUTH_EMULATOR_HOST / FIRESTORE_EMULATOR_HOST.
// It does the exact two writes confirmPhoneVerification does — the claim the
// rules read and the field the app reads — and nothing else, so it cannot
// grant anything the normal flow could not.
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const target = process.argv[2];
if (!target) {
  console.error("usage: grant-verified <email | uid>");
  process.exit(2);
}

const app = initializeApp();
const auth = getAuth(app);
const db = getFirestore(app);

const user = target.includes("@")
  ? await auth.getUserByEmail(target)
  : await auth.getUser(target);

await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), verified: true });
await db.doc(`users/${user.uid}`).set(
  { phoneVerified: true, phoneVerifiedAt: FieldValue.serverTimestamp(), verifiedBy: "operator" },
  { merge: true }
);

console.log(`verified: ${user.uid}${user.email ? ` (${user.email})` : ""}`);
console.log("the device picks up the claim on its next token refresh — sign out and in to force it");
