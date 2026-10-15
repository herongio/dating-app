import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { subscribeToMatches } from "../firebase/matches";
import { getUserProfile } from "../firebase/users";
import { useAuth } from "./AuthContext";
import { useBlocks } from "./BlockContext";

const MatchesContext = createContext(null);

// Matches are created by Cloud Functions now, so a match can land at any
// moment rather than as the return value of the swipe that caused it. This
// provider owns the single subscription and announces anything new, which is
// why the alert lives here instead of in the swipe or nearby screens.
export function MatchesProvider({ children }) {
  const { currentUser } = useAuth();
  const { blockedIds } = useBlocks();
  const [matches, setMatches] = useState([]);
  // null until the first snapshot — that one is existing history, not news.
  const seenIds = useRef(null);
  const uid = currentUser?.id;

  useEffect(() => {
    seenIds.current = null;
    if (!uid) {
      setMatches([]);
      return;
    }

    return subscribeToMatches(uid, async (rawMatches) => {
      const withProfiles = await Promise.all(
        rawMatches.map(async (match) => {
          const otherId = match.participants.find((id) => id !== uid);
          return { ...match, profile: await getUserProfile(otherId) };
        })
      );
      const next = withProfiles.filter((match) => match.profile);
      setMatches(next);

      const seen = seenIds.current;
      seenIds.current = new Set(next.map((match) => match.id));
      if (!seen) return;
      next
        .filter((match) => !seen.has(match.id))
        .forEach((match) =>
          Alert.alert(
            "매칭 성공! 💕",
            `${match.profile.name}님과 매칭됐어요. 채팅 탭에서 대화를 시작해보세요.`
          )
        );
    });
  }, [uid]);

  const visible = matches.filter((match) => !blockedIds.has(match.profile.id));

  return <MatchesContext.Provider value={visible}>{children}</MatchesContext.Provider>;
}

export function useMatches() {
  const ctx = useContext(MatchesContext);
  if (!ctx) throw new Error("useMatches must be used within MatchesProvider");
  return ctx;
}
