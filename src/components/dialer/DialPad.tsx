import { useMemo } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { cn } from "../../utils/cn";

const DIAL_PAD = [
  ["1", ""],
  ["2", "ABC"],
  ["3", "DEF"],
  ["4", "GHI"],
  ["5", "JKL"],
  ["6", "MNO"],
  ["7", "PQRS"],
  ["8", "TUV"],
  ["9", "WXYZ"],
  ["*", ""],
  ["0", "+"],
  ["#", ""],
];

interface DialPadProps {
  value: string;
  onChange: (value: string) => void;
  onCall: () => void;
  onBackspace: () => void;
  disabled?: boolean;
}

export const DialPad = ({ value, onChange, onCall, onBackspace, disabled }: DialPadProps) => {
  const isCallable = useMemo(() => value.trim().length > 0, [value]);
  return (
    <div className="space-y-4">
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Enter a phone number or SIP URI"
        className="text-center text-lg"
        disabled={disabled}
      />
      <div className="grid grid-cols-3 gap-3">
        {DIAL_PAD.map(([digit, letters]) => (
          <Button
            key={digit + letters}
            variant="secondary"
            className={cn("flex h-16 flex-col items-center justify-center space-y-1 text-lg", disabled && "opacity-60")}
            onClick={() => onChange(value + digit)}
            disabled={disabled}
          >
            <span>{digit}</span>
            {letters ? <span className="text-xs text-muted-foreground">{letters}</span> : null}
          </Button>
        ))}
        <Button variant="ghost" className="h-16" onClick={onBackspace} disabled={disabled || value.length === 0}>
          Delete
        </Button>
        <Button
          className="h-16 bg-emerald-500 text-white hover:bg-emerald-600"
          onClick={onCall}
          disabled={!isCallable || disabled}
        >
          Call
        </Button>
        <div />
      </div>
    </div>
  );
};
