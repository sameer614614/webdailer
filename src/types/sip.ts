export type SipTransport = "udp" | "tcp" | "tls" | "ws" | "wss";

export interface SipProfile {
  id: string;
  label: string;
  username: string;
  password: string;
  domain: string;
  port?: number;
  transport: SipTransport;
  displayName?: string;
  voicemailNumber?: string;
  autoRegister?: boolean;
}

export interface CallLogEntry {
  id: string;
  profileId: string;
  direction: "incoming" | "outgoing";
  peer: string;
  startedAt: string;
  durationSeconds?: number;
  status: "answered" | "missed" | "declined" | "failed";
  recordingUrl?: string;
  notes?: string;
}

export type CallState =
  | "idle"
  | "registering"
  | "registered"
  | "calling"
  | "ringing"
  | "active"
  | "held"
  | "ended"
  | "error";
