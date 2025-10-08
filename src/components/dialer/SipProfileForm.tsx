import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { type SipProfile, type SipTransport } from "../../types/sip";

interface SipProfileFormProps {
  onSubmit: (profile: Omit<SipProfile, "id">) => Promise<void>;
  submitting?: boolean;
}

const transports: SipTransport[] = ["udp", "tcp", "tls", "ws", "wss"];

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
      [field]: value === "" ? undefined : value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
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
