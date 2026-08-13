import { useCallback, useEffect, useState } from "react";
import { listAllUsers } from "../firebase/users";
import { distanceKm } from "../utils/location";

export function useNearbyUsers(currentUser, radiusKm = 5) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!currentUser?.location) return;
    setLoading(true);
    const all = await listAllUsers();
    const nearby = all
      .filter((u) => u.id !== currentUser.id && u.location)
      .map((u) => ({ ...u, distanceKm: distanceKm(currentUser.location, u.location) }))
      .filter((u) => u.distanceKm <= radiusKm)
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

  return { users, loading, refresh };
}
