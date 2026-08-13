import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { MOCK_USERS } from "../data/mockUsers";
import { KEYS, loadJSON, saveJSON } from "../utils/storage";
import { distanceKm } from "../utils/location";

const AppDataContext = createContext(null);

function chatIdFor(a, b) {
  return [a, b].sort().join("_");
}

// Deterministic pseudo-"does this mock profile like me back" check, so the
// same profile always resolves the same way for a given viewer instead of
// flipping randomly on every swipe.
function mockLikesBack(viewerId, targetId) {
  const combined = `${viewerId}:${targetId}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash * 31 + combined.charCodeAt(i)) % 100;
  }
  return hash < 70; // ~70% of mock profiles "like back"
}

export function AppDataProvider({ children }) {
  const { currentUser } = useAuth();
  const [swipes, setSwipes] = useState({});
  const [matches, setMatches] = useState({});
  const [friendRequests, setFriendRequests] = useState([]);
  const [chats, setChats] = useState({});

  useEffect(() => {
    (async () => {
      setSwipes(await loadJSON(KEYS.SWIPES, {}));
      setMatches(await loadJSON(KEYS.MATCHES, {}));
      setFriendRequests(await loadJSON(KEYS.FRIEND_REQUESTS, []));
      setChats(await loadJSON(KEYS.CHATS, {}));
    })();
  }, []);

  function findProfile(userId) {
    return MOCK_USERS.find((u) => u.id === userId) ?? null;
  }

  function createMatch(targetUser, source) {
    if (!currentUser) return null;
    const myMatches = matches[currentUser.id] ?? [];
    if (myMatches.some((m) => m.userId === targetUser.id)) {
      return myMatches.find((m) => m.userId === targetUser.id);
    }

    const match = {
      id: chatIdFor(currentUser.id, targetUser.id),
      userId: targetUser.id,
      source,
      matchedAt: Date.now(),
    };
    const nextMatches = { ...matches, [currentUser.id]: [...myMatches, match] };
    setMatches(nextMatches);
    saveJSON(KEYS.MATCHES, nextMatches);
    return match;
  }

  function getDiscoverPool() {
    if (!currentUser) return [];
    const mySwipes = swipes[currentUser.id] ?? {};
    return MOCK_USERS.filter((u) => {
      if (mySwipes[u.id]) return false;
      if (currentUser.preferredGender && currentUser.preferredGender !== "any") {
        return u.gender === currentUser.preferredGender;
      }
      return true;
    });
  }

  function swipe(targetUser, direction) {
    if (!currentUser) return { matched: false };
    const mySwipes = { ...(swipes[currentUser.id] ?? {}), [targetUser.id]: direction };
    const nextSwipes = { ...swipes, [currentUser.id]: mySwipes };
    setSwipes(nextSwipes);
    saveJSON(KEYS.SWIPES, nextSwipes);

    if (direction === "like" && mockLikesBack(currentUser.id, targetUser.id)) {
      createMatch(targetUser, "swipe");
      return { matched: true };
    }
    return { matched: false };
  }

  // "근처 이상형 검색 시 바로 친구 신청" — skips the swipe queue entirely.
  // There's no real second device to accept the request in this mock
  // environment, so the request resolves to an instant match, same as a
  // real accepted friend request would.
  function sendFriendRequest(targetUser) {
    if (!currentUser) return null;
    const request = {
      id: `fr-${Date.now()}`,
      fromUserId: currentUser.id,
      toUserId: targetUser.id,
      status: "accepted",
      createdAt: Date.now(),
    };
    const nextRequests = [...friendRequests, request];
    setFriendRequests(nextRequests);
    saveJSON(KEYS.FRIEND_REQUESTS, nextRequests);
    return createMatch(targetUser, "nearby");
  }

  function hasSentRequestTo(targetUserId) {
    if (!currentUser) return false;
    return friendRequests.some(
      (r) => r.fromUserId === currentUser.id && r.toUserId === targetUserId
    );
  }

  function getMatches() {
    if (!currentUser) return [];
    const myMatches = matches[currentUser.id] ?? [];
    return myMatches
      .map((m) => ({ ...m, profile: findProfile(m.userId) }))
      .filter((m) => m.profile)
      .sort((a, b) => b.matchedAt - a.matchedAt);
  }

  function getChatMessages(matchId) {
    return chats[matchId] ?? [];
  }

  function sendMessage(matchId, text) {
    if (!currentUser || !text.trim()) return;
    const message = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      text: text.trim(),
      createdAt: Date.now(),
    };
    const nextMessages = [...(chats[matchId] ?? []), message];
    const nextChats = { ...chats, [matchId]: nextMessages };
    setChats(nextChats);
    saveJSON(KEYS.CHATS, nextChats);
  }

  function getNearbyUsers(radiusKm = 5) {
    if (!currentUser?.location) return [];
    return MOCK_USERS.map((u) => ({
      ...u,
      distanceKm: distanceKm(currentUser.location, u.location),
    }))
      .filter((u) => u.distanceKm <= radiusKm)
      .filter((u) => {
        if (currentUser.preferredGender && currentUser.preferredGender !== "any") {
          return u.gender === currentUser.preferredGender;
        }
        return true;
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  return (
    <AppDataContext.Provider
      value={{
        getDiscoverPool,
        swipe,
        sendFriendRequest,
        hasSentRequestTo,
        getMatches,
        getChatMessages,
        sendMessage,
        getNearbyUsers,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
