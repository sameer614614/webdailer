/* eslint-disable @typescript-eslint/no-explicit-any */
import JsSIP from "jssip";
import { type SipProfile, type CallState } from "../types/sip";

type SipClientEventMap = {
  "registration:change": { status: "registering" | "registered" | "unregistered" | "error"; error?: string };
  "call:state": {
    state: CallState;
    direction: "incoming" | "outgoing";
    remoteIdentity?: string;
    session?: any;
  };
  "call:ended": { reason?: string };
  "call:error": { message: string };
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
    this.emit("registration:change", { status: "registering" });

    if (this.ua) {
      this.ua.stop();
      this.ua = null;
    }

    const transport = profile.transport === "wss" || profile.transport === "ws" ? profile.transport : "wss";
    const port = profile.port ?? (transport === "wss" ? 7443 : 5060);
    const socket = new JsSIP.WebSocketInterface(`${transport}://${profile.domain}:${port}`);

    const configuration: JsSIP.UAConfiguration = {
      sockets: [socket],
      uri: `sip:${profile.username}@${profile.domain}`,
      password: profile.password,
      authorization_user: profile.username,
      display_name: profile.displayName ?? profile.label,
      registrar_server: profile.registrar,
      contact_uri: `sip:${profile.username}@${profile.domain}`,
      session_timers: false,
    };

    this.ua = new JsSIP.UA(configuration);

    this.ua.on("registered", () => {
      this.emit("registration:change", { status: "registered" });
    });

    this.ua.on("unregistered", () => {
      this.emit("registration:change", { status: "unregistered" });
    });

    this.ua.on("registrationFailed", (event) => {
      this.emit("registration:change", { status: "error", error: event.cause });
    });

    this.ua.on("newRTCSession", ({ session, originator }) => {
      this.currentSession = session;
      const direction: "incoming" | "outgoing" = originator === "remote" ? "incoming" : "outgoing";
      this.setupSessionListeners(session, direction);
      const remoteIdentity = session.remote_identity?.uri?.toString();
      this.emit("call:state", { state: direction === "incoming" ? "ringing" : "calling", direction, session, remoteIdentity });
    });

    this.ua.start();
  }

  private setupSessionListeners(session: JsSIP.RTCSession, direction: "incoming" | "outgoing") {
    session.on("connecting", () => {
      this.emit("call:state", { state: "calling", direction, session });
    });
    session.on("progress", () => {
      this.emit("call:state", { state: "ringing", direction, session });
    });
    session.on("confirmed", () => {
      this.emit("call:state", { state: "active", direction, session });
    });
    session.on("hold", () => {
      this.emit("call:state", { state: "held", direction, session });
    });
    session.on("unhold", () => {
      this.emit("call:state", { state: "active", direction, session });
    });
    session.on("ended", (event) => {
      this.emit("call:state", { state: "ended", direction, session });
      this.emit("call:ended", { reason: event.cause });
      this.currentSession = null;
    });
    session.on("failed", (event) => {
      this.emit("call:state", { state: "error", direction, session });
      this.emit("call:error", { message: event.cause });
      this.currentSession = null;
    });
  }

  async call(target: string) {
    if (!this.ua || !this.profile) throw new Error("SIP client not registered");
    const options: JsSIP.UAConfiguration = {
      mediaConstraints: { audio: true, video: false },
    } as unknown as JsSIP.UAConfiguration;
    this.ua.call(target, options);
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
    this.currentSession.refer(target);
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
}

export const sipClient = new SipClient();
