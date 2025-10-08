import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, setDoc } from "firebase/firestore";
import { nanoid } from "nanoid";
import { firestore } from "../lib/firebase";
import { useAuth } from "./useAuth";
import { type SipEventLog } from "../types/sip";

export const useSipEvents = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<SipEventLog[]>([]);

  useEffect(() => {
    if (!user) {
      setEvents([]);
      return;
    }
    const q = query(collection(firestore, `users/${user.uid}/events`), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => docSnap.data() as SipEventLog);
      setEvents(data);
    });
    return () => unsubscribe();
  }, [user]);

  const recordEvent = async (log: Omit<SipEventLog, "id"> & { id?: string }) => {
    if (!user) return;
    const id = log.id ?? nanoid();
    const entry: SipEventLog = { ...log, id };
    await setDoc(doc(firestore, `users/${user.uid}/events/${id}`), entry);
  };

  return { events, recordEvent };
};
