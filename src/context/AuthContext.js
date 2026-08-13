import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { serverTimestamp } from "firebase/firestore";
import { auth } from "../firebase/config";
import { createUserProfile, getUserProfile, updateUserProfile } from "../firebase/users";
import { getCurrentLocation } from "../utils/location";
import { friendlyAuthError } from "../utils/firebaseErrors";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  // signUp() writes the Firestore profile itself and sets currentUser
  // directly — this flag stops the listener below from racing it and
  // reading the profile doc before that write has landed.
  const isSigningUp = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (isSigningUp.current) return;
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        setCurrentUser(profile ? { ...profile, email: firebaseUser.email } : null);
      } else {
        setCurrentUser(null);
      }
      setIsReady(true);
    });
    return unsubscribe;
  }, []);

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
      const location = await getCurrentLocation();
      const profile = {
        name: name.trim(),
        age: Number(age),
        gender,
        preferredGender,
        bio: bio.trim(),
        interests: [],
        avatar: gender === "female" ? "👩" : "🧑",
        location,
        createdAt: serverTimestamp(),
      };
      await createUserProfile(credential.user.uid, profile);
      setCurrentUser({ id: credential.user.uid, email: normalizedEmail, ...profile });
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
