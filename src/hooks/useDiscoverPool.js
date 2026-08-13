import { useCallback, useEffect, useState } from "react";
import { listAllUsers } from "../firebase/users";
import { getSwipedTargetIds } from "../firebase/swipes";

export function useDiscoverPool(currentUser) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    const [allUsers, swipedIds] = await Promise.all([
      listAllUsers(),
      getSwipedTargetIds(currentUser.id),
    ]);
    const pool = allUsers.filter((u) => {
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

  return { profiles, loading, refresh, removeProfile };
}
