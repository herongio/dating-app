import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

const ALICE = "alice";
const BOB = "bob";
const MALLORY = "mallory";
const MATCH = "alice_bob"; // sorted pair id, same shape as blockPairs ids

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-dating-app",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

after(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

// The default context is a *verified* account, because that is the only kind
// that can do anything outward and almost every rule below is about something
// else. The two gates themselves get their own contexts.
function as(uid) {
  return testEnv.authenticatedContext(uid, { verified: true }).firestore();
}

// Signed in, phone not yet verified — a brand-new account.
function asUnverified(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

// Verified, then suspended by onReportWritten. Carries both claims, the way a
// real suspended account does.
function asSuspended(uid) {
  return testEnv.authenticatedContext(uid, { verified: true, suspended: true }).firestore();
}

function seed(fn) {
  return testEnv.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()));
}

const blockPair = (a, b) => seed((db) => setDoc(doc(db, "blockPairs", [a, b].sort().join("_")), { users: [a, b].sort() }));

describe("swipes stay private to the swiper", () => {
  beforeEach(() =>
    seed((db) =>
      setDoc(doc(db, "swipes", `${ALICE}_${BOB}`), {
        swiperId: ALICE,
        targetId: BOB,
        direction: "like",
      })
    )
  );

  test("the swiper can read their own swipe", async () => {
    await assertSucceeds(getDoc(doc(as(ALICE), "swipes", `${ALICE}_${BOB}`)));
  });

  test("the target cannot read who liked them", async () => {
    await assertFails(getDoc(doc(as(BOB), "swipes", `${ALICE}_${BOB}`)));
  });

  test("nobody can query another user's swipes", async () => {
    const db = as(BOB);
    await assertFails(getDocs(query(collection(db, "swipes"), where("swiperId", "==", ALICE))));
    await assertSucceeds(getDocs(query(collection(db, "swipes"), where("swiperId", "==", BOB))));
  });

  test("a swipe must be written under the swiper's own id", async () => {
    await assertFails(
      setDoc(doc(as(MALLORY), "swipes", `${ALICE}_${BOB}`), {
        swiperId: ALICE,
        targetId: BOB,
        direction: "like",
      })
    );
  });

  test("a blocked pair cannot swipe on each other", async () => {
    await blockPair(ALICE, MALLORY);
    await assertFails(
      setDoc(doc(as(ALICE), "swipes", `${ALICE}_${MALLORY}`), {
        swiperId: ALICE,
        targetId: MALLORY,
        direction: "like",
      })
    );
  });
});

describe("matches are created only by Cloud Functions", () => {
  beforeEach(() =>
    seed((db) => setDoc(doc(db, "matches", MATCH), { participants: [ALICE, BOB], source: "swipe" }))
  );

  test("a client cannot forge a match", async () => {
    await assertFails(
      setDoc(doc(as(ALICE), "matches", "alice_mallory"), {
        participants: [ALICE, MALLORY],
        source: "swipe",
      })
    );
  });

  test("participants can read their match, outsiders cannot", async () => {
    await assertSucceeds(getDoc(doc(as(ALICE), "matches", MATCH)));
    await assertFails(getDoc(doc(as(MALLORY), "matches", MATCH)));
  });

  // The chat list lists the collection rather than fetching one doc. A rule
  // keyed on the {matchId} wildcard passes the get above and still denies this,
  // because the wildcard is null when the query has no single document.
  test("a participant can list their matches, which is how the chat list loads", async () => {
    await assertSucceeds(
      getDocs(query(collection(as(ALICE), "matches"), where("participants", "array-contains", ALICE)))
    );
  });

  test("listing someone else's matches is denied", async () => {
    await assertFails(
      getDocs(query(collection(as(MALLORY), "matches"), where("participants", "array-contains", ALICE)))
    );
    await assertFails(getDocs(collection(as(ALICE), "matches")));
  });

  test("participants may only update the chat-list preview fields", async () => {
    await assertSucceeds(
      updateDoc(doc(as(ALICE), "matches", MATCH), { lastMessage: "안녕", lastMessageAt: new Date() })
    );
    await assertFails(
      updateDoc(doc(as(ALICE), "matches", MATCH), { participants: [ALICE, MALLORY] })
    );
  });
});

