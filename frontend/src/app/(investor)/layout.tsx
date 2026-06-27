import { DepositGate } from "@/src/features/onboarding/components/DepositGate";
import { InvestorShell } from "@/src/shared/layouts/InvestorShell";

export default function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DepositGate>
      <InvestorShell>{children}</InvestorShell>
    </DepositGate>
  );
}
