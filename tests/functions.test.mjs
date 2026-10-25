import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Exercises the Firestore triggers in functions/index.js against the
// emulator: write what a client is allowed to write, then wait for the
// document only a Cloud Function can create.
//
// Run through `npm run test:functions`, which starts the emulators and sets
// FIRESTORE_EMULATOR_HOST for the admin SDK below.

const TIMEOUT_MS = 30_000;
const POLL_MS = 250;
const SETTLE_MS = 3000;

const PROJECT = "demo-dating-app";
const REGION = "asia-northeast3";
const FUNCTIONS_ORIGIN = process.env.FUNCTIONS_EMULATOR_ORIGIN ?? "http://127.0.0.1:5001";

let app;
let db;
let auth;

before(() => {
  assert.ok(
    process.env.FIRESTORE_EMULATOR_HOST,
    "FIRESTORE_EMULATOR_HOST is unset — run this through `npm run test:functions`"
  );
  assert.ok(
    process.env.FIREBASE_AUTH_EMULATOR_HOST,
    "FIREBASE_AUTH_EMULATOR_HOST is unset — run this through `npm run test:functions`"
  );
  app = initializeApp({ projectId: PROJECT });
  db = getFirestore(app);
  auth = getAuth(app);
});

after(() => deleteApp(app));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(path, { toExist = true } = {}) {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    const snap = await db.doc(path).get();
    if (snap.exists === toExist) return snap;
    await sleep(POLL_MS);
  }
  assert.fail(`${path} was still ${toExist ? "missing" : "present"} after ${TIMEOUT_MS}ms`);
}

// Gives a trigger time to run, for the cases where the assertion is that it
// did nothing.
async function assertNever(path) {
  await sleep(SETTLE_MS);
  const snap = await db.doc(path).get();
  assert.equal(snap.exists, false, `${path} should not have been created`);
}

const like = (from, to) =>
  db.doc(`swipes/${from}_${to}`).set({ swiperId: from, targetId: to, direction: "like" });

