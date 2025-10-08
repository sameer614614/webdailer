import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { type SipProfile, type SipTransport } from "../../types/sip";
import {
  TELNYX_DEFAULT_DOMAIN,
  TELNYX_DEFAULT_PORT,
  getTelnyxWebsocketUrl,
} from "../../constants/telnyx";

interface SipProfileFormProps {
  onSubmit: (profile: Omit<SipProfile, "id">) => Promise<void>;
  submitting?: boolean;
  initialValues?: Partial<SipProfile>;
  onCancel?: () => void;
  submitLabel?: string;
}

const transports: SipTransport[] = ["udp", "tcp", "tls", "ws", "wss"];

const emptyProfile: Omit<SipProfile, "id"> = {
  label: "",
  username: "",
  password: "",
  domain: "",
  transport: "wss",
  provider: "telnyx",
  port: undefined,
  displayName: "",
  voicemailNumber: "",
  autoRegister: true,
  websocketUrl: "",
  registrar: "",
  outboundProxy: "",
  isPrimary: false,
};

export const SipProfileForm = ({
  onSubmit,
  submitting,
  initialValues,
  onCancel,
  submitLabel = "Save profile",
}: SipProfileFormProps) => {
  const [formState, setFormState] = useState<Omit<SipProfile, "id">>({
    ...emptyProfile,
    ...initialValues,
    transport: initialValues?.transport ?? emptyProfile.transport,
    provider: initialValues?.provider ?? emptyProfile.provider,
    autoRegister: initialValues?.autoRegister ?? emptyProfile.autoRegister,
    isPrimary: initialValues?.isPrimary ?? emptyProfile.isPrimary,
  });
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(
    initialValues?.provider === "custom" || Boolean(initialValues?.websocketUrl || initialValues?.registrar || initialValues?.outboundProxy),
  );

export const SipProfileForm = ({ onSubmit, submitting }: SipProfileFormProps) => {
  const [formState, setFormState] = useState<Omit<SipProfile, "id">>({
    label: "",
    username: "",
    password: "",
    domain: "",
    transport: "wss",
    port: undefined,
    outboundProxy: "",
    registrar: "",
    displayName: "",
    voicemailNumber: "",
    autoRegister: true,
  });
  const [error, setError] = useState<string | null>(null);
  const handleChange = (field: keyof Omit<SipProfile, "id">) => (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (event.target.type === "checkbox") {
      const checked = (event.target as HTMLInputElement).checked;
      setFormState((prev) => ({
        ...prev,
        [field]: checked,
      }));
      return;
    }

    const value = event.target.value;
    if (field === "port") {
      setFormState((prev) => ({
        ...prev,
        port: value === "" ? undefined : Number(value),
      }));
      return;
    }

    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const sanitizedState = useMemo(() => {
    const next = { ...formState };
    next.displayName = next.displayName?.trim() || undefined;
    next.voicemailNumber = next.voicemailNumber?.trim() || undefined;
    next.websocketUrl = next.websocketUrl?.trim() || undefined;
    next.registrar = next.registrar?.trim() || undefined;
    next.outboundProxy = next.outboundProxy?.trim() || undefined;
    next.domain = next.domain.trim();
    next.label = next.label.trim();
    next.username = next.username.trim();
    return next;
  }, [formState]);

      [field]: value === "" ? undefined : value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit({
        ...sanitizedState,
        transport: sanitizedState.provider === "telnyx" ? "wss" : sanitizedState.transport,
      });
      if (!initialValues) {
        setFormState({ ...emptyProfile });
        setShowAdvanced(false);
      }
      await onSubmit(formState);
      setFormState((prev) => ({ ...prev, label: "", username: "", password: "", domain: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="label">Label</Label>
          <Input id="label" value={formState.label} onChange={handleChange("label")} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input id="displayName" value={formState.displayName ?? ""} onChange={handleChange("displayName")} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="provider">Provider</Label>
          <select
            id="provider"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={formState.provider}
            onChange={(event) => {
              const value = event.target.value as SipProfile["provider"];
              setFormState((prev) => ({ ...prev, provider: value, transport: value === "telnyx" ? "wss" : prev.transport }));
              if (value === "telnyx") {
                setShowAdvanced(false);
              } else {
                setShowAdvanced(true);
              }
            }}
          >
            <option value="telnyx">Telnyx (recommended)</option>
            <option value="custom">Custom / other provider</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="username">SIP user</Label>
          <Input id="username" value={formState.username} onChange={handleChange("username")} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">SIP password</Label>
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" value={formState.username} onChange={handleChange("username")} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={formState.password}
            onChange={handleChange("password")}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="domain">SIP domain</Label>
          <Input id="domain" value={formState.domain} onChange={handleChange("domain")} required />
        </div>
        <div className="space-y-2">
        <div className="space-y-2">
          <Label htmlFor="domain">Domain</Label>
          <Input id="domain" value={formState.domain} onChange={handleChange("domain")} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="port">Port</Label>
          <Input
            id="port"
            type="number"
            value={formState.port ?? ""}
            onChange={handleChange("port")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="transport">Transport</Label>
          <select
            id="transport"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={formState.transport}
            onChange={handleChange("transport")}
          >
            {transports.map((transport) => (
              <option key={transport} value={transport}>
                {transport.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="registrar">Registrar</Label>
          <Input
            id="registrar"
            value={formState.registrar ?? ""}
            onChange={handleChange("registrar")}
            placeholder="sip:registrar.example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="outboundProxy">Outbound proxy</Label>
          <Input
            id="outboundProxy"
            value={formState.outboundProxy ?? ""}
            onChange={handleChange("outboundProxy")}
            placeholder="wss://proxy.example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="voicemailNumber">Voicemail number</Label>
          <Input
            id="voicemailNumber"
            value={formState.voicemailNumber ?? ""}
            onChange={handleChange("voicemailNumber")}
          />
        </div>
      </div>

      {formState.provider === "telnyx" ? (
        <div className="rounded-md border border-dashed border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          Telnyx defaults will automatically configure secure WebSocket, registration server, and transport. Enable advanced
          overrides below if you need to customise them.
        </div>
      ) : null}

      <button
        type="button"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        onClick={() => setShowAdvanced((value) => !value)}
      >
        {showAdvanced ? "Hide advanced overrides" : "Show advanced overrides"}
      </button>

      {showAdvanced ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="transport">Transport</Label>
            <select
              id="transport"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={formState.transport}
              onChange={handleChange("transport")}
              disabled={formState.provider === "telnyx"}
            >
              {transports.map((transport) => (
                <option key={transport} value={transport}>
                  {transport.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input id="port" type="number" value={formState.port ?? ""} onChange={handleChange("port")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="websocketUrl">WebSocket URL</Label>
            <Input
              id="websocketUrl"
              placeholder="wss://sip.telnyx.com:443"
              value={formState.websocketUrl ?? ""}
              onChange={handleChange("websocketUrl")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registrar">Registrar</Label>
            <Input id="registrar" value={formState.registrar ?? ""} onChange={handleChange("registrar")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="outboundProxy">Outbound proxy</Label>
            <Input id="outboundProxy" value={formState.outboundProxy ?? ""} onChange={handleChange("outboundProxy")} />
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={Boolean(formState.autoRegister)} onChange={handleChange("autoRegister")} />
            Auto register on login
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={Boolean(formState.isPrimary)} onChange={handleChange("isPrimary")} />
            Make this the primary profile
          </label>
        </div>
        <div className="flex items-center gap-2">
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={submitting}>
            {submitLabel}
          </Button>
        </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(formState.autoRegister)} onChange={handleChange("autoRegister")} />
          Auto register on login
        </label>
        <Button type="submit" disabled={submitting}>
          Save profile
        </Button>
      </div>
    </form>
  );
};
