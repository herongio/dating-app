import { useEffect, useState } from "react";
import { subscribeToReceivedRequests } from "../firebase/friendRequests";
import { getUserProfile } from "../firebase/users";

export function useReceivedFriendRequests(currentUser) {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToReceivedRequests(currentUser.id, async (raw) => {
      const withProfiles = await Promise.all(
        raw.map(async (r) => ({ ...r, profile: await getUserProfile(r.fromUserId) }))
      );
      setRequests(withProfiles.filter((r) => r.profile));
    });
    return unsubscribe;
  }, [currentUser]);

  return requests;
}
