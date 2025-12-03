// backend/src/users/firebasesetup.ts (or similar)
import admin from "firebase-admin";

let firestore: FirebaseFirestore.Firestore | null = null;

try {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKeyRaw) {
      console.error(
        "[firebasesetup] Missing one or more FIREBASE_* env vars; Firestore will be null.",
        {
          hasProjectId: !!projectId,
          hasClientEmail: !!clientEmail,
          hasPrivateKey: !!privateKeyRaw,
        }
      );
    } else {
      const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

      console.log("[firebasesetup] Firebase Admin initialized");
      firestore = admin.firestore();
    }
  } else {
    firestore = admin.firestore();
  }
} catch (err) {
  console.error("[firebasesetup] Error initializing Firebase Admin:", err);
  firestore = null;
}

export { firestore };
