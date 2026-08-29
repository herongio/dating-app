import { useEffect, useState } from "react";
import { subscribeToReceivedRequests } from "../firebase/friendRequests";
import { getUserProfile } from "../firebase/users";
import { useAuth } from "../context/AuthContext";
import { useBlocks } from "../context/BlockContext";

export function useReceivedFriendRequests() {
  const { currentUser } = useAuth();
  const { blockedIds } = useBlocks();
  const [requests, setRequests] = useState([]);
  const uid = currentUser?.id;

  useEffect(() => {
    if (!uid) {
      setRequests([]);
      return;
    }
    return subscribeToReceivedRequests(uid, async (raw) => {
      const withProfiles = await Promise.all(
        raw.map(async (r) => ({ ...r, profile: await getUserProfile(r.fromUserId) }))
      );
      setRequests(withProfiles.filter((r) => r.profile));
    });
  }, [uid]);

  // The rules stop a blocked user from sending new requests, but one they
  // sent before the block would otherwise linger in the list.
  return requests.filter((r) => !blockedIds.has(r.fromUserId));
}
