"use client";

import { useAuthStore } from "@/src/store/auth.store";
import type { UserRole } from "@/src/types/auth.types";

type PermissionAction = "read" | "write" | "admin";

const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  investor: ["read"],
  admin: ["read", "write", "admin"],
};

export function usePermissions() {
  const session = useAuthStore((s) => s.session);

  const can = (action: PermissionAction): boolean => {
    if (!session) return false;
    return ROLE_PERMISSIONS[session.user.role].includes(action);
  };

  const isAdmin = session?.user.role === "admin";
  const isInvestor = session?.user.role === "investor";

  return { can, isAdmin, isInvestor, role: session?.user.role ?? null };
}
