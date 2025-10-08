import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useCallStore } from "../store/call-store";
import { sipClient } from "../lib/sip-client";
import { type SipProfile, type CallState } from "../types/sip";

interface CallContextValue {
  status: CallState;
  registration: "idle" | "registering" | "registered" | "error";
  activeProfile: SipProfile | null;
  remoteIdentity?: string;
  direction?: "incoming" | "outgoing";
  muted: boolean;
  error?: string;
  registerProfile: (profile: SipProfile) => Promise<void>;
  placeCall: (target: string) => Promise<void>;
  answerCall: () => void;
  hangupCall: () => void;
  mute: (muted: boolean) => void;
  toggleMute: () => void;
  transferCall: (target: string) => void;
}

const CallContext = createContext<CallContextValue | undefined>(undefined);

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const {
    status,
    activeProfile,
    remoteIdentity,
    direction,
    error,
    muted,
    setStatus,
    setActiveProfile,
    setDirection,
    setRemoteIdentity,
    setError,
    toggleMuted,
  } = useCallStore();
  const [registration, setRegistration] = useState<"idle" | "registering" | "registered" | "error">("idle");

  useEffect(() => {
    const handleRegistration = (event: { status: "registering" | "registered" | "unregistered" | "error"; error?: string }) => {
      if (event.status === "registered") {
        setRegistration("registered");
        setStatus("registered");
      } else if (event.status === "registering") {
        setRegistration("registering");
        setStatus("registering");
      } else if (event.status === "error") {
        setRegistration("error");
        setError(event.error);
        setStatus("error");
      } else {
        setRegistration("idle");
        setStatus("idle");
      }
    };

    const handleCallState = (event: { state: CallState; direction: "incoming" | "outgoing"; remoteIdentity?: string }) => {
      setStatus(event.state);
      setDirection(event.direction);
      setRemoteIdentity(event.remoteIdentity);
    };

    const handleCallError = (event: { message: string }) => {
      setError(event.message);
    };

    sipClient.on("registration:change", handleRegistration);
    sipClient.on("call:state", handleCallState);
    sipClient.on("call:error", handleCallError);

    return () => {
      sipClient.off("registration:change", handleRegistration as never);
      sipClient.off("call:state", handleCallState as never);
      sipClient.off("call:error", handleCallError as never);
    };
  }, [setDirection, setError, setRemoteIdentity, setStatus]);

  const value = useMemo<CallContextValue>(() => ({
    status,
    registration,
    activeProfile,
    remoteIdentity,
    direction,
    muted,
    error,
    registerProfile: async (profile) => {
      setActiveProfile(profile);
      await sipClient.register(profile);
    },
    placeCall: async (target) => {
      if (!activeProfile) throw new Error("No active SIP profile");
      await sipClient.call(target);
    },
    answerCall: () => {
      sipClient.answer();
    },
    hangupCall: () => {
      sipClient.hangup();
    },
    mute: (value) => {
      sipClient.mute(value);
      toggleMuted(value);
    },
    toggleMute: () => {
      const next = !muted;
      sipClient.mute(next);
      toggleMuted(next);
    },
    transferCall: (target) => {
      sipClient.transfer(target);
    },
  }), [activeProfile, direction, error, muted, registration, remoteIdentity, setActiveProfile, status, toggleMuted]);

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

export const useCallManager = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCallManager must be used within CallProvider");
  }
  return context;
};
