/* eslint-disable @typescript-eslint/no-explicit-any */
import JsSIP from "jssip";
import { type SipProfile, type CallState } from "../types/sip";
import { TELNYX_DEFAULT_COUNTRY_CODE } from "../constants/telnyx";

type SipClientEventMap = {
  "registration:change": {
    status: "registering" | "registered" | "unregistered" | "error";
    error?: string;
    profile?: SipProfile | null;
  };
  "call:state": {
    state: CallState;
    direction: "incoming" | "outgoing";
    remoteIdentity?: string;
    session?: any;
    profile?: SipProfile | null;
  };
  "call:ended": { reason?: string; profile?: SipProfile | null };
  "call:error": { message: string; profile?: SipProfile | null };
};

export type SipClientEvent = keyof SipClientEventMap;

type Listener<K extends SipClientEvent> = (event: SipClientEventMap[K]) => void;

export class SipClient {
  private ua: JsSIP.UA | null = null;
  private currentSession: JsSIP.RTCSession | null = null;
  private readonly eventTarget = new EventTarget();
  private profile: SipProfile | null = null;
  private readonly listenerMap = new Map<SipClientEvent, Map<Listener<any>, (event: Event) => void>>();

  async register(profile: SipProfile) {
    this.profile = profile;
    this.emit("registration:change", { status: "registering", profile });

    if (this.ua) {
      this.ua.stop();
      this.ua = null;
    }

    const transport = profile.transport === "wss" || profile.transport === "ws" ? profile.transport : "wss";
    const port = profile.port ?? (transport === "wss" ? 443 : 5060);
    const socketUrl = profile.websocketUrl ?? `${transport}://${profile.domain}:${port}`;
    const socket = new JsSIP.WebSocketInterface(socketUrl);

    const configuration: JsSIP.UAConfiguration = {
      sockets: [socket],
      uri: `sip:${profile.username}@${profile.domain}`,
      password: profile.password,
      authorization_user: profile.username,
      display_name: profile.displayName ?? profile.label,
      contact_uri: `sip:${profile.username}@${profile.domain}`,
      registrar_server: profile.registrar ?? profile.domain,
      session_timers: false,
      register: profile.autoRegister ?? true,
    };

    if (profile.outboundProxy) {
      (configuration as Record<string, unknown>).outbound_proxy_set = profile.outboundProxy;
    }

    (configuration as Record<string, unknown>).connection_recovery_max_interval = 30;
    (configuration as Record<string, unknown>).connection_recovery_min_interval = 2;

    this.ua = new JsSIP.UA(configuration);

    this.ua.on("registered", () => {
      this.emit("registration:change", { status: "registered", profile });
    });

    this.ua.on("unregistered", () => {
      this.emit("registration:change", { status: "unregistered", profile });
    });

    this.ua.on("registrationFailed", (event) => {
      this.emit("registration:change", { status: "error", error: event.cause, profile });
    });

    this.ua.on("newRTCSession", ({ session, originator }) => {
      this.currentSession = session;
      const direction: "incoming" | "outgoing" = originator === "remote" ? "incoming" : "outgoing";
      this.setupSessionListeners(session, direction);
      const remoteIdentity = session.remote_identity?.uri?.toString();
      this.emit("call:state", {
        state: direction === "incoming" ? "ringing" : "calling",
        direction,
        session,
        remoteIdentity,
        profile: this.profile,
      });
    });

    this.ua.start();
  }

  private setupSessionListeners(session: JsSIP.RTCSession, direction: "incoming" | "outgoing") {
    session.on("connecting", () => {
      this.emit("call:state", { state: "calling", direction, session, profile: this.profile });
    });
    session.on("progress", () => {
      this.emit("call:state", { state: "ringing", direction, session, profile: this.profile });
    });
    session.on("confirmed", () => {
      this.emit("call:state", { state: "active", direction, session, profile: this.profile });
    });
    session.on("hold", () => {
      this.emit("call:state", { state: "held", direction, session, profile: this.profile });
    });
    session.on("unhold", () => {
      this.emit("call:state", { state: "active", direction, session, profile: this.profile });
    });
    session.on("ended", (event) => {
      this.emit("call:state", { state: "ended", direction, session, profile: this.profile });
      this.emit("call:ended", { reason: event.cause, profile: this.profile });
      this.currentSession = null;
    });
    session.on("failed", (event) => {
      this.emit("call:state", { state: "error", direction, session, profile: this.profile });
      this.emit("call:error", { message: event.cause, profile: this.profile });
      this.currentSession = null;
    });
  }

