import { createServerClient } from "@/src/lib/supabase/server";

export type NotificationType =
  | "deposit_status"
  | "withdrawal_status"
  | "message"
  | "system_alert"
  | "manager_assigned";

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link_path: string | null;
  read: boolean;
  created_at: string;
}

// Server-only insert — the notifications table has no client-reachable
// insert policy by design; every notification is system-generated from a
// trusted route handler. Failures are logged, never thrown: a notification
// must never break the business action that triggered it.
export async function insertNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  linkPath?: string;
}): Promise<void> {
  try {
    const db = createServerClient();
    const { error } = await db.from("notifications").insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link_path: input.linkPath ?? null,
    });
    if (error) {
      console.error("[notifications] insert failed:", error.message);
    }
  } catch (err) {
    console.error("[notifications] insert crashed:", err);
  }
}
