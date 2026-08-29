import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { serverTimestamp } from "firebase/firestore";
import { auth } from "../firebase/config";
import { createUserProfile, getUserProfile, updateUserProfile } from "../firebase/users";
import { clearPushToken, savePushToken } from "../firebase/pushTokens";
import { registerForPushNotifications } from "../utils/notifications";
import { friendlyAuthError } from "../utils/firebaseErrors";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  // signUp() writes the Firestore profile itself and sets currentUser
  // directly — this flag stops the listener below from racing it and
  // reading the profile doc before that write has landed.
  const isSigningUp = useRef(false);

  // Expo push tokens rotate between sessions, so refresh after sign-in. It
  // doesn't block the UI and isn't fatal — a missing token just means no
  // pushes on this device.
  const syncPushToken = useCallback(async (uid) => {
    try {
      const token = await registerForPushNotifications();
      if (token) await savePushToken(uid, token);
    } catch {
      // Ignored — pushes are best-effort.
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (isSigningUp.current) return;
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        setCurrentUser(profile ? { ...profile, email: firebaseUser.email } : null);
        setIsReady(true);
        if (profile) syncPushToken(firebaseUser.uid);
      } else {
        setCurrentUser(null);
        setIsReady(true);
      }
    });
    return unsubscribe;
  }, [syncPushToken]);

  async function signUp({ email, password, name, age, gender, preferredGender, bio }) {
    const normalizedEmail = email.trim().toLowerCase();
    isSigningUp.current = true;
    try {
      let credential;
      try {
        credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      } catch (err) {
        throw friendlyAuthError(err);
      }
      const profile = {
        name: name.trim(),
        age: Number(age),
        gender,
        preferredGender,
        bio: bio.trim(),
        avatar: gender === "female" ? "👩" : "🧑",
        photoURL: null,
        travelStyles: [],
        budget: "moderate",
        pace: "balanced",
        createdAt: serverTimestamp(),
      };
      await createUserProfile(credential.user.uid, profile);
      setCurrentUser({ id: credential.user.uid, email: normalizedEmail, ...profile });
      syncPushToken(credential.user.uid);
    } finally {
      isSigningUp.current = false;
    }
  }

  async function login(email, password) {
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    } catch (err) {
      throw friendlyAuthError(err);
    }
  }

  async function logout() {
    // Drop the token first, so the next person to sign in on this device
    // doesn't receive the previous user's notifications.
    if (currentUser) {
      try {
        await clearPushToken(currentUser.id);
      } catch {
        // Ignored — signing out matters more than tidying the token.
      }
    }
    await signOut(auth);
  }

  async function updateProfile(updates) {
    if (!currentUser) return;
    await updateUserProfile(currentUser.id, updates);
    setCurrentUser((prev) => ({ ...prev, ...updates }));
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
