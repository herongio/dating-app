import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  addDays,
  datesOverlap,
  intentsOverlap,
  isDatingMatch,
  nightsBetween,
  overlapDays,
  tripStatus,
  tripsMatch,
} from "../src/utils/trips.js";

// Pure logic, no emulator needed — this is the rule that decides who ever
// sees whom, so it's worth pinning down at the edges.

const trip = (destinationId, startDate, endDate, intent = "both") => ({
  destinationId,
  startDate,
  endDate,
  intent,
});

describe("date ranges", () => {
  test("ranges that share even one day overlap", () => {
    assert.equal(
      datesOverlap({ startDate: "2026-09-01", endDate: "2026-09-05" }, { startDate: "2026-09-05", endDate: "2026-09-09" }),
      true
    );
    assert.equal(
      datesOverlap({ startDate: "2026-09-01", endDate: "2026-09-05" }, { startDate: "2026-09-06", endDate: "2026-09-09" }),
      false
    );
  });

  test("a range fully inside another overlaps, in both directions", () => {
    const wide = { startDate: "2026-09-01", endDate: "2026-09-30" };
    const narrow = { startDate: "2026-09-10", endDate: "2026-09-12" };
    assert.equal(datesOverlap(wide, narrow), true);
    assert.equal(datesOverlap(narrow, wide), true);
  });

  test("overlap is counted in days, inclusive of both ends", () => {
    assert.equal(
      overlapDays({ startDate: "2026-09-01", endDate: "2026-09-07" }, { startDate: "2026-09-05", endDate: "2026-09-12" }),
      3
    );
    assert.equal(
      overlapDays({ startDate: "2026-09-01", endDate: "2026-09-07" }, { startDate: "2026-09-07", endDate: "2026-09-09" }),
      1
    );
  });

  test("day arithmetic crosses months and years", () => {
    assert.equal(addDays("2026-08-30", 3), "2026-09-02");
    assert.equal(addDays("2026-12-30", 3), "2027-01-02");
    assert.equal(nightsBetween("2026-02-26", "2026-03-02"), 4);
  });
});

describe("intent", () => {
  test("only compatible intents meet, with 'both' as the wildcard", () => {
    assert.equal(intentsOverlap("companion", "companion"), true);
    assert.equal(intentsOverlap("dating", "dating"), true);
    assert.equal(intentsOverlap("companion", "dating"), false);
    assert.equal(intentsOverlap("both", "companion"), true);
    assert.equal(intentsOverlap("dating", "both"), true);
  });

  test("gender preference applies only when nobody is companion-only", () => {
    assert.equal(isDatingMatch("dating", "dating"), true);
    assert.equal(isDatingMatch("dating", "both"), true);
    assert.equal(isDatingMatch("companion", "both"), false);
    assert.equal(isDatingMatch("companion", "companion"), false);
  });
});

describe("tripsMatch", () => {
  const mine = trip("tokyo", "2026-09-01", "2026-09-07", "companion");

  test("matches the same destination on overlapping dates", () => {
    assert.equal(tripsMatch(mine, trip("tokyo", "2026-09-05", "2026-09-10", "companion")), true);
  });

  test("a different city never matches, however well the dates line up", () => {
    assert.equal(tripsMatch(mine, trip("osaka", "2026-09-01", "2026-09-07", "companion")), false);
  });

  test("same city on non-overlapping dates does not match", () => {
    assert.equal(tripsMatch(mine, trip("tokyo", "2026-10-01", "2026-10-07", "companion")), false);
  });

  test("same city and dates but an opposed intent does not match", () => {
    assert.equal(tripsMatch(mine, trip("tokyo", "2026-09-01", "2026-09-07", "dating")), false);
  });
});

describe("tripStatus", () => {
  const today = "2026-09-10";

  test("labels a trip by where today falls in it", () => {
    assert.equal(tripStatus(trip("tokyo", "2026-09-01", "2026-09-05"), today).past, true);
    assert.equal(tripStatus(trip("tokyo", "2026-09-08", "2026-09-12"), today).label, "여행 중");
    assert.equal(tripStatus(trip("tokyo", "2026-09-11", "2026-09-15"), today).label, "내일 출발");
    assert.equal(tripStatus(trip("tokyo", "2026-09-20", "2026-09-25"), today).label, "10일 뒤 출발");
  });

  test("a trip ending today is not past yet", () => {
    assert.equal(tripStatus(trip("tokyo", "2026-09-05", today), today).past, false);
  });
});
