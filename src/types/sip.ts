export type SipTransport = "udp" | "tcp" | "tls" | "ws" | "wss";

export type SipProvider = "telnyx" | "custom";

export interface SipProfile {
  id: string;
  label: string;
  username: string;
  password: string;
  domain: string;
  transport: SipTransport;
  port?: number;
  displayName?: string;
  voicemailNumber?: string;
  autoRegister?: boolean;
  provider: SipProvider;
  websocketUrl?: string;
  registrar?: string;
  outboundProxy?: string;
  isPrimary?: boolean;
  createdAt?: string;
  updatedAt?: string;
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

export interface SipEventLog {
  id: string;
  profileId?: string;
  type: "registration" | "call";
  level: "info" | "warning" | "error";
  message: string;
  context?: string;
  createdAt: string;
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
