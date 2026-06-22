import { AdminNavbar } from "@/src/shared/layouts/AdminNavbar";
import { AdminSidebar } from "@/src/shared/layouts/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="theme-admin admin-gradient-bg flex min-h-screen">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminNavbar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
