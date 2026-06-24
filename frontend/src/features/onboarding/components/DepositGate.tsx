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
import { InvestorNavbar } from "@/src/shared/layouts/InvestorNavbar";
import { InvestorSidebar } from "@/src/shared/layouts/InvestorSidebar";
import { useAuthStore } from "@/src/store/auth.store";

import { StatusLockOverlay } from "./StatusLockOverlay";

interface DepositGateProps {
  children: React.ReactNode;
}

export function DepositGate({ children }: DepositGateProps) {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const depositStatus = useDepositStore((state) => state.depositStatus);
  const emailVerified = useDepositStore((state) => state.emailVerified);
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

    if (!hydrated) {
      void hydrateDepositStatus();
    }

    return () => {
      cancelled = true;
    };
  }, [applyRemoteSession, hydrated, router]);

  useDepositSessionSync({
    enabled: hydrated && !!session && session.user.role !== "admin",
    onSession: applyRemoteSession,
  });

  const handleStatusChange = useCallback(
    (status: DepositStatus) => {
      setDepositStatus(status);
      broadcastDepositStatusChange();
    },
    [setDepositStatus]
  );

  const handleEmailVerified = useCallback(() => {
    setEmailVerified(true);
    if (session) {
      setSession({ ...session, emailVerified: true });
    }
    broadcastDepositStatusChange();
  }, [setEmailVerified, session, setSession]);

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

  if (isDepositLocked(depositStatus)) {
    return (
      <StatusLockOverlay
        depositStatus={depositStatus ?? "none"}
        emailVerified={emailVerified}
        investorName={session.user.name}
        investorEmail={session.user.email}
        onStatusChange={handleStatusChange}
        onEmailVerified={handleEmailVerified}
      />
    );
  }

  return (
    <div className="font-(family-name:--font-jakarta) flex min-h-screen bg-[#F8FAFC]">
      <InvestorSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <InvestorNavbar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
