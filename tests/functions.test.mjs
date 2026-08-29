import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { deleteApp, initializeApp } from "firebase-admin/app";
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

let app;
let db;

before(() => {
  assert.ok(
    process.env.FIRESTORE_EMULATOR_HOST,
    "FIRESTORE_EMULATOR_HOST is unset — run this through `npm run test:functions`"
  );
  app = initializeApp({ projectId: "demo-dating-app" });
  db = getFirestore(app);
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