describe("messages", () => {
  beforeEach(() =>
    seed((db) => setDoc(doc(db, "matches", MATCH), { participants: [ALICE, BOB] }))
  );

  test("a participant can send as themselves only", async () => {
    const messages = collection(as(ALICE), "matches", MATCH, "messages");
    await assertSucceeds(addDoc(messages, { senderId: ALICE, text: "안녕" }));
    await assertFails(addDoc(messages, { senderId: BOB, text: "사칭" }));
  });

  test("an outsider cannot read or write the thread", async () => {
    await assertFails(getDocs(collection(as(MALLORY), "matches", MATCH, "messages")));
  });

  test("a blocked pair cannot exchange messages", async () => {
    await blockPair(ALICE, BOB);
    await assertFails(
      addDoc(collection(as(ALICE), "matches", MATCH, "messages"), { senderId: ALICE, text: "안녕" })
    );
  });
});

describe("trips", () => {
  beforeEach(() =>
    seed((db) =>
      setDoc(doc(db, "trips", "aliceTrip"), {
        ownerId: ALICE,
        destinationId: "tokyo",
        startDate: "2026-09-01",
        endDate: "2026-09-07",
        intent: "companion",
      })
    )
  );

  test("any signed-in user can browse trips — that is how travellers find each other", async () => {
    await assertSucceeds(
      getDocs(query(collection(as(BOB), "trips"), where("destinationId", "==", "tokyo")))
    );
  });

  test("a trip must be created under its own owner", async () => {
    const fields = { destinationId: "osaka", startDate: "2026-09-01", endDate: "2026-09-05", intent: "both" };
    await assertSucceeds(setDoc(doc(as(BOB), "trips", "bobTrip"), { ...fields, ownerId: BOB }));
    await assertFails(setDoc(doc(as(BOB), "trips", "forged"), { ...fields, ownerId: ALICE }));
  });

  test("only the owner can edit or delete a trip", async () => {
    await assertFails(updateDoc(doc(as(BOB), "trips", "aliceTrip"), { endDate: "2026-09-20" }));
    await assertFails(deleteDoc(doc(as(BOB), "trips", "aliceTrip")));
    await assertSucceeds(updateDoc(doc(as(ALICE), "trips", "aliceTrip"), { endDate: "2026-09-20" }));
    await assertSucceeds(deleteDoc(doc(as(ALICE), "trips", "aliceTrip")));
  });

  test("a trip cannot be handed to someone else", async () => {
    await assertFails(updateDoc(doc(as(ALICE), "trips", "aliceTrip"), { ownerId: BOB }));
  });
});

describe("trip requests", () => {
  test("a request must be sent under the sender's own id", async () => {
    await assertSucceeds(
      setDoc(doc(as(ALICE), "tripRequests", `${ALICE}_${BOB}`), {
        fromUserId: ALICE,
        toUserId: BOB,
        status: "pending",
      })
    );
    await assertFails(
      setDoc(doc(as(MALLORY), "tripRequests", `${ALICE}_${BOB}`), {
        fromUserId: ALICE,
        toUserId: BOB,
        status: "pending",
      })
    );
  });

  test("only the recipient can accept, and only the status fields change", async () => {
    await seed((db) =>
      setDoc(doc(db, "tripRequests", `${ALICE}_${BOB}`), {
        fromUserId: ALICE,
        toUserId: BOB,
        status: "pending",
      })
    );
    const ref = (uid) => doc(as(uid), "tripRequests", `${ALICE}_${BOB}`);

    await assertFails(updateDoc(ref(ALICE), { status: "accepted" }));
    await assertFails(updateDoc(ref(BOB), { status: "accepted", toUserId: MALLORY }));
    await assertSucceeds(updateDoc(ref(BOB), { status: "accepted", respondedAt: new Date() }));
  });

  test("a blocked pair cannot send trip requests", async () => {
    await blockPair(ALICE, BOB);
    await assertFails(
      setDoc(doc(as(ALICE), "tripRequests", `${ALICE}_${BOB}`), {
        fromUserId: ALICE,
        toUserId: BOB,
        status: "pending",
      })
    );
  });
});

