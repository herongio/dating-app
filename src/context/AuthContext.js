import { createContext, useContext, useEffect, useState } from "react";
import { KEYS, loadJSON, saveJSON } from "../utils/storage";
import { getCurrentLocation } from "../utils/location";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      const storedUsers = await loadJSON(KEYS.USERS, []);
      const currentId = await loadJSON(KEYS.CURRENT_USER_ID, null);
      setUsers(storedUsers);
      if (currentId) {
        setCurrentUser(storedUsers.find((u) => u.id === currentId) ?? null);
      }
      setIsReady(true);
    })();
  }, []);

  async function persistUsers(nextUsers) {
    setUsers(nextUsers);
    await saveJSON(KEYS.USERS, nextUsers);
  }

  async function signUp({ email, password, name, age, gender, preferredGender, bio }) {
    const normalizedEmail = email.trim().toLowerCase();
    if (users.some((u) => u.email === normalizedEmail)) {
      throw new Error("이미 가입된 이메일이에요.");
    }

    const location = await getCurrentLocation();
    const newUser = {
      id: `me-${Date.now()}`,
      email: normalizedEmail,
      password,
      name: name.trim(),
      age: Number(age),
      gender,
      preferredGender,
      bio: bio.trim(),
      interests: [],
      avatar: gender === "female" ? "👩" : "🧑",
      location,
    };

    const nextUsers = [...users, newUser];
    await persistUsers(nextUsers);
    await saveJSON(KEYS.CURRENT_USER_ID, newUser.id);
    setCurrentUser(newUser);
    return newUser;
  }

  async function login(email, password) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = users.find((u) => u.email === normalizedEmail);
    if (!user || user.password !== password) {
      throw new Error("이메일 또는 비밀번호가 올바르지 않아요.");
    }
    await saveJSON(KEYS.CURRENT_USER_ID, user.id);
    setCurrentUser(user);
    return user;
  }

  async function logout() {
    await saveJSON(KEYS.CURRENT_USER_ID, null);
    setCurrentUser(null);
  }

  async function updateProfile(updates) {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    const nextUsers = users.map((u) => (u.id === updated.id ? updated : u));
    await persistUsers(nextUsers);
    setCurrentUser(updated);
  }

  return (
    <AuthContext.Provider
      value={{ isReady, currentUser, signUp, login, logout, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
