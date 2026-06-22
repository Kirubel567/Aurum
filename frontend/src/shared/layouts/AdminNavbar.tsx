"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Activity } from "lucide-react";

import { getSession } from "@/src/services/api/auth.api";
import { getSystemStatus, getNetworkAlerts } from "@/src/services/api/admin.api";
import type { AuthSession } from "@/src/types/auth.types";
import type { SystemStatus } from "@/src/types/admin.types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AdminNavbar() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    getSession().then(setSession);
    getSystemStatus().then(setStatus);
    getNetworkAlerts().then((alerts) => setAlertCount(alerts.length));
  }, []);

  const statusColor = {
    healthy: "status-chip-positive",
    degraded: "bg-amber-500/10 text-amber-600",
    down: "status-chip-negative",
  };

  return (
    <header className="flex h-12 items-center justify-between border-b border-[#E2E8F0] bg-white px-4">
      <div className="flex items-center gap-3">
        {status && (
          <div className="flex items-center gap-2 text-xs">
            <Activity className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Latency</span>
            <span className="font-mono font-medium text-[#0C1017]">
              {status.latencyMs}ms
            </span>
            <Badge
              className={cn("text-[10px]", statusColor[status.status])}
              variant="secondary"
            >
              {status.status}
            </Badge>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {alertCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-md bg-[#EF4444]/10 px-2 py-1 text-xs text-[#EF4444]">
            <AlertTriangle className="size-3.5" />
            {alertCount} alert{alertCount !== 1 ? "s" : ""}
          </div>
        )}

        <div className="text-right">
          <p className="text-xs font-medium text-[#0C1017]">
            {session?.user.name ?? "Operator"}
          </p>
          <p className="text-[10px] text-muted-foreground">Administrator</p>
        </div>

        <div className="flex size-7 items-center justify-center rounded-full bg-[#0C1017] text-[10px] font-semibold text-white">
          {session?.user.name?.charAt(0) ?? "A"}
        </div>
      </div>
    </header>
  );
}
