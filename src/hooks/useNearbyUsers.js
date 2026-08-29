import { useCallback, useEffect, useState } from "react";
import { listUsersNear } from "../firebase/users";
import { useAuth } from "../context/AuthContext";
import { useBlocks } from "../context/BlockContext";

export function useNearbyUsers(radiusKm = 5) {
  const { currentUser } = useAuth();
  const { blockedIds } = useBlocks();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!currentUser?.location) return;
    setLoading(true);
    // Gender is filtered here rather than in the query: combining it with the
    // geohash range would need a composite index, and the radius has already
    // cut the result set down to something small.
    const nearby = (await listUsersNear(currentUser.location, radiusKm))
      .filter((u) => u.id !== currentUser.id)
      .filter((u) => {
        if (currentUser.preferredGender && currentUser.preferredGender !== "any") {
          return u.gender === currentUser.preferredGender;
        }
        return true;
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
    setUsers(nearby);
    setLoading(false);
  }, [currentUser, radiusKm]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { users: users.filter((u) => !blockedIds.has(u.id)), loading, refresh };
}
