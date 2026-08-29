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

function as(uid) {
  return testEnv.authenticatedContext(uid).firestore();
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

describe("reports are write-only", () => {
  test("a report must name its own reporter and cannot be read back", async () => {
    await assertSucceeds(
      addDoc(collection(as(ALICE), "reports"), {
        reporterId: ALICE,
        reportedId: BOB,
        reason: "spam",
      })
    );
    await assertFails(
      addDoc(collection(as(ALICE), "reports"), {
        reporterId: MALLORY,
        reportedId: BOB,
        reason: "spam",
      })
    );
    await assertFails(getDocs(collection(as(ALICE), "reports")));
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

test("profiles stay readable to signed-in users and writable only by their owner", async () => {
  await seed((db) => setDoc(doc(db, "users", ALICE), { name: "Alice" }));
  await assertSucceeds(getDoc(doc(as(BOB), "users", ALICE)));
  await assertFails(updateDoc(doc(as(BOB), "users", ALICE), { name: "hacked" }));
  await assertSucceeds(updateDoc(doc(as(ALICE), "users", ALICE), { name: "Alice K" }));
  assert.ok(true);
});
