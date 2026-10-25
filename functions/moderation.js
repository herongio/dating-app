const { getAuth } = require("firebase-admin/auth");
const { FieldValue } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");
const { directedId } = require("./ids");

// Reasons where a single credible report already describes something the
// service cannot host while it waits for a third opinion.
const SEVERE_REASONS = new Set(["underage", "scam", "harassment"]);

// Thresholds are stated in *distinct reporters*, never in report count: a
// single person must never be able to remove an account, however many reasons
// they file, or reporting becomes a weapon. `reports` doc ids are
// "{reporterId}_{reportedId}", so one reporter can only ever hold one report
// per person and re-filing overwrites it.
const REPORTERS_TO_SUSPEND = 3;
const SEVERE_REPORTERS_TO_SUSPEND = 2;

function tally(docs) {
  const reporters = new Set();
  const severeReporters = new Set();
  const reasons = {};
  for (const doc of docs) {
    const { reporterId, reason } = doc.data();
    reporters.add(reporterId);
    if (SEVERE_REASONS.has(reason)) severeReporters.add(reporterId);
    reasons[reason] = (reasons[reason] ?? 0) + 1;
  }
  return { reporters, severeReporters, reasons };
}

function shouldSuspend({ reporters, severeReporters }) {
  if (reporters.size >= REPORTERS_TO_SUSPEND) return "reporter_threshold";
  if (severeReporters.size >= SEVERE_REPORTERS_TO_SUSPEND) return "severe_threshold";
  return null;
}

// Custom claims are what the Firestore rules read, because a claim costs
// nothing to check while a get() on the user doc costs a document read on
// every single write. The trade-off is that a claim only reaches a device on
// the next token refresh, so `users/{uid}.suspendedAt` is written too: the
// client and createMatch() both honour it immediately.
async function applySuspension(db, uid, reason, detail) {
  const userRef = db.doc(`users/${uid}`);
  const existing = await userRef.get();
  // Later reports keep arriving after the threshold is crossed; re-applying
  // would reset the timestamp the operator is reviewing and re-log every time.
  if (existing.exists && existing.data().suspendedAt != null) return;

  const user = await getAuth().getUser(uid).catch(() => null);
  if (user) {
    await getAuth().setCustomUserClaims(uid, { ...(user.customClaims ?? {}), suspended: true });
  } else {
    // The doc write and the operator queue below still happen: a uid we can't
    // claim-flag is exactly the case a human needs to see.
    logger.warn("Suspending a uid with no auth record", { uid });
  }

  await userRef.set(
    { suspendedAt: FieldValue.serverTimestamp(), suspendedReason: reason },
    { merge: true }
  );

  // The operator queue. Suspension is automatic so that nobody waits on a
  // human to be harmed-adjacent, but every suspension still has to be read by
  // one — appeals and false positives are only visible to a person.
  await db.doc(`moderationQueue/${uid}`).set(
    {
      uid,
      reason,
      ...detail,
      status: "awaiting_review",
      suspendedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  logger.warn("Account auto-suspended", { uid, reason, ...detail });
}

// Recounts from the collection rather than incrementing a counter: a retried
// trigger delivery would double an increment, and the whole point of this
// function is that the number it acts on is right.
async function handleReportWritten(db, reportId) {
  const [reporterId, reportedId] = reportId.split("_");
  if (!reporterId || !reportedId || reporterId === reportedId) return;

  // Reporting someone is also a request to stop seeing them. Writing the
  // block here means that holds even if the app is closed before the user
  // answers the "차단할까요?" prompt. onBlockWritten mirrors it into the
  // symmetric blockPairs doc, which is what hides them from each other.
  await db.doc(`blocks/${directedId(reporterId, reportedId)}`).set(
    { blockerId: reporterId, blockedId: reportedId, createdAt: FieldValue.serverTimestamp(), viaReport: true },
    { merge: true }
  );

  const snap = await db.collection("reports").where("reportedId", "==", reportedId).get();
  const { reporters, severeReporters, reasons } = tally(snap.docs);

  await db.doc(`moderationCounters/${reportedId}`).set(
    {
      uid: reportedId,
      reportCount: snap.size,
      distinctReporters: reporters.size,
      severeReporters: severeReporters.size,
      reasons,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const reason = shouldSuspend({ reporters, severeReporters });
  if (reason) {
    await applySuspension(db, reportedId, reason, {
      distinctReporters: reporters.size,
      severeReporters: severeReporters.size,
      reasons,
    });
  }
}

module.exports = {
  handleReportWritten,
  SEVERE_REASONS,
  REPORTERS_TO_SUSPEND,
  SEVERE_REPORTERS_TO_SUSPEND,
};