  async call(target: string) {
    if (!this.ua || !this.profile) throw new Error("SIP client not registered");
    const destination = this.normalizeTarget(target);
    const options: JsSIP.UAConfiguration = {
      mediaConstraints: { audio: true, video: false },
    } as unknown as JsSIP.UAConfiguration;
    this.ua.call(destination, options);
    return destination;
  }

  answer() {
    if (!this.currentSession) throw new Error("No active session");
    this.currentSession.answer({ mediaConstraints: { audio: true, video: false } });
  }

  hangup() {
    if (!this.currentSession) return;
    this.currentSession.terminate();
    this.currentSession = null;
  }

  unregister() {
    if (!this.ua) return;
    this.ua.stop();
    this.ua = null;
    this.emit("registration:change", { status: "unregistered" });
  }

  mute(muted: boolean) {
    if (!this.currentSession) return;
    this.currentSession.mute({ audio: muted });
  }

  transfer(target: string) {
    if (!this.currentSession) throw new Error("No active session");
    const destination = this.normalizeTarget(target);
    this.currentSession.refer(destination);
  }

  on<K extends SipClientEvent>(event: K, listener: Listener<K>) {
    const wrapper = (eventObject: Event) => {
      listener((eventObject as CustomEvent<SipClientEventMap[K]>).detail);
    };
    const existing = this.listenerMap.get(event) ?? new Map();
    existing.set(listener as Listener<any>, wrapper);
    this.listenerMap.set(event, existing);
    this.eventTarget.addEventListener(event, wrapper);
  }

  off<K extends SipClientEvent>(event: K, listener: Listener<K>) {
    const listeners = this.listenerMap.get(event);
    if (!listeners) return;
    const wrapper = listeners.get(listener as Listener<any>);
    if (!wrapper) return;
    this.eventTarget.removeEventListener(event, wrapper);
    listeners.delete(listener as Listener<any>);
    if (listeners.size === 0) {
      this.listenerMap.delete(event);
    }
  }

  private emit<K extends SipClientEvent>(event: K, detail: SipClientEventMap[K]) {
    this.eventTarget.dispatchEvent(new CustomEvent(event, { detail }));
  }

  private normalizeTarget(target: string) {
    if (!this.profile) return target;
    const trimmed = target.trim();
    if (!trimmed) {
      throw new Error("Target is required");
    }
    if (trimmed.startsWith("sip:")) {
      return trimmed;
    }

    const compact = trimmed.replace(/\s+/g, "");
    if (compact.includes("@")) {
      return compact.startsWith("sip:") ? compact : `sip:${compact}`;
    }

    const domain = this.profile.domain.trim();
    const allowedChars = compact.replace(/[^0-9+*#]/g, "");
    if (!allowedChars) {
      return `sip:${compact}@${domain}`;
    }

    const containsFeatureCode = /[*#]/.test(allowedChars);
    const isTelnyxProfile =
      this.profile.provider === "telnyx" || /telnyx\.com$/i.test(domain);

    if (containsFeatureCode) {
      return `sip:${allowedChars}@${domain}`;
    }

    if (allowedChars.startsWith("+")) {
      return `sip:${allowedChars}@${domain}`;
    }

    let digits = allowedChars.replace(/\D/g, "");
    if (!digits) {
      return `sip:${allowedChars}@${domain}`;
    }

    if (digits.length <= 6) {
      return `sip:${digits}@${domain}`;
    }

    if (isTelnyxProfile) {
      if (digits.startsWith("00")) {
        digits = digits.slice(2);
      }
      if (digits.length === 10) {
        digits = `${TELNYX_DEFAULT_COUNTRY_CODE}${digits}`;
      } else if (digits.length === 11 && digits.startsWith(TELNYX_DEFAULT_COUNTRY_CODE)) {
        // already prefixed correctly
      }
    }

    const userPart = digits.startsWith("+") ? digits : `+${digits}`;
    return `sip:${userPart}@${domain}`;
  }
}

export const sipClient = new SipClient();
