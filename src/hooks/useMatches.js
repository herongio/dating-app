import { useEffect, useState } from "react";
import { subscribeToMatches } from "../firebase/matches";
import { getUserProfile } from "../firebase/users";

export function useMatches(currentUser) {
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToMatches(currentUser.id, async (rawMatches) => {
      const withProfiles = await Promise.all(
        rawMatches.map(async (m) => {
          const otherId = m.participants.find((id) => id !== currentUser.id);
          const profile = await getUserProfile(otherId);
          return { ...m, profile };
        })
      );
      setMatches(withProfiles.filter((m) => m.profile));
    });
    return unsubscribe;
  }, [currentUser]);

  return matches;
}
