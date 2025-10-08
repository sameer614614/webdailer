import { nanoid } from "nanoid";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onSnapshot, query, collection, doc, setDoc, writeBatch } from "firebase/firestore";
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
  displayName: z.string().optional(),
  voicemailNumber: z.string().optional(),
  autoRegister: z.boolean().optional(),
  provider: z.enum(["telnyx", "custom"]),
  websocketUrl: z.string().url().optional(),
  registrar: z.string().optional(),
  outboundProxy: z.string().optional(),
  isPrimary: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const TELNYX_DEFAULT_DOMAIN = "sip.telnyx.com";

const applyProviderDefaults = (profile: SipProfile): SipProfile => {
  if (profile.provider !== "telnyx") {
    return profile;
  }

  const domain = profile.domain?.trim() || TELNYX_DEFAULT_DOMAIN;
  const websocketUrl = profile.websocketUrl?.trim() || `wss://${domain}:443`;

  return {
    ...profile,
    transport: "wss",
    port: profile.port ?? 443,
    websocketUrl,
    registrar: profile.registrar?.trim() || domain,
    outboundProxy: profile.outboundProxy?.trim() || undefined,
    autoRegister: typeof profile.autoRegister === "boolean" ? profile.autoRegister : true,
  };
};

const normalizeProfile = (profile: SipProfile): SipProfile => {
  const base: SipProfile = {
    ...profile,
    provider: profile.provider ?? "telnyx",
    transport: profile.transport ?? "wss",
    isPrimary: profile.isPrimary ?? false,
    autoRegister: typeof profile.autoRegister === "boolean" ? profile.autoRegister : true,
  };
  return applyProviderDefaults(base);
};

type SipProfilesContextValue = {
  profiles: SipProfile[];
  loading: boolean;
  addProfile: (profile: Omit<SipProfile, "id">) => Promise<void>;
  updateProfile: (id: string, profile: Partial<SipProfile>) => Promise<void>;
  removeProfile: (id: string) => Promise<void>;
  setPrimaryProfile: (id: string) => Promise<void>;
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
      const data = snapshot.docs
        .map((docSnap) => normalizeProfile(docSnap.data() as SipProfile))
        .sort((a, b) => Number(b.isPrimary ?? false) - Number(a.isPrimary ?? false));
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
      const duplicate = profiles.some((existing) => existing.label.toLowerCase() === profile.label.toLowerCase());
      if (duplicate) {
        throw new Error("Profile label must be unique");
      }
      const timestamp = new Date().toISOString();
      const id = nanoid();
      const baseProfile: SipProfile = {
        id,
        provider: profile.provider ?? "telnyx",
        transport: profile.transport ?? "wss",
        autoRegister: profile.autoRegister ?? true,
        createdAt: timestamp,
        updatedAt: timestamp,
        isPrimary: profile.isPrimary,
        ...profile,
      };
      const data = applyProviderDefaults(baseProfile);
      sipProfileSchema.parse(data);

      const batch = writeBatch(firestore);
      const shouldBePrimary = data.isPrimary || !profiles.some((item) => item.isPrimary);
      const profileRef = doc(firestore, `users/${user.uid}/sipProfiles/${id}`);
      batch.set(profileRef, { ...data, isPrimary: shouldBePrimary });
      if (shouldBePrimary) {
        profiles
          .filter((item) => item.id !== id && item.isPrimary)
          .forEach((item) => {
            batch.set(doc(firestore, `users/${user.uid}/sipProfiles/${item.id}`), { isPrimary: false, updatedAt: timestamp }, { merge: true });
          });
      }
      await batch.commit();
    },
    updateProfile: async (id, profile) => {
      if (!user) throw new Error("Not authenticated");
      const existing = profiles.find((p) => p.id === id);
      if (!existing) throw new Error("Profile not found");
      if (profile.label && profile.label.toLowerCase() !== existing.label.toLowerCase()) {
        const duplicate = profiles.some(
          (item) => item.id !== id && item.label.toLowerCase() === profile.label!.toLowerCase(),
        );
        if (duplicate) {
          throw new Error("Profile label must be unique");
        }
      }

      const timestamp = new Date().toISOString();
      const merged: SipProfile = {
        ...existing,
        ...profile,
        provider: profile.provider ?? existing.provider ?? "telnyx",
        transport: profile.transport ?? existing.transport ?? "wss",
        updatedAt: timestamp,
      };
      const data = applyProviderDefaults(merged);
      sipProfileSchema.parse(data);
      await setDoc(doc(firestore, `users/${user.uid}/sipProfiles/${id}`), data, { merge: true });
    },
    removeProfile: async (id) => {
      if (!user) throw new Error("Not authenticated");
      const existing = profiles.find((item) => item.id === id);
      if (!existing) return;
      const timestamp = new Date().toISOString();
      const batch = writeBatch(firestore);
      batch.delete(doc(firestore, `users/${user.uid}/sipProfiles/${id}`));
      if (existing.isPrimary) {
        const fallback = profiles.find((item) => item.id !== id);
        if (fallback) {
          batch.set(
            doc(firestore, `users/${user.uid}/sipProfiles/${fallback.id}`),
            { isPrimary: true, updatedAt: timestamp },
            { merge: true },
          );
        }
      }
      await batch.commit();
    },
    setPrimaryProfile: async (id) => {
      if (!user) throw new Error("Not authenticated");
      const profile = profiles.find((item) => item.id === id);
      if (!profile) throw new Error("Profile not found");
      const timestamp = new Date().toISOString();
      const batch = writeBatch(firestore);
      batch.set(doc(firestore, `users/${user.uid}/sipProfiles/${id}`), { isPrimary: true, updatedAt: timestamp }, { merge: true });
      profiles
        .filter((item) => item.id !== id && item.isPrimary)
        .forEach((item) => {
          batch.set(doc(firestore, `users/${user.uid}/sipProfiles/${item.id}`), { isPrimary: false, updatedAt: timestamp }, { merge: true });
        });
      await batch.commit();
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
