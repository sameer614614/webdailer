import { formatDistanceToNow } from "date-fns";
import { type CallLogEntry } from "../../types/sip";

interface CallLogListProps {
  logs: CallLogEntry[];
}

export const CallLogList = ({ logs }: CallLogListProps) => {
  if (!logs.length) {
    return <p className="text-sm text-muted-foreground">No call activity yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {logs.map((log) => (
        <li key={log.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <p className="text-sm font-medium">{log.peer}</p>
            <p className="text-xs text-muted-foreground">
              {log.direction === "outgoing" ? "Outgoing" : "Incoming"} • {log.status}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>{formatDistanceToNow(new Date(log.startedAt), { addSuffix: true })}</p>
            {log.durationSeconds ? <p>{Math.round(log.durationSeconds)} sec</p> : null}
          </div>
        </li>
      ))}
    </ul>
  );
};
