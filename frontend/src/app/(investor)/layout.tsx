import { DepositGate } from "@/src/features/onboarding/components/DepositGate";
import { InvestorNavbar } from "@/src/shared/layouts/InvestorNavbar";
import { InvestorSidebar } from "@/src/shared/layouts/InvestorSidebar";

export default function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DepositGate>
      <div className="flex min-h-screen w-full bg-[#F3F4F6]">
        <InvestorSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <InvestorNavbar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </DepositGate>
  );
}
