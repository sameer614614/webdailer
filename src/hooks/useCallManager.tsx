import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useCallStore } from "../store/call-store";
import { sipClient } from "../lib/sip-client";
import { type SipProfile, type CallState } from "../types/sip";
import { useSipEvents } from "./useSipEvents";

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
  const registrationStatusRef = useRef<"registering" | "registered" | "unregistered" | "error" | null>(null);
  const { recordEvent } = useSipEvents();

  useEffect(() => {
    const handleRegistration = (event: {
      status: "registering" | "registered" | "unregistered" | "error";
      error?: string;
      profile?: SipProfile | null;
    }) => {
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

      if (registrationStatusRef.current !== event.status) {
        registrationStatusRef.current = event.status;
        if (event.status === "registered" && event.profile) {
          void recordEvent({
            type: "registration",
            level: "info",
            message: `Registered with ${event.profile.label}`,
            profileId: event.profile.id,
            createdAt: new Date().toISOString(),
          }).catch(console.error);
        }
        if (event.status === "error") {
          void recordEvent({
            type: "registration",
            level: "error",
            message: `Registration failed${event.error ? `: ${event.error}` : ""}`,
            profileId: event.profile?.id,
            createdAt: new Date().toISOString(),
            context: event.profile ? `${event.profile.username}@${event.profile.domain}` : undefined,
          }).catch(console.error);
        }
      }
    };

    const handleCallState = (event: {
      state: CallState;
      direction: "incoming" | "outgoing";
      remoteIdentity?: string;
      profile?: SipProfile | null;
    }) => {
      setStatus(event.state);
      setDirection(event.direction);
      setRemoteIdentity(event.remoteIdentity);
      if (event.state === "ended" && event.profile) {
        void recordEvent({
          type: "call",
          level: "info",
          message: `Call with ${event.remoteIdentity ?? "unknown"} ended`,
          profileId: event.profile.id,
          createdAt: new Date().toISOString(),
        }).catch(console.error);
      }
    };

    const handleCallError = (event: { message: string; profile?: SipProfile | null }) => {
      setError(event.message);
      void recordEvent({
        type: "call",
        level: "error",
        message: `Call error: ${event.message}`,
        profileId: event.profile?.id,
        createdAt: new Date().toISOString(),
      }).catch(console.error);
    };

    sipClient.on("registration:change", handleRegistration);
    sipClient.on("call:state", handleCallState);
    sipClient.on("call:error", handleCallError);

    return () => {
      sipClient.off("registration:change", handleRegistration as never);
      sipClient.off("call:state", handleCallState as never);
      sipClient.off("call:error", handleCallError as never);
    };
  }, [recordEvent, setDirection, setError, setRemoteIdentity, setStatus]);

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
      const destination = await sipClient.call(target);
      await recordEvent({
        type: "call",
        level: "info",
        message: `Dialling ${destination}`,
        profileId: activeProfile.id,
        createdAt: new Date().toISOString(),
      }).catch(console.error);
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
  }), [
    activeProfile,
    direction,
    error,
    muted,
    recordEvent,
    registration,
    remoteIdentity,
    setActiveProfile,
    status,
    toggleMuted,
  ]);

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

export const useCallManager = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCallManager must be used within CallProvider");
  }
  return context;
};
