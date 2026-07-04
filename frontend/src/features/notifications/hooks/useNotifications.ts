"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link_path: string | null;
  read: boolean;
  created_at: string;
}

interface NotificationsResponse {
  unreadCount: number;
  notifications: NotificationItem[];
}

const NOTIFICATIONS_KEY = ["notifications"];

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    enabled,
    queryFn: async (): Promise<NotificationsResponse> => {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load notifications");
      return res.json();
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to mark notification read");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to mark all read");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

// ── Admin-only data ──────────────────────────────────────────────────────────

export interface AdminSummary {
  pendingDeposits: number;
  pendingWithdrawals: number;
  unreadMessages: number;
  systemAlerts: number;
}

export function useAdminSummary(enabled = true) {
  return useQuery({
    queryKey: ["admin-summary"],
    enabled,
    queryFn: async (): Promise<AdminSummary> => {
      const res = await fetch("/api/admin/notifications/summary", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load summary");
      return res.json();
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export interface AdminActivityEvent {
  id: string;
  kind: "registration" | "deposit_submitted" | "message";
  title: string;
  detail: string;
  at: string;
  linkPath: string;
}

export function useAdminActivity(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-activity"],
    enabled,
    queryFn: async (): Promise<{ events: AdminActivityEvent[] }> => {
      const res = await fetch("/api/admin/activity", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load activity");
      return res.json();
    },
    staleTime: 15_000,
  });
}

export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
  role: string;
  depositStatus: string;
}

export function useAdminUserSearch(query: string) {
  return useQuery({
    queryKey: ["admin-user-search", query],
    enabled: query.trim().length >= 2,
    queryFn: async (): Promise<{ results: UserSearchResult[] }> => {
      const res = await fetch(
        `/api/admin/search-users?q=${encodeURIComponent(query.trim())}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}
