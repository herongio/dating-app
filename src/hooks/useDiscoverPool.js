import { useEffect, useState } from "react";
import { getSwipedTargetIds } from "../firebase/swipes";
import { useAuth } from "../context/AuthContext";
import { useMyTrips } from "./useMyTrips";
import { useTripCandidates } from "./useTripCandidates";

// The swipe deck is now "everyone whose plans overlap mine" — so with no
// upcoming trip there is nothing to show, and the screen says so instead of
// pretending the app is empty.
export function useDiscoverPool() {
  const { currentUser } = useAuth();
  const { upcoming, loading: tripsLoading } = useMyTrips();
  const { candidates, loading } = useTripCandidates(upcoming);
  const [swipedIds, setSwipedIds] = useState(null);
  const [dismissed, setDismissed] = useState(() => new Set());
  const uid = currentUser?.id;

  useEffect(() => {
    if (!uid) return;
    let active = true;
    getSwipedTargetIds(uid).then((ids) => {
      if (active) setSwipedIds(ids);
    });
    return () => {
      active = false;
    };
  }, [uid]);

  // Optimistic local removal after a swipe, so the deck advances instantly
  // instead of waiting on a re-fetch.
  function removeCandidate(userId) {
    setDismissed((prev) => new Set(prev).add(userId));
  }

  return {
    candidates: candidates.filter(
      (c) => !swipedIds?.has(c.user.id) && !dismissed.has(c.user.id)
    ),
    loading: tripsLoading || loading || swipedIds === null,
    hasTrips: upcoming.length > 0,
    removeCandidate,
  };
}
