import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export interface Alert {
  id: string;
  severity: "info" | "warning" | "error" | "success";
  message: string;
}

interface AlertStackProps {
  alerts: Alert[];
  className?: string;
}

const severityConfig = {
  success: { icon: CheckCircle, className: "status-chip-positive" },
  error: { icon: XCircle, className: "status-chip-negative" },
  warning: { icon: AlertTriangle, className: "bg-amber-500/10 text-amber-600" },
  info: { icon: Info, className: "bg-blue-500/10 text-blue-600" },
};

export function AlertStack({ alerts, className }: AlertStackProps) {
  if (alerts.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {alerts.map((alert) => {
        const config = severityConfig[alert.severity];
        const Icon = config.icon;
        return (
          <div
            key={alert.id}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
              config.className
            )}
          >
            <Icon className="size-4 shrink-0" />
            {alert.message}
          </div>
        );
      })}
    </div>
  );
}
