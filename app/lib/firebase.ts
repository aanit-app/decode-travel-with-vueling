import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "vueling-turnaround.firebaseapp.com",
  projectId: "vueling-turnaround",
  storageBucket: "vueling-turnaround.firebasestorage.app",
  databaseURL: "https://vueling-turnaround-default-rtdb.europe-west1.firebasedatabase.app",
  messagingSenderId: "528133488994",
  appId: "1:528133488994:web:58dad1f6abfa6b65e6ec3b",
  measurementId: "G-PQT2KYTZR1",
};

// Initialize Firebase
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Set persistence and other auth settings (only on client)
if (typeof window !== "undefined") {
  auth.useDeviceLanguage();
}

const getToken = async () => {
  const user = await auth.currentUser;
  return user?.getIdToken();
};

export { app, auth, db, storage, getToken };
