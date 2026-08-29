import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { blockUser, subscribeToBlockedIds, unblockUser } from "../firebase/moderation";
import { useAuth } from "./AuthContext";

const BlockContext = createContext(null);

const EMPTY = new Set();

// One subscription for the whole app: every list screen has to hide the same
// people, and blocking has to take effect immediately on all of them.
export function BlockProvider({ children }) {
  const { currentUser } = useAuth();
  const [blockedIds, setBlockedIds] = useState(EMPTY);
  const uid = currentUser?.id;

  useEffect(() => {
    if (!uid) {
      setBlockedIds(EMPTY);
      return;
    }
    return subscribeToBlockedIds(uid, setBlockedIds);
  }, [uid]);

  const block = useCallback((otherId) => blockUser(uid, otherId), [uid]);
  const unblock = useCallback((otherId) => unblockUser(uid, otherId), [uid]);

  return (
    <BlockContext.Provider value={{ blockedIds, block, unblock }}>
      {children}
    </BlockContext.Provider>
  );
}

export function useBlocks() {
  const ctx = useContext(BlockContext);
  if (!ctx) throw new Error("useBlocks must be used within BlockProvider");
  return ctx;
}
