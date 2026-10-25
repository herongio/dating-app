import { listTripsAtDestination } from "./trips";
import { getUserProfile } from "./users";
import { isDatingMatch, overlapDays, tripsMatch } from "../utils/trips";

// A gender preference is only meaningful when at least one side is open to
// dating; two people looking purely for a travel buddy shouldn't be filtered
// apart by it. When it does apply, it applies both ways.
function preferenceAllows(viewer, other) {
  if (!viewer?.preferredGender || viewer.preferredGender === "any") return true;
  return other.gender === viewer.preferredGender;
}

// For every trip I've planned, find everyone else heading to the same place
// on overlapping dates with a compatible intent. A person appears once, via
// whichever of my trips overlaps theirs the most — that's the trip worth
// showing them under.
export async function findTripCandidates(myTrips, { viewer, excludeIds = new Set() } = {}) {
  if (myTrips.length === 0) return [];

  const destinations = [...new Set(myTrips.map((t) => t.destinationId))];
  const trips = (await Promise.all(destinations.map(listTripsAtDestination))).flat();

  const best = new Map();
  for (const myTrip of myTrips) {
    for (const theirTrip of trips) {
      if (theirTrip.ownerId === myTrip.ownerId) continue;
      if (excludeIds.has(theirTrip.ownerId)) continue;
      if (!tripsMatch(myTrip, theirTrip)) continue;

      const days = overlapDays(myTrip, theirTrip);
      const current = best.get(theirTrip.ownerId);
      if (!current || days > current.overlapDays) {
        best.set(theirTrip.ownerId, { myTrip, trip: theirTrip, overlapDays: days });
      }
    }
  }

  const candidates = await Promise.all(
    [...best.values()].map(async (c) => ({ ...c, user: await getUserProfile(c.trip.ownerId) }))
  );

  return candidates
    .filter((c) => c.user)
    // A suspended account keeps its trips — undoing a wrong suspension should
    // not also delete someone's travel plans — so it is filtered out here, on
    // the profile that was fetched anyway. Doing it in the query would need a
    // third filter and a new composite index for no extra safety.
    .filter((c) => !c.user.suspendedAt)
    .filter((c) => {
      if (!isDatingMatch(c.myTrip.intent, c.trip.intent)) return true;
      return preferenceAllows(viewer, c.user) && preferenceAllows(c.user, viewer);
    })
    .sort((a, b) => b.overlapDays - a.overlapDays || a.trip.startDate.localeCompare(b.trip.startDate));
}
