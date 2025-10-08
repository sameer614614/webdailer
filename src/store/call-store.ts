import { create } from "zustand";
import { type CallState, type SipProfile } from "../types/sip";

interface CallStoreState {
  status: CallState;
  activeProfile: SipProfile | null;
  remoteIdentity?: string;
  direction?: "incoming" | "outgoing";
  error?: string;
  muted: boolean;
  setStatus: (status: CallState) => void;
  setActiveProfile: (profile: SipProfile | null) => void;
  setRemoteIdentity: (remoteIdentity?: string) => void;
  setDirection: (direction?: "incoming" | "outgoing") => void;
  setError: (error?: string) => void;
  toggleMuted: (muted?: boolean) => void;
  reset: () => void;
}

const initialState = {
  status: "idle" as CallState,
  activeProfile: null,
  remoteIdentity: undefined,
  direction: undefined,
  error: undefined,
  muted: false,
};

export const useCallStore = create<CallStoreState>((set) => ({
  ...initialState,
  setStatus: (status) => set({ status }),
  setActiveProfile: (profile) => set({ activeProfile: profile }),
  setRemoteIdentity: (remoteIdentity) => set({ remoteIdentity }),
  setDirection: (direction) => set({ direction }),
  setError: (error) => set({ error }),
  toggleMuted: (muted) => set((state) => ({ muted: typeof muted === "boolean" ? muted : !state.muted })),
  reset: () => set(initialState),
}));
