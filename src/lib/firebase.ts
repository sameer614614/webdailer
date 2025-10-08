import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  type Firestore,
  type QuerySnapshot,
  type DocumentData,
} from "firebase/firestore";
import { getDatabase, ref, set, onDisconnect, type Database } from "firebase/database";
import { getFunctions, httpsCallable, type Functions } from "firebase/functions";

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  databaseURL?: string;
};

const firebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const firestore: Firestore = getFirestore(app);
const realtimeDb: Database = getDatabase(app);
const functions: Functions = getFunctions(app);

if (import.meta.env.DEV) {
  const authEmulator = import.meta.env.VITE_EMULATOR_AUTH;
  const functionsEmulator = import.meta.env.VITE_EMULATOR_FUNCTIONS;
  const dbEmulatorHost = import.meta.env.VITE_EMULATOR_DATABASE;
  const firestoreEmulatorHost = import.meta.env.VITE_EMULATOR_FIRESTORE;

  if (authEmulator) {
    const [host, port] = authEmulator.split(":");
    connectAuthEmulator(auth, `http://${host}:${port}`, { disableWarnings: true });
  }

  if (functionsEmulator) {
    const [host, port] = functionsEmulator.split(":");
    functions.region = "us-central1";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (functions as any)._url = `http://${host}:${port}`;
  }

  if (dbEmulatorHost) {
    const [host, port] = dbEmulatorHost.split(":");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (realtimeDb as any)._delegate._repo.repoInfo_ = {
      host,
      port: Number(port),
      internalHost: `${host}:${port}`,
    };
  }

  if (firestoreEmulatorHost) {
    const [host, port] = firestoreEmulatorHost.split(":");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (firestore as any)._settings.host = `${host}:${port}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (firestore as any)._settings.ssl = false;
  }
}

const googleProvider = new GoogleAuthProvider();

type PresenceStatus = "online" | "offline" | "away";

const setPresence = async (user: User | null, status: PresenceStatus) => {
  if (!user) return;
  const userStatusDatabaseRef = ref(realtimeDb, `status/${user.uid}`);
  await set(userStatusDatabaseRef, {
    status,
    updatedAt: Date.now(),
  });
  onDisconnect(userStatusDatabaseRef).set({ status: "offline", updatedAt: Date.now() });
};

const subscribeToCollection = (
  path: string,
  onData: (snapshot: QuerySnapshot<DocumentData>) => void
) => {
  const q = query(collection(firestore, path));
  return onSnapshot(q, onData);
};

const upsertDocument = <T>(path: string, id: string, data: T) => {
  return setDoc(doc(firestore, path, id), data, { merge: true });
};

const updateDocument = <T>(path: string, id: string, data: Partial<T>) => {
  return updateDoc(doc(firestore, path, id), data);
};

const removeDocument = (path: string, id: string) => {
  return deleteDoc(doc(firestore, path, id));
};

const callCallable = async <Payload, Response>(name: string, payload: Payload): Promise<Response> => {
  const callable = httpsCallable<Payload, Response>(functions, name);
  const typedPayload: Payload = payload;
  const result = await callable(typedPayload);
  return result.data;
};

export {
  app,
  auth,
  firestore,
  realtimeDb,
  functions,
  googleProvider,
  signInWithPopup,
  signOut,
  setPresence,
  subscribeToCollection,
  upsertDocument,
  updateDocument,
  removeDocument,
  callCallable,
};
