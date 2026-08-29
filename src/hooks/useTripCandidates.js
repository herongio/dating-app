import { useCallback, useEffect, useState } from "react";
import { findTripCandidates } from "../firebase/travelMatching";
import { useAuth } from "../context/AuthContext";
import { useBlocks } from "../context/BlockContext";

// Travellers whose trips overlap the given trips. Pass one trip for a single
// trip's list, or all of mine for the swipe deck.
export function useTripCandidates(trips) {
  const { currentUser } = useAuth();
  const { blockedIds } = useBlocks();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Trip objects are rebuilt by the snapshot listener on every change, so key
  // the fetch on their ids and dates rather than on identity.
  const signature = trips
    .map((t) => `${t.id}:${t.destinationId}:${t.startDate}:${t.endDate}:${t.intent}`)
    .join("|");

  const refresh = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setCandidates(await findTripCandidates(trips, { viewer: currentUser }));
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, signature]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Blocking filters at render time rather than in the fetch, so someone
  // disappears the moment you block them.
  return {
    candidates: candidates.filter((c) => !blockedIds.has(c.user.id)),
    loading,
    refresh,
  };
}
