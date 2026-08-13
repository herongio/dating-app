import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  USERS: "@dating_app/users",
  CURRENT_USER_ID: "@dating_app/current_user_id",
  SWIPES: "@dating_app/swipes",
  MATCHES: "@dating_app/matches",
  FRIEND_REQUESTS: "@dating_app/friend_requests",
  CHATS: "@dating_app/chats",
};

export async function loadJSON(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function saveJSON(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export { KEYS };
