"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  BarChart2,
  History,
  Loader2,
  Menu,
  MessageSquare,
  Moon,
  Search,
  Sun,
  UserPlus,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ROUTES } from "@/src/lib/constants/routes";
import { timeAgo } from "@/src/lib/utils/time";
import { useTheme } from "@/src/hooks/useTheme";
import { useSessionHydration } from "@/src/hooks/useSessionHydration";
import { NavPopover } from "@/src/shared/components/NavPopover";
import { NotificationBell } from "@/src/features/notifications/components/NotificationBell";
import {
  useAdminActivity,
  useAdminUserSearch,
} from "@/src/features/notifications/hooks/useNotifications";
import { UserMenu } from "./UserMenu";

// ── AdminNavbar ───────────────────────────────────────────────────────────────

interface AdminNavbarProps {
  onMenuClick?: () => void;
}

const ACTIVITY_ICON = {
  registration: UserPlus,
  deposit_submitted: ArrowDownToLine,
  message: MessageSquare,
} as const;

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  rejected: "bg-red-500/10 text-red-500 dark:text-red-400",
  none: "bg-slate-500/10 text-slate-500 dark:text-slate-400",
};

export function AdminNavbar({ onMenuClick }: AdminNavbarProps) {
  const router = useRouter();
  useSessionHydration();
  const { isDark, toggle: toggleTheme } = useTheme();

  // ── Search state (debounced 250ms into the query hook) ────────────────────
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { data: searchData, isFetching: searching } = useAdminUserSearch(debouncedQuery);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Close search results on outside click / Escape.
  useEffect(() => {
    if (!searchOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSearchOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [searchOpen]);

  const results = searchData?.results ?? [];
  const showResults = searchOpen && debouncedQuery.trim().length >= 2;

  // ── Activity dropdown ──────────────────────────────────────────────────────
  const [activityOpen, setActivityOpen] = useState(false);
  const { data: activityData, isLoading: activityLoading } = useAdminActivity(activityOpen);

  return (
    // relative z-40 keeps the dropdown panels (bell, search results, activity,
    // avatar menu) painting above the page content on scroll.
    <header className="relative z-40 flex h-16 flex-shrink-0 items-center justify-between border-b border-[#e2e8f0] dark:border-white/[0.07] bg-white/85 dark:bg-[#0d141d]/90 px-4 sm:px-6 backdrop-blur-xl">

      {/* ── Hamburger (mobile only) ─────────────────────────────────────────── */}
      <button
        onClick={onMenuClick}
        className="mr-3 flex size-8 items-center justify-center rounded-lg text-[#64748b] transition-all hover:bg-[#f1f5f9] hover:text-[#1a1c1e] lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      {/* ── User search ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center">
        <div ref={searchRef} className="relative w-full max-w-xs hidden sm:block">
          {searching ? (
            <Loader2 className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-[#d4af37]" />
          ) : (
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#94a3b8]" />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search investors by name or email..."
            aria-label="Search investors"
            className="w-full rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-[#f8fafc] dark:bg-black/20 py-[7px] pl-9 pr-4 text-[13px] text-[#1a1c1e] dark:text-[#dce3f0] placeholder-[#94a3b8] dark:placeholder-[#99907c] outline-none transition-all focus:border-[#d4af37]/50 focus:bg-white dark:focus:bg-black/30 focus:ring-1 focus:ring-[#d4af37]/25 focus-visible:ring-2 focus-visible:ring-[#d4af37]/30"
          />

          {/* Live results */}
          {showResults && (
            // bg-[#ffffff] not bg-white — see the note in NavPopover.tsx
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[100] overflow-hidden rounded-xl border border-slate-200 bg-[#ffffff] shadow-[0_16px_50px_-12px_rgba(15,23,42,0.25)] dark:border-white/10 dark:bg-[#0d141d]/95 dark:[backdrop-filter:blur(16px)] dark:shadow-[0_16px_50px_-12px_rgba(0,0,0,0.7)] animate-in fade-in slide-in-from-top-2 duration-150">
              {results.length === 0 && !searching ? (
                <p className="px-4 py-5 text-center text-[12px] text-slate-400">
                  No investors match &ldquo;{debouncedQuery.trim()}&rdquo;
                </p>
              ) : (
                <ul className="max-h-[320px] divide-y divide-slate-50 overflow-y-auto dark:divide-white/[0.04]">
                  {results.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          setQuery("");
                          router.push(`${ROUTES.ADMIN_USERS}?q=${encodeURIComponent(u.email)}`);
                        }}
                        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                      >
                        <span
                          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/25 text-[10.5px] font-bold text-[#8a6d3b] dark:text-[#d4af37]"
                          style={{ background: "rgba(212,175,55,0.07)" }}
                        >
                          {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-semibold text-slate-800 dark:text-white">
                            {u.name}
                          </span>
                          <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {u.email}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide",
                            STATUS_STYLES[u.depositStatus] ?? STATUS_STYLES.none
                          )}
                        >
                          {u.depositStatus}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right cluster ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5">

        {/* Icon action buttons */}
        <div className="flex items-center gap-0.5 border-r border-[#e2e8f0] dark:border-white/10 pr-5">
          <NotificationBell />

          {/* Activity history */}
          <div className="relative">
            <button
              onClick={() => setActivityOpen((o) => !o)}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg text-[#64748b] transition-all duration-150 hover:bg-[#f1f5f9] hover:text-[#1a1c1e] dark:hover:bg-white/10 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/30",
                activityOpen && "bg-[#f1f5f9] text-[#1a1c1e] dark:bg-white/10 dark:text-white"
              )}
              aria-label="Recent platform activity"
              aria-expanded={activityOpen}
            >
              <History className="size-[17px]" />
            </button>

            <NavPopover
              open={activityOpen}
              onClose={() => setActivityOpen(false)}
              className="w-[340px] max-w-[calc(100vw-2rem)]"
            >
              <div className="border-b border-slate-100 px-4 py-3 dark:border-white/[0.07]">
                <h3 className="text-[13px] font-bold text-slate-800 dark:text-white">
                  Recent Activity
                </h3>
                <p className="text-[10.5px] text-slate-400">
                  Registrations, deposit submissions and client messages
                </p>
              </div>
              <div className="max-h-[380px] overflow-y-auto overscroll-contain">
                {activityLoading ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-10 text-xs text-slate-400">
                    <Loader2 className="size-4 animate-spin" />
                    Loading activity...
                  </div>
                ) : (activityData?.events ?? []).length === 0 ? (
                  <p className="px-4 py-10 text-center text-[12px] text-slate-400">
                    No recent activity.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-50 dark:divide-white/[0.04]">
                    {(activityData?.events ?? []).map((event) => {
                      const Icon = ACTIVITY_ICON[event.kind];
                      return (
                        <li key={event.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setActivityOpen(false);
                              router.push(event.linkPath);
                            }}
                            className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                          >
                            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#d4af37]/12 text-[#8a6d3b] dark:text-[#d4af37]">
                              <Icon className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline justify-between gap-2">
                                <span className="truncate text-[12.5px] font-semibold text-slate-800 dark:text-white">
                                  {event.title}
                                </span>
                                <span className="shrink-0 text-[10px] text-slate-400">
                                  {timeAgo(event.at)}
                                </span>
                              </span>
                              <span className="mt-0.5 line-clamp-1 block text-[11.5px] text-slate-500 dark:text-slate-400">
                                {event.detail}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </NavPopover>
          </div>

          {/* Platform analytics → the admin dashboard (Phase 12 expands this) */}
          <Link
            href={ROUTES.ADMIN_DASHBOARD}
            className="flex size-8 items-center justify-center rounded-lg text-[#64748b] transition-all duration-150 hover:bg-[#f1f5f9] hover:text-[#1a1c1e] dark:hover:bg-white/10 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/30"
            aria-label="Platform analytics"
          >
            <BarChart2 className="size-[17px]" />
          </Link>

          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="relative flex size-8 items-center justify-center rounded-lg text-[#64748b] transition-all duration-200 hover:bg-[#f1f5f9] hover:text-[#1a1c1e] dark:hover:bg-white/10 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/30"
          >
            <Sun
              className="size-[17px] absolute transition-all duration-300"
              style={{
                opacity: isDark ? 1 : 0,
                transform: isDark ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(0.5)",
              }}
            />
            <Moon
              className="size-[17px] absolute transition-all duration-300"
              style={{
                opacity: isDark ? 0 : 1,
                transform: isDark ? "rotate(90deg) scale(0.5)" : "rotate(0deg) scale(1)",
              }}
            />
          </button>
        </div>

        {/* Execute Trade CTA */}
        <Link
          href={ROUTES.ADMIN_CONSOLE}
          className="hidden sm:flex items-center gap-1.5 rounded-lg bg-[#d4af37] px-3.5 py-[7px] text-[12.5px] font-bold text-[#1a0e00] shadow-[0_2px_10px_rgba(212,175,55,0.32)] transition-all duration-150 hover:bg-[#c9a830] hover:shadow-[0_4px_16px_rgba(212,175,55,0.4)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/40"
        >
          <Zap className="size-[13px] fill-current" />
          Execute Trade
        </Link>

        {/* User profile */}
        <UserMenu variant="admin" />
      </div>
    </header>
  );
}
