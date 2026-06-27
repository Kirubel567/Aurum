import { redirect } from "next/navigation";
import { ROUTES } from "@/src/lib/constants/routes";

export default function AdminRootPage() {
  redirect(ROUTES.ADMIN_DASHBOARD);
}
