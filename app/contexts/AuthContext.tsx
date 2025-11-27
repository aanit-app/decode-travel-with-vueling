"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInAnonymously as firebaseSignInAnonymously,
  User,
} from "firebase/auth";
import { auth } from "../lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
  isAnonymous: boolean;
  getToken: () => Promise<string | null>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const TOKEN_KEY = "auth_token";
const TOKEN_EXPIRY_KEY = "auth_token_expiry";
const TOKEN_EXPIRY_MINUTES = 5;

// Helper function to set auth cookie
const setAuthCookie = async (user: User) => {
  const token = await user.getIdToken();
  document.cookie = `auth=${token}; path=/; max-age=3600; secure; samesite=strict`;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (user) {
        // Get the ID token with fresh claims
        const idTokenResult = await user.getIdTokenResult(true);
        setIsAdmin(!!idTokenResult.claims.isAdmin);
        setIsAnonymous(user.isAnonymous);
        // Set cookie whenever user state changes
        await setAuthCookie(user);
      } else {
        setIsAdmin(false);
        setIsAnonymous(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    await setAuthCookie(userCredential.user);
    setIsAnonymous(false);
  };

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
    setIsAnonymous(false);
  };

  const signInAnonymously = async () => {
    // Only sign in anonymously if there's no current user
    if (auth.currentUser) {
      return;
    }
    
    try {
      const userCredential = await firebaseSignInAnonymously(auth);
      await setAuthCookie(userCredential.user);
      setIsAnonymous(true);
    } catch (error) {
      console.error("Error signing in anonymously:", error);
      throw error;
    }
  };

  const signOut = async () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    document.cookie = `auth=; path=/; max-age=0; secure; samesite=strict`;
    await firebaseSignOut(auth);
    setIsAnonymous(false);
  };

  const deleteAccount = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error deleting account:", error);
      throw error;
    }
  };

  const getToken = async (): Promise<string | null> => {
    try {
      if (!auth.currentUser) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        setIsAnonymous(true);
      }

      if (!auth.currentUser) {
        return null;
      }

      // Check if we have a stored token and expiry time
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
      const now = Date.now();

      // If token exists and is not expired, return it
      if (storedToken && expiryTime && now < parseInt(expiryTime)) {
        return storedToken;
      }

      // Get a fresh token
      const newToken = await auth.currentUser.getIdToken(true);

      // Store the new token with expiry time (default Firebase tokens expire in 1 hour)
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(
        TOKEN_EXPIRY_KEY,
        (now + TOKEN_EXPIRY_MINUTES * 60 * 1000).toString()
      );

      return newToken;
    } catch (error) {
      console.error("Error getting token:", error);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        signIn,
        signUp,
        signInAnonymously,
        signOut,
        deleteAccount,
        getToken,
        isAnonymous,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
