const { setGlobalOptions } = require("firebase-functions/v2");
const {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentWritten,
} = require("firebase-functions/v2/firestore");
const { onCall } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const { pairId, directedId } = require("./ids");
const { sendPushTo } = require("./push");
const { handleReportWritten } = require("./moderation");
const verification = require("./verification");

initializeApp();
const db = getFirestore();

setGlobalOptions({ region: "asia-northeast3", maxInstances: 10 });

async function isPairBlocked(uidA, uidB) {
  const snap = await db.collection("blockPairs").doc(pairId(uidA, uidB)).get();
  return snap.exists;
}

// Read from the user doc rather than the custom claim: a claim only reaches a
// device on its next token refresh, and a match must never be created for an
// account that was suspended a minute ago.
async function isSuspended(uid) {
  const snap = await db.collection("users").doc(uid).get();
  return snap.exists && snap.data().suspendedAt != null;
}

async function displayName(uid) {
  const snap = await db.collection("users").doc(uid).get();
  return snap.exists ? snap.data().name : "상대방";
}

// Creating the match server-side is what lets `swipes` stay private: the
// client can no longer read other people's swipes to work out a mutual
// like for itself.
async function createMatch(uidA, uidB, source) {
  if (await isPairBlocked(uidA, uidB)) return null;
  const suspended = await Promise.all([isSuspended(uidA), isSuspended(uidB)]);
  if (suspended.some(Boolean)) return null;
  const id = pairId(uidA, uidB);
  await db.collection("matches").doc(id).set(
    {
      participants: [uidA, uidB].sort(),
      source,
      matchedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return id;
}

// Phone verification. Callables rather than client-side Firebase phone auth:
// the code never leaves the server, one handset can only ever verify one
// account, and the resulting `verified` custom claim is the single thing the
// Firestore rules check before letting anyone post a trip, swipe or message.
//
// The pepper lives in Secret Manager, not in plain function config: it is
// what stops the phone-number hashes from being a lookup table over every
// Korean mobile number. Set it once with
//   firebase functions:secrets:set PHONE_HASH_PEPPER
// and it reaches verification.js as process.env.PHONE_HASH_PEPPER. In the
// emulator the value comes from functions/.secret.local.
const PHONE_HASH_PEPPER = defineSecret("PHONE_HASH_PEPPER");
const verificationOptions = { secrets: [PHONE_HASH_PEPPER] };

exports.startPhoneVerification = onCall(verificationOptions, (request) =>
  verification.start(db, request)
);
exports.confirmPhoneVerification = onCall(verificationOptions, (request) =>
  verification.confirm(db, request)
);

exports.onSwipeCreated = onDocumentCreated("swipes/{swipeId}", async (event) => {
  const swipe = event.data?.data();
  if (!swipe || swipe.direction !== "like") return;

  const { swiperId, targetId } = swipe;
  const reciprocal = await db
    .collection("swipes")
    .doc(directedId(targetId, swiperId))
    .get();
  if (!reciprocal.exists || reciprocal.data().direction !== "like") return;

  if (await createMatch(swiperId, targetId, "swipe")) {
    logger.info("Mutual like matched", { swiperId, targetId });
  }
});

exports.onTripRequestResponded = onDocumentUpdated(
  "tripRequests/{requestId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.status === "accepted" || after.status !== "accepted") return;

    if (await createMatch(after.fromUserId, after.toUserId, "trip")) {
      logger.info("Trip request accepted", {
        fromUserId: after.fromUserId,
        toUserId: after.toUserId,
      });
    }
  }
);

// `blocks/{blockerId}_{blockedId}` is readable only by the blocker, so the
// person who was blocked can't tell who blocked them. Both sides still need
// to hide each other, so mirror every block into a symmetric `blockPairs`
// doc that carries the uid pair and nothing else.
exports.onBlockWritten = onDocumentWritten("blocks/{blockId}", async (event) => {
  const [uidA, uidB] = event.params.blockId.split("_");
  if (!uidA || !uidB) return;

  // Either direction keeps the pair hidden from each other, so the mirror
  // doc survives until both blocks are gone.
  const directions = await db.getAll(
    db.collection("blocks").doc(directedId(uidA, uidB)),
    db.collection("blocks").doc(directedId(uidB, uidA))
  );

  const pairRef = db.collection("blockPairs").doc(pairId(uidA, uidB));
  if (directions.some((snap) => snap.exists)) {
    await pairRef.set({ users: [uidA, uidB].sort() });
  } else {
    await pairRef.delete();
  }
});

// Reports are handled in one place so that a report always has the same three
// consequences — the pair is hidden from each other, the tally is recomputed,
// and the account is suspended once enough distinct people have said the same
// thing. See functions/moderation.js for the thresholds.
exports.onReportWritten = onDocumentWritten("reports/{reportId}", async (event) => {
  if (!event.data?.after.exists) return;
  await handleReportWritten(db, event.params.reportId);
});

exports.onMatchCreated = onDocumentCreated("matches/{matchId}", async (event) => {
  const participants = event.data?.data()?.participants ?? [];
  await Promise.all(
    participants.map(async (uid) => {
      const other = participants.find((id) => id !== uid);
      await sendPushTo(db, uid, {
        title: "새로운 여행 메이트 ✈️",
        body: `${await displayName(other)}님과 연결됐어요! 먼저 인사해보세요.`,
        data: { type: "match", matchId: event.params.matchId },
      });
    })
  );
});

exports.onMessageCreated = onDocumentCreated(
  "matches/{matchId}/messages/{messageId}",
  async (event) => {
    const message = event.data?.data();
    if (!message) return;

    const recipient = event.params.matchId
      .split("_")
      .find((uid) => uid !== message.senderId);
    if (!recipient) return;

    await sendPushTo(db, recipient, {
      title: await displayName(message.senderId),
      body: message.text,
      data: { type: "message", matchId: event.params.matchId },
    });
  }
);
