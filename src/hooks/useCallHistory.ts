import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, setDoc } from "firebase/firestore";
import { firestore } from "../lib/firebase";
import { useAuth } from "./useAuth";
import { type CallLogEntry } from "../types/sip";

export const useCallHistory = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<CallLogEntry[]>([]);

  useEffect(() => {
    if (!user) {
      setLogs([]);
      return;
    }
    const q = query(collection(firestore, `users/${user.uid}/callLogs`), orderBy("startedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => docSnap.data() as CallLogEntry);
      setLogs(data);
    });
    return () => unsubscribe();
  }, [user]);

  const appendLog = async (log: CallLogEntry) => {
    if (!user) return;
    await setDoc(doc(firestore, `users/${user.uid}/callLogs/${log.id}`), log);
  };

  return { logs, appendLog };
};
