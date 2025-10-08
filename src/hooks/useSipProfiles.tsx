import { nanoid } from "nanoid";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onSnapshot, query, collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { firestore } from "../lib/firebase";
import { useAuth } from "./useAuth";
import { type SipProfile } from "../types/sip";
import { z } from "zod";

const sipProfileSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  domain: z.string().min(1),
  port: z.number().optional(),
  transport: z.enum(["udp", "tcp", "tls", "ws", "wss"]),
  outboundProxy: z.string().optional(),
  registrar: z.string().optional(),
  displayName: z.string().optional(),
  voicemailNumber: z.string().optional(),
  autoRegister: z.boolean().optional(),
});

type SipProfilesContextValue = {
  profiles: SipProfile[];
  loading: boolean;
  addProfile: (profile: Omit<SipProfile, "id">) => Promise<void>;
  updateProfile: (id: string, profile: Partial<SipProfile>) => Promise<void>;
  removeProfile: (id: string) => Promise<void>;
};

const SipProfilesContext = createContext<SipProfilesContextValue | undefined>(undefined);

export const SipProfilesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<SipProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfiles([]);
      setLoading(false);
      return;
    }
    const q = query(collection(firestore, `users/${user.uid}/sipProfiles`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => docSnap.data() as SipProfile);
      setProfiles(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const value = useMemo<SipProfilesContextValue>(() => ({
    profiles,
    loading,
    addProfile: async (profile) => {
      if (!user) throw new Error("Not authenticated");
      const id = nanoid();
      const data: SipProfile = { id, ...profile };
      sipProfileSchema.parse(data);
      await setDoc(doc(firestore, `users/${user.uid}/sipProfiles/${id}`), data);
    },
    updateProfile: async (id, profile) => {
      if (!user) throw new Error("Not authenticated");
      const existing = profiles.find((p) => p.id === id);
      if (!existing) throw new Error("Profile not found");
      const updated = { ...existing, ...profile } as SipProfile;
      sipProfileSchema.parse(updated);
      await setDoc(doc(firestore, `users/${user.uid}/sipProfiles/${id}`), updated, { merge: true });
    },
    removeProfile: async (id) => {
      if (!user) throw new Error("Not authenticated");
      await deleteDoc(doc(firestore, `users/${user.uid}/sipProfiles/${id}`));
    },
  }), [profiles, loading, user]);

  return <SipProfilesContext.Provider value={value}>{children}</SipProfilesContext.Provider>;
};

export const useSipProfiles = () => {
  const context = useContext(SipProfilesContext);
  if (!context) {
    throw new Error("useSipProfiles must be used within SipProfilesProvider");
  }
  return context;
};
