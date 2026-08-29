import { useCallback, useEffect, useState } from "react";
import { listCandidateUsers } from "../firebase/users";
import { getSwipedTargetIds } from "../firebase/swipes";
import { useAuth } from "../context/AuthContext";
import { useBlocks } from "../context/BlockContext";

export function useDiscoverPool() {
  const { currentUser } = useAuth();
  const { blockedIds } = useBlocks();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    const [candidates, swipedIds] = await Promise.all([
      listCandidateUsers(),
      getSwipedTargetIds(currentUser.id),
    ]);
    const pool = candidates.filter((u) => {
      if (u.id === currentUser.id) return false;
      if (swipedIds.has(u.id)) return false;
      if (currentUser.preferredGender && currentUser.preferredGender !== "any") {
        return u.gender === currentUser.preferredGender;
      }
      return true;
    });
    setProfiles(pool);
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Optimistic local removal after a swipe, so the deck advances instantly
  // instead of waiting on a full re-fetch from Firestore.
  function removeProfile(targetId) {
    setProfiles((prev) => prev.filter((p) => p.id !== targetId));
  }

  // Blocking filters at render time rather than in the fetch, so the card
  // disappears the moment you block instead of on the next refresh.
  return {
    profiles: profiles.filter((p) => !blockedIds.has(p.id)),
    loading,
    refresh,
    removeProfile,
  };
}
