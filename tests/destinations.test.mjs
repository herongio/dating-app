import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  DESTINATIONS,
  LAUNCH_DESTINATION_IDS,
  availableDestinations,
  destinationById,
  isLaunchDestination,
  searchDestinations,
} from "../src/data/destinations.js";

// The launch scope is the app's density throttle, so the thing worth pinning
// down is that narrowing what people can *pick* never breaks what has already
// been *written*.

describe("launch scope", () => {
  test("only the launch corridor is offered for a new trip", () => {
    assert.deepEqual(
      availableDestinations().map((d) => d.id).sort(),
      [...LAUNCH_DESTINATION_IDS].sort()
    );
  });

  test("every launch id exists in the full catalog", () => {
    for (const id of LAUNCH_DESTINATION_IDS) {
      assert.ok(destinationById(id), `${id} missing from DESTINATIONS`);
      assert.equal(isLaunchDestination(id), true);
    }
  });

  test("the resolver still answers for cities outside the corridor", () => {
    // Trips written before the scope narrowed must keep rendering their city
    // name, or every old trip card reads as a blank destination.
    assert.equal(destinationById("paris").name, "파리");
    assert.equal(destinationById("jeju").name, "제주");
    assert.equal(isLaunchDestination("paris"), false);
  });

  test("editing an out-of-scope trip keeps its own city selectable", () => {
    const ids = availableDestinations("paris").map((d) => d.id);
    assert.ok(ids.includes("paris"));
    assert.equal(ids.length, LAUNCH_DESTINATION_IDS.length + 1);
  });

  test("search never reaches outside the offered pool", () => {
    assert.deepEqual(searchDestinations("프랑스").map((d) => d.id), []);
    assert.deepEqual(searchDestinations("도쿄").map((d) => d.id), ["tokyo"]);
  });

  test("an unknown id resolves to null rather than throwing", () => {
    assert.equal(destinationById("atlantis"), null);
  });

  test("catalog ids are unique", () => {
    const ids = DESTINATIONS.map((d) => d.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});
