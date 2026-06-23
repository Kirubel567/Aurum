import { DepositGate } from "@/src/features/onboarding/components/DepositGate";

export default function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DepositGate>{children}</DepositGate>;
}
