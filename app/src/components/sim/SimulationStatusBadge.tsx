import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SimStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

const STATUS_CONFIG: Record<
  SimStatus,
  { label: string; className: string }
> = {
  queued: {
    label: "Queued",
    className:
      "border-transparent bg-muted text-muted-foreground",
  },
  running: {
    label: "Running",
    className:
      "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 animate-pulse",
  },
  completed: {
    label: "Completed",
    className:
      "border-transparent bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
  failed: {
    label: "Failed",
    className:
      "border-transparent bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "border-transparent bg-muted text-muted-foreground line-through",
  },
};

interface SimulationStatusBadgeProps {
  status: SimStatus | string;
  className?: string;
}

export function SimulationStatusBadge({
  status,
  className,
}: SimulationStatusBadgeProps) {
  const config = STATUS_CONFIG[status as SimStatus] ?? {
    label: status,
    className: "border-transparent bg-muted text-muted-foreground",
  };

  return (
    <Badge className={cn("text-xs", config.className, className)}>
      {config.label}
    </Badge>
  );
}
