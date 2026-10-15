import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { subscribeToMyBlocks } from "../firebase/moderation";
import { getUserProfile } from "../firebase/users";

// Profiles of the people the signed-in user has blocked, for the unblock
// list. Deliberately not the symmetric `blockedIds` set — you can only
// undo a block you made yourself.
export function useBlockedProfiles() {
  const { currentUser } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const uid = currentUser?.id;

  useEffect(() => {
    if (!uid) {
      setProfiles([]);
      return;
    }
    return subscribeToMyBlocks(uid, async (ids) => {
      const loaded = await Promise.all(ids.map(getUserProfile));
      setProfiles(loaded.filter(Boolean));
    });
  }, [uid]);

  return profiles;
}
