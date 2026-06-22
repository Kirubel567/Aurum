import { redirect } from "next/navigation";

import { ROUTES } from "@/src/lib/constants/routes";

export default function HomePage() {
  redirect(ROUTES.LOGIN);
}
