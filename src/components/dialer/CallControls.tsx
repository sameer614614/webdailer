import { PhoneOff, MicOff, Mic, PhoneForwarded, Volume2 } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../utils/cn";

interface CallControlsProps {
  status: string;
  muted: boolean;
  onHangup: () => void;
  onToggleMute: () => void;
  onTransfer: () => void;
}

export const CallControls = ({ status, muted, onHangup, onToggleMute, onTransfer }: CallControlsProps) => {
  const inCall = ["calling", "ringing", "active", "held"].includes(status);
  if (!inCall) return null;
  return (
    <div className="flex items-center gap-4">
      <Button variant="destructive" size="lg" className="flex-1" onClick={onHangup}>
        <PhoneOff className="mr-2 h-4 w-4" /> Hang up
      </Button>
      <Button variant="secondary" size="lg" className="flex-1" onClick={onToggleMute}>
        {muted ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
        {muted ? "Unmute" : "Mute"}
      </Button>
      <Button variant="outline" size="lg" className={cn("flex-1", !inCall && "pointer-events-none opacity-50")} onClick={onTransfer}>
        <PhoneForwarded className="mr-2 h-4 w-4" /> Transfer
      </Button>
      <Button variant="outline" size="icon">
        <Volume2 className="h-4 w-4" />
      </Button>
    </div>
  );
};
