import { initializeApp, getApps, cert } from "firebase-admin/app";
import { auth } from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const apps = getApps();

if (!apps.length) {
  // Check if we have all required credentials
  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY
  ) {
    console.error(
      "Firebase admin credentials are missing. Some functionality may be limited."
    );
    // Initialize with a minimal config to prevent crashes
    initializeApp();
  } else {
    try {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
        storageBucket: "aanit-app.firebasestorage.app",
      });
    } catch (error) {
      console.error("Failed to initialize Firebase Admin:", error);
      // Initialize with a minimal config to prevent crashes
      initializeApp();
    }
  }
}

export async function verifyAuth(
  options: {
    checkAdmin?: boolean;
    authHeader?: string | null;
  } = { checkAdmin: false, authHeader: null }
) {
  const authorization = options.authHeader;

  if (!authorization?.startsWith("Bearer ")) {
    console.log(
      "Unauthorized because no authorization header: ",
      authorization
    );
    return { error: "Unauthorized", status: 401 };
  }

  try {
    const token = authorization.split("Bearer ")[1];
    const decodedToken = await auth().verifyIdToken(token);

    // Get user's custom claims to check admin status
    const userRecord = await auth().getUser(decodedToken.uid);
    const isAdmin = userRecord.customClaims?.isAdmin === true;

    if (options.checkAdmin && !isAdmin) {
      return { error: "Unauthorized", status: 403 };
    }

    return {
      uid: decodedToken.uid,
      isAdmin,
    };
  } catch (error) {
    console.error("Auth error:", error);
    return { error: "Invalid token", status: 401 };
  }
}

export function getAdminFirestore() {
  return getFirestore();
}