describe("blocks hide who blocked whom", () => {
  beforeEach(() =>
    seed((db) =>
      setDoc(doc(db, "blocks", `${ALICE}_${BOB}`), { blockerId: ALICE, blockedId: BOB })
    )
  );

  test("the blocker can read and undo their own block", async () => {
    await assertSucceeds(getDoc(doc(as(ALICE), "blocks", `${ALICE}_${BOB}`)));
    await assertSucceeds(deleteDoc(doc(as(ALICE), "blocks", `${ALICE}_${BOB}`)));
  });

  test("the blocked user cannot read the block that names them", async () => {
    await assertFails(getDoc(doc(as(BOB), "blocks", `${ALICE}_${BOB}`)));
    await assertFails(deleteDoc(doc(as(BOB), "blocks", `${ALICE}_${BOB}`)));
  });

  test("a block must name its own author", async () => {
    await assertFails(
      setDoc(doc(as(MALLORY), "blocks", `${ALICE}_${MALLORY}`), {
        blockerId: ALICE,
        blockedId: MALLORY,
      })
    );
  });
});

describe("blockPairs are readable by both sides and writable by neither", () => {
  beforeEach(() => blockPair(ALICE, BOB));

  test("both users in the pair can read it", async () => {
    await assertSucceeds(
      getDocs(query(collection(as(BOB), "blockPairs"), where("users", "array-contains", BOB)))
    );
  });

  test("an unrelated user cannot read it", async () => {
    await assertFails(getDoc(doc(as(MALLORY), "blockPairs", MATCH)));
  });

  test("clients cannot forge or delete a pair", async () => {
    await assertFails(
      setDoc(doc(as(ALICE), "blockPairs", "alice_mallory"), { users: [ALICE, MALLORY] })
    );
    await assertFails(deleteDoc(doc(as(ALICE), "blockPairs", MATCH)));
  });
});

describe("reports are write-only and one per pair", () => {
  const report = (db, reporterId, reportedId, reason = "spam") =>
    setDoc(doc(db, "reports", `${reporterId}_${reportedId}`), { reporterId, reportedId, reason });

  test("a report must name its own reporter and cannot be read back", async () => {
    await assertSucceeds(report(as(ALICE), ALICE, BOB));
    await assertFails(report(as(ALICE), MALLORY, BOB));
    await assertFails(getDocs(collection(as(ALICE), "reports")));
    await assertFails(getDoc(doc(as(ALICE), "reports", `${ALICE}_${BOB}`)));
  });

  // The id binding is the anti-abuse mechanism: without it one account could
  // file twenty reports and cross the "distinct reporters" threshold alone.
  test("a report cannot be filed at an id that does not match its uids", async () => {
    await assertFails(
      setDoc(doc(as(ALICE), "reports", "someRandomId"), {
        reporterId: ALICE,
        reportedId: BOB,
        reason: "spam",
      })
    );
  });

  test("re-filing overwrites the one report instead of stacking a second", async () => {
    await assertSucceeds(report(as(ALICE), ALICE, BOB, "spam"));
    await assertSucceeds(report(as(ALICE), ALICE, BOB, "harassment"));
  });

  test("nobody can report themselves into a suspension", async () => {
    await assertFails(report(as(ALICE), ALICE, ALICE));
  });

  test("the moderation tallies and queue are invisible to the app", async () => {
    await seed((db) => setDoc(doc(db, "moderationCounters", BOB), { distinctReporters: 2 }));
    await seed((db) => setDoc(doc(db, "moderationQueue", BOB), { status: "awaiting_review" }));
    await assertFails(getDoc(doc(as(BOB), "moderationCounters", BOB)));
    await assertFails(getDoc(doc(as(BOB), "moderationQueue", BOB)));
  });
});

