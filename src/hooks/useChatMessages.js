import { useEffect, useState } from "react";
import { subscribeToMessages } from "../firebase/chats";

export function useChatMessages(matchId) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!matchId) return;
    const unsubscribe = subscribeToMessages(matchId, setMessages);
    return unsubscribe;
  }, [matchId]);

  return messages;
}