// Callables are reached over HTTP the way the app reaches them, which is the
// only way the auth context, the HttpsError codes and the region routing get
// exercised at all.
async function callAs(idToken, name, data) {
  const response = await fetch(`${FUNCTIONS_ORIGIN}/${PROJECT}/${REGION}/${name}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(idToken ? { authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({ data }),
  });
  const body = await response.json();
  return { ok: response.ok, status: response.status, ...body };
}

async function signIn(uid, { password = "test1234" } = {}) {
  const email = `${uid}@test.app`;
  await auth.deleteUser(uid).catch(() => {});
  await auth.createUser({ uid, email, password });
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const response = await fetch(
    `http://${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const body = await response.json();
  assert.ok(body.idToken, `sign-in failed for ${uid}: ${JSON.stringify(body)}`);
  return body.idToken;
}

const report = (reporterId, reportedId, reason = "spam") =>
  db.doc(`reports/${reporterId}_${reportedId}`).set({ reporterId, reportedId, reason });

describe("onSwipeCreated", () => {
  test("a mutual like creates the match", async () => {
    await like("swipeA", "swipeB");
    await like("swipeB", "swipeA");

    const match = await waitFor("matches/swipeA_swipeB");
    assert.deepEqual(match.data().participants, ["swipeA", "swipeB"]);
    assert.equal(match.data().source, "swipe");
  });

  test("a one-sided like creates nothing", async () => {
    await like("oneWayA", "oneWayB");
    await assertNever("matches/oneWayA_oneWayB");
  });

  test("a pass never matches, even when the other side liked", async () => {
    await like("passB", "passA");
    await db.doc("swipes/passA_passB").set({
      swiperId: "passA",
      targetId: "passB",
      direction: "pass",
    });
    await assertNever("matches/passA_passB");
  });
});

describe("onTripRequestResponded", () => {
  test("accepting creates the match", async () => {
    const ref = db.doc("tripRequests/reqA_reqB");
    await ref.set({ fromUserId: "reqA", toUserId: "reqB", status: "pending" });
    await ref.update({ status: "accepted" });

    const match = await waitFor("matches/reqA_reqB");
    assert.equal(match.data().source, "trip");
  });

  test("declining creates nothing", async () => {
    const ref = db.doc("tripRequests/decA_decB");
    await ref.set({ fromUserId: "decA", toUserId: "decB", status: "pending" });
    await ref.update({ status: "declined" });
    await assertNever("matches/decA_decB");
  });
});

describe("onBlockWritten", () => {
  test("a block is mirrored into a symmetric pair doc, and cleared on unblock", async () => {
    const ref = db.doc("blocks/blockA_blockB");
    await ref.set({ blockerId: "blockA", blockedId: "blockB" });

    const pair = await waitFor("blockPairs/blockA_blockB");
    assert.deepEqual(pair.data(), { users: ["blockA", "blockB"] });
    assert.equal("blockerId" in pair.data(), false, "the mirror must not name the blocker");

    await ref.delete();
    await waitFor("blockPairs/blockA_blockB", { toExist: false });
  });

  test("the mirror survives while either direction is still blocking", async () => {
    await db.doc("blocks/bothA_bothB").set({ blockerId: "bothA", blockedId: "bothB" });
    await db.doc("blocks/bothB_bothA").set({ blockerId: "bothB", blockedId: "bothA" });
    await waitFor("blockPairs/bothA_bothB");

    await db.doc("blocks/bothA_bothB").delete();
    await sleep(SETTLE_MS);

    const pair = await db.doc("blockPairs/bothA_bothB").get();
    assert.equal(pair.exists, true);
  });

  test("a blocked pair cannot be matched by a mutual like", async () => {
    await db.doc("blocks/hideA_hideB").set({ blockerId: "hideA", blockedId: "hideB" });
    await waitFor("blockPairs/hideA_hideB");

    await like("hideA", "hideB");
    await like("hideB", "hideA");
    await assertNever("matches/hideA_hideB");
  });
});


describe("onReportWritten", () => {
  test("a report blocks the pair without the reporter doing anything else", async () => {
    await report("rep1", "repTarget1");

    const block = await waitFor("blocks/rep1_repTarget1");
    assert.equal(block.data().viaReport, true);
    // Reusing onBlockWritten means the hide is symmetric for free.
    await waitFor("blockPairs/rep1_repTarget1");
  });

  test("the tally counts distinct reporters, not reports", async () => {
    await report("tally1", "tallyTarget", "spam");
    await waitFor("moderationCounters/tallyTarget");
    // Same reporter, new reason: the doc id is the pair, so this overwrites.
    await report("tally1", "tallyTarget", "inappropriate");
    await sleep(SETTLE_MS);

    const counter = await db.doc("moderationCounters/tallyTarget").get();
    assert.equal(counter.data().reportCount, 1);
    assert.equal(counter.data().distinctReporters, 1);
  });

  // The property that matters most: reporting must not be a weapon.
  test("one reporter can never suspend an account, however many times they file", async () => {
    await signIn("soloTarget");
    for (const reason of ["spam", "harassment", "scam", "underage"]) {
      await report("solo1", "soloTarget", reason);
      await sleep(400);
    }
    await sleep(SETTLE_MS);

    const user = await db.doc("users/soloTarget").get();
    assert.equal(user.exists && user.data().suspendedAt != null, false);
    const queued = await db.doc("moderationQueue/soloTarget").get();
    assert.equal(queued.exists, false);
  });

  test("three distinct reporters suspend the account and queue it for review", async () => {
    await signIn("threeTarget");
    await report("three1", "threeTarget");
    await report("three2", "threeTarget");
    await report("three3", "threeTarget");

    const user = await waitFor("users/threeTarget");
    assert.ok(user.data().suspendedAt, "suspendedAt should be set");
    assert.equal(user.data().suspendedReason, "reporter_threshold");

    const queued = await waitFor("moderationQueue/threeTarget");
    assert.equal(queued.data().status, "awaiting_review");
    assert.equal(queued.data().distinctReporters, 3);

    // The claim the Firestore rules read.
    const record = await auth.getUser("threeTarget");
    assert.equal(record.customClaims?.suspended, true);
  });

  test("two reporters are enough when the reason is severe", async () => {
    await signIn("sevTarget");
    await report("sev1", "sevTarget", "underage");
    await report("sev2", "sevTarget", "underage");

    const user = await waitFor("users/sevTarget");
    assert.equal(user.data().suspendedReason, "severe_threshold");
  });

  test("an existing verification claim survives a suspension", async () => {
    const uid = "claimTarget";
    await signIn(uid);
    await auth.setCustomUserClaims(uid, { verified: true });
    await report("claim1", uid, "underage");
    await report("claim2", uid, "underage");
    await waitFor(`users/${uid}`);

    const record = await auth.getUser(uid);
    assert.equal(record.customClaims.suspended, true);
    assert.equal(record.customClaims.verified, true, "verification must not be wiped");
  });

  test("a suspended account cannot be matched, even on a mutual like", async () => {
    await db.doc("users/suspMatch").set({ name: "Suspended", suspendedAt: new Date() });
    await like("suspMatch", "cleanMatch");
    await like("cleanMatch", "suspMatch");
    await assertNever("matches/cleanMatch_suspMatch");
  });
});

describe("phone verification", () => {
  test("the happy path: a code is sent, confirmed, and sets the claim", async () => {
    const uid = "verifyMe";
    const token = await signIn(uid);

    const started = await callAs(token, "startPhoneVerification", { phone: "010-1234-5678" });
    assert.equal(started.result?.sent, true);
    assert.ok(started.result.devCode, "the emulator should hand back the code");

    const confirmed = await callAs(token, "confirmPhoneVerification", {
      code: started.result.devCode,
    });
    assert.equal(confirmed.result?.verified, true);

    const record = await auth.getUser(uid);
    assert.equal(record.customClaims?.verified, true);
    const profile = await db.doc(`users/${uid}`).get();
    assert.equal(profile.data().phoneVerified, true);
    // The pending doc is cleared, so a stale code can't be replayed.
    const pending = await db.doc(`phoneVerifications/${uid}`).get();
    assert.equal(pending.exists, false);
  });

  test("the raw phone number is never stored", async () => {
    const uid = "privacyMe";
    const token = await signIn(uid);
    const started = await callAs(token, "startPhoneVerification", { phone: "01011112222" });
    await callAs(token, "confirmPhoneVerification", { code: started.result.devCode });

    const hashes = await db.collection("phoneHashes").get();
    const serialized = JSON.stringify(hashes.docs.map((d) => ({ id: d.id, ...d.data() })));
    assert.equal(serialized.includes("01011112222"), false);
    assert.equal(serialized.includes("+821011112222"), false);
  });

  test("a wrong code is rejected and burns an attempt", async () => {
    const uid = "wrongCode";
    const token = await signIn(uid);
    await callAs(token, "startPhoneVerification", { phone: "01022223333" });

    const failed = await callAs(token, "confirmPhoneVerification", { code: "000000" });
    assert.equal(failed.ok, false);
    assert.equal(failed.error?.status, "INVALID_ARGUMENT");

    const pending = await db.doc(`phoneVerifications/${uid}`).get();
    assert.equal(pending.data().attempts, 1);

    const record = await auth.getUser(uid);
    assert.notEqual(record.customClaims?.verified, true);
  });

  test("attempts are capped, so a six-digit code can't be brute-forced", async () => {
    const uid = "bruteForce";
    const token = await signIn(uid);
    await callAs(token, "startPhoneVerification", { phone: "01033334444" });

    for (let i = 0; i < 5; i++) {
      await callAs(token, "confirmPhoneVerification", { code: "111111" });
    }
    const blocked = await callAs(token, "confirmPhoneVerification", { code: "111111" });
    assert.equal(blocked.error?.status, "RESOURCE_EXHAUSTED");
  });

  test("resending is rate limited", async () => {
    const uid = "resend";
    const token = await signIn(uid);
    await callAs(token, "startPhoneVerification", { phone: "01044445555" });
    const again = await callAs(token, "startPhoneVerification", { phone: "01044445555" });
    assert.equal(again.error?.status, "RESOURCE_EXHAUSTED");
  });

  // Sybil resistance: without this, verification costs one SIM for unlimited
  // accounts and stops being a cost at all.
  test("one handset cannot verify a second account", async () => {
    const phone = "01055556666";
    const first = await signIn("handsetA");
    const started = await callAs(first, "startPhoneVerification", { phone });
    await callAs(first, "confirmPhoneVerification", { code: started.result.devCode });

    const second = await signIn("handsetB");
    const blocked = await callAs(second, "startPhoneVerification", { phone });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.error?.status, "ALREADY_EXISTS");
  });

  test("a malformed number is refused before any SMS is sent", async () => {
    const token = await signIn("badPhone");
    for (const phone of ["123", "", "0211112222", "+1 555 0100"]) {
      const result = await callAs(token, "startPhoneVerification", { phone });
      assert.equal(result.error?.status, "INVALID_ARGUMENT", `accepted ${phone}`);
    }
  });

  test("signing in is required", async () => {
    const result = await callAs(null, "startPhoneVerification", { phone: "01066667777" });
    assert.equal(result.error?.status, "UNAUTHENTICATED");
  });

  test("confirming without having started is refused", async () => {
    const token = await signIn("noStart");
    const result = await callAs(token, "confirmPhoneVerification", { code: "123456" });
    assert.equal(result.error?.status, "FAILED_PRECONDITION");
  });
});
