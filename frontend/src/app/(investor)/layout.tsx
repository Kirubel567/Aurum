import { InvestorNavbar } from "@/src/shared/layouts/InvestorNavbar";
import { InvestorSidebar } from "@/src/shared/layouts/InvestorSidebar";

export default function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
