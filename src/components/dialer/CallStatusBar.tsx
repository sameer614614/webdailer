import type { ChangeEvent } from "react";
import { Circle, LogOut } from "lucide-react";
import { Button } from "../ui/button";
import { useAuth } from "../../hooks/useAuth";
import { type SipProfile } from "../../types/sip";
import { cn } from "../../utils/cn";

interface CallStatusBarProps {
  profiles: SipProfile[];
  activeProfile: SipProfile | null;
  registration: "idle" | "registering" | "registered" | "error";
  callStatus: string;
  onSelectProfile: (profileId: string) => void;
}

const statusVariantMap: Record<string, string> = {
  idle: "text-muted-foreground",
  registering: "text-amber-500",
  registered: "text-emerald-500",
  error: "text-destructive",
  calling: "text-amber-500",
  ringing: "text-amber-500",
  active: "text-emerald-500",
  held: "text-blue-500",
};

export const CallStatusBar = ({ profiles, activeProfile, registration, callStatus, onSelectProfile }: CallStatusBarProps) => {
  const { user, logout } = useAuth();

  const handleSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    onSelectProfile(event.target.value);
  };

  const statusColor = statusVariantMap[callStatus] ?? statusVariantMap[registration] ?? "text-muted-foreground";

  return (
    <header className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <Circle className={cn("h-3 w-3", statusColor)} />
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">Current SIP</span>
          <div className="flex items-center gap-2">
            <select
              className="rounded-md border border-input bg-background px-2 py-1 text-sm font-medium"
              value={activeProfile?.id ?? ""}
              onChange={handleSelect}
            >
              <option value="" disabled>
                Select profile
              </option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground capitalize">{registration}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium">{user?.displayName ?? user?.email}</p>
          <p className="text-xs text-muted-foreground">{callStatus === "idle" ? "Ready" : callStatus}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={logout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};