describe("a suspended account can look but not act", () => {
  beforeEach(() =>
    seed(async (db) => {
      await setDoc(doc(db, "users", MALLORY), { name: "Mallory", suspendedAt: new Date() });
      await setDoc(doc(db, "trips", "mTrip"), {
        ownerId: MALLORY,
        destinationId: "tokyo",
        startDate: "2026-09-01",
        endDate: "2026-09-07",
        intent: "both",
      });
      await setDoc(doc(db, "matches", `${ALICE}_${MALLORY}`), {
        participants: [ALICE, MALLORY].sort(),
      });
    })
  );

  test("they keep read access, so they can see their threads and appeal", async () => {
    await assertSucceeds(getDoc(doc(asSuspended(MALLORY), "users", ALICE)));
    await assertSucceeds(getDocs(collection(asSuspended(MALLORY), "trips")));
  });

  test("they cannot create or edit a trip", async () => {
    await assertFails(
      addDoc(collection(asSuspended(MALLORY), "trips"), {
        ownerId: MALLORY,
        destinationId: "osaka",
        startDate: "2026-10-01",
        endDate: "2026-10-05",
        intent: "both",
      })
    );
    await assertFails(updateDoc(doc(asSuspended(MALLORY), "trips", "mTrip"), { note: "still here" }));
  });

  test("they cannot swipe, request a trip, or send a message", async () => {
    await assertFails(
      setDoc(doc(asSuspended(MALLORY), "swipes", `${MALLORY}_${ALICE}`), {
        swiperId: MALLORY,
        targetId: ALICE,
        direction: "like",
      })
    );
    await assertFails(
      setDoc(doc(asSuspended(MALLORY), "tripRequests", `${MALLORY}_${ALICE}`), {
        fromUserId: MALLORY,
        toUserId: ALICE,
        status: "pending",
      })
    );
    await assertFails(
      addDoc(collection(asSuspended(MALLORY), "matches", `${ALICE}_${MALLORY}`, "messages"), {
        senderId: MALLORY,
        text: "hello again",
      })
    );
  });

  test("an account without the claim is unaffected", async () => {
    await assertSucceeds(
      addDoc(collection(as(ALICE), "trips"), {
        ownerId: ALICE,
        destinationId: "tokyo",
        startDate: "2026-09-01",
        endDate: "2026-09-07",
        intent: "both",
      })
    );
  });
});

describe("push tokens are private to their owner", () => {
  beforeEach(() => seed((db) => setDoc(doc(db, "pushTokens", ALICE), { token: "ExponentPushToken[x]" })));

  test("only the owner can read or write their token", async () => {
    await assertSucceeds(getDoc(doc(as(ALICE), "pushTokens", ALICE)));
    await assertFails(getDoc(doc(as(BOB), "pushTokens", ALICE)));
    await assertFails(setDoc(doc(as(BOB), "pushTokens", ALICE), { token: "stolen" }));
  });
});

