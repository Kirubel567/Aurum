"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpCircle,
  Bell,
  CheckCheck,
  Loader2,
  MessageSquare,
  ShieldAlert,
  UserCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { timeAgo } from "@/src/lib/utils/time";
import { NavPopover } from "@/src/shared/components/NavPopover";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type NotificationItem,
} from "@/src/features/notifications/hooks/useNotifications";

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  deposit_status: ArrowDownToLine,
  withdrawal_status: ArrowUpCircle,
  message: MessageSquare,
  system_alert: ShieldAlert,
  manager_assigned: UserCheck,
};

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  const handleClick = (item: NotificationItem) => {
    if (!item.read) markRead.mutate(item.id);
    setOpen(false);
    if (item.link_path) router.push(item.link_path);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={
          unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"
        }
        aria-expanded={open}
        className={cn(
          "relative flex size-8 items-center justify-center rounded-lg text-slate-500 transition-all duration-150",
          "hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/30",
          open && "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white"
        )}
      >
        <Bell className="size-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-bold leading-none text-white dark:border-[#0d141d]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <NavPopover open={open} onClose={() => setOpen(false)} className="w-[340px] max-w-[calc(100vw-2rem)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/[0.07]">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-bold text-slate-800 dark:text-white">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[#d4af37]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#8a6d3b] dark:text-[#d4af37]">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#8a6d3b] transition-colors hover:text-[#6d5628] disabled:opacity-60 dark:text-[#d4af37] dark:hover:text-[#e8c878]"
            >
              {markAllRead.isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <CheckCheck className="size-3" />
              )}
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[380px] overflow-y-auto overscroll-contain">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-10 text-xs text-slate-400">
              <Loader2 className="size-4 animate-spin" />
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5">
                <Bell className="size-5 text-slate-400" />
              </div>
              <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">
                All caught up
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                New notifications will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50 dark:divide-white/[0.04]">
              {notifications.map((item) => {
                const Icon = TYPE_ICON[item.type] ?? Bell;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(item)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                        "hover:bg-slate-50 dark:hover:bg-white/[0.04]",
                        !item.read && "bg-[#d4af37]/[0.06] dark:bg-[#d4af37]/[0.04]"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                          item.read
                            ? "bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500"
                            : "bg-[#d4af37]/15 text-[#8a6d3b] dark:text-[#d4af37]"
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span
                            className={cn(
                              "truncate text-[12.5px]",
                              item.read
                                ? "font-medium text-slate-600 dark:text-slate-400"
                                : "font-bold text-slate-800 dark:text-white"
                            )}
                          >
                            {item.title}
                          </span>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {timeAgo(item.created_at)}
                          </span>
                        </span>
                        {item.body && (
                          <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                            {item.body}
                          </span>
                        )}
                      </span>
                      {!item.read && (
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#d4af37]" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </NavPopover>
    </div>
  );
}
