"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

import { useDepositSessionSync } from "@/src/features/onboarding/hooks/useDepositSessionSync";
import { broadcastDepositStatusChange } from "@/src/features/onboarding/lib/deposit-sync";
import { fetchDepositSession } from "@/src/features/onboarding/services/deposit.service";
import {
  isDepositLocked,
  useDepositStore,
} from "@/src/features/onboarding/store/deposit.store";
import type { DepositStatus } from "@/src/features/onboarding/types/deposit.types";
import { ROUTES } from "@/src/lib/constants/routes";
import { useAuthStore } from "@/src/store/auth.store";

import { ApprovedHoldingView } from "./ApprovedHoldingView";
import { StatusLockOverlay } from "./StatusLockOverlay";

interface DepositGateProps {
  children: React.ReactNode;
}

export function DepositGate({ children }: DepositGateProps) {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const hydrated = useDepositStore((state) => state.hydrated);
  const setDepositStatus = useDepositStore((state) => state.setDepositStatus);
  const setEmailVerified = useDepositStore((state) => state.setEmailVerified);
  const setHydrated = useDepositStore((state) => state.setHydrated);
  const setSession = useAuthStore((state) => state.setSession);

  const applyRemoteSession = useCallback(
    (remoteSession: Awaited<ReturnType<typeof fetchDepositSession>>) => {
      if (!remoteSession) {
        router.replace(ROUTES.LOGIN);
        return;
      }

      setSession(remoteSession);

      if (remoteSession.user.role === "admin") {
        setDepositStatus("approved");
        setEmailVerified(true);
      } else {
        setDepositStatus(remoteSession.depositStatus);
        setEmailVerified(remoteSession.emailVerified ?? false);
      }

      setHydrated(true);
    },
    [router, setDepositStatus, setEmailVerified, setHydrated, setSession]
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrateDepositStatus() {
      try {
        const remoteSession = await fetchDepositSession();
        if (!cancelled) {
          applyRemoteSession(remoteSession);
        }
      } catch {
        if (!cancelled) {
          router.replace(ROUTES.LOGIN);
        }
      }
    }

    void hydrateDepositStatus();

    return () => {
      cancelled = true;
    };
  }, [applyRemoteSession, router]);

  useDepositSessionSync({
    enabled: hydrated && !!session && session.user.role !== "admin",
    onSession: applyRemoteSession,
  });

  const handleStatusChange = useCallback(
    (status: DepositStatus) => {
      setDepositStatus(status);
      if (session) {
        setSession({ ...session, depositStatus: status });
      }
      broadcastDepositStatusChange();
    },
    [session, setDepositStatus, setSession]
  );

  if (!hydrated || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-[#C5A059]">
        Verifying account status...
      </div>
    );
  }

  if (session.user.role === "admin") {
    return <>{children}</>;
  }

  const depositStatus = session.depositStatus;
  const emailVerified = session.emailVerified ?? false;

  if (depositStatus === "approved") {
    return <ApprovedHoldingView investorName={session.user.name} />;
  }

  if (isDepositLocked(depositStatus)) {
    return (
      <StatusLockOverlay
        depositStatus={depositStatus}
        emailVerified={emailVerified}
        investorName={session.user.name}
        investorEmail={session.user.email}
        onStatusChange={handleStatusChange}
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
      Verifying account status...
    </div>
  );
}