describe("profiles", () => {
  beforeEach(() => seed((db) => setDoc(doc(db, "users", ALICE), { name: "Alice", age: 28 })));

  test("readable to signed-in users, writable only by their owner", async () => {
    await assertSucceeds(getDoc(doc(as(BOB), "users", ALICE)));
    await assertFails(updateDoc(doc(as(BOB), "users", ALICE), { name: "hacked" }));
    await assertSucceeds(updateDoc(doc(as(ALICE), "users", ALICE), { name: "Alice K" }));
  });

  test("an unverified account can still create and edit its own profile", async () => {
    // Verification happens after sign-up, so gating the profile itself would
    // lock everyone out of the screen they need before they can verify.
    await assertSucceeds(
      setDoc(doc(asUnverified(BOB), "users", BOB), { name: "Bob", age: 30 })
    );
  });

  test("a new profile cannot declare itself verified or unsuspended", async () => {
    await assertFails(
      setDoc(doc(as(BOB), "users", BOB), { name: "Bob", age: 30, phoneVerified: true })
    );
    await assertFails(
      setDoc(doc(as(BOB), "users", BOB), { name: "Bob", age: 30, suspendedAt: null })
    );
    await assertSucceeds(setDoc(doc(as(BOB), "users", BOB), { name: "Bob", age: 30 }));
  });

  test("a minor cannot create a profile, and nobody can edit into one", async () => {
    await assertFails(setDoc(doc(as(BOB), "users", BOB), { name: "Teen", age: 17 }));
    await assertFails(setDoc(doc(as(BOB), "users", BOB), { name: "NoAge" }));
    await assertFails(updateDoc(doc(as(ALICE), "users", ALICE), { age: 15 }));
  });

  // Without this the client-side suspension filter is worthless: the
  // suspended user owns the document it reads.
  test("nobody can clear their own suspension or grant themselves verification", async () => {
    await seed((db) =>
      setDoc(doc(db, "users", MALLORY), { name: "Mallory", age: 33, suspendedAt: new Date() })
    );
    await assertFails(
      updateDoc(doc(asSuspended(MALLORY), "users", MALLORY), { suspendedAt: null })
    );
    await assertFails(
      updateDoc(doc(as(BOB), "users", BOB), { phoneVerified: true })
    );
    await assertFails(
      updateDoc(doc(as(ALICE), "users", ALICE), { identityVerified: true, birthDate: "1990-01-01" })
    );
  });
});

describe("verification gates every outward action", () => {
  beforeEach(() =>
    seed(async (db) => {
      await setDoc(doc(db, "users", BOB), { name: "Bob", age: 30 });
      await setDoc(doc(db, "matches", MATCH), { participants: [ALICE, BOB].sort() });
    })
  );

  const newTrip = (ownerId) => ({
    ownerId,
    destinationId: "tokyo",
    startDate: "2026-09-01",
    endDate: "2026-09-07",
    intent: "both",
  });

  test("an unverified account cannot post a trip", async () => {
    await assertFails(addDoc(collection(asUnverified(ALICE), "trips"), newTrip(ALICE)));
    await assertSucceeds(addDoc(collection(as(ALICE), "trips"), newTrip(ALICE)));
  });

  test("an unverified account cannot swipe or ask to travel together", async () => {
    await assertFails(
      setDoc(doc(asUnverified(ALICE), "swipes", `${ALICE}_${BOB}`), {
        swiperId: ALICE,
        targetId: BOB,
        direction: "like",
      })
    );
    await assertFails(
      setDoc(doc(asUnverified(ALICE), "tripRequests", `${ALICE}_${BOB}`), {
        fromUserId: ALICE,
        toUserId: BOB,
        status: "pending",
      })
    );
  });

  test("an unverified account cannot send a message", async () => {
    await assertFails(
      addDoc(collection(asUnverified(ALICE), "matches", MATCH, "messages"), {
        senderId: ALICE,
        text: "hi",
      })
    );
  });

  test("an unverified account can still browse — that is the whole funnel", async () => {
    await assertSucceeds(getDocs(collection(asUnverified(ALICE), "trips")));
    await assertSucceeds(getDoc(doc(asUnverified(ALICE), "users", BOB)));
  });

  test("the verification collections are invisible to the client", async () => {
    await seed((db) => setDoc(doc(db, "phoneVerifications", ALICE), { codeHash: "x" }));
    await seed((db) => setDoc(doc(db, "phoneHashes", "deadbeef"), { uid: ALICE }));
    await assertFails(getDoc(doc(as(ALICE), "phoneVerifications", ALICE)));
    await assertFails(setDoc(doc(as(ALICE), "phoneVerifications", ALICE), { codeHash: "mine" }));
    await assertFails(getDoc(doc(as(ALICE), "phoneHashes", "deadbeef")));
  });
});
