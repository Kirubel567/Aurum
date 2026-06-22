import { InvestorNavbar } from "@/src/shared/layouts/InvestorNavbar";
import { InvestorSidebar } from "@/src/shared/layouts/InvestorSidebar";

export default function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="theme-investor investor-gradient-bg flex min-h-screen">
      <InvestorSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <InvestorNavbar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
