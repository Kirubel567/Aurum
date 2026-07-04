"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

interface NavPopoverProps {
  open: boolean;
  onClose: () => void;
  // The trigger button lives OUTSIDE this component; anchor is the shared
  // relatively-positioned wrapper around trigger + panel.
  children: React.ReactNode;
  className?: string;
  align?: "right" | "left";
}

// Anchored dropdown panel for the nav bars: closes on outside click and
// Escape, animates in, right-aligned to its trigger by default.
export function NavPopover({
  open,
  onClose,
  children,
  className,
  align = "right",
}: NavPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      const anchor = panelRef.current?.parentElement;
      if (anchor && !anchor.contains(e.target as Node)) onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        "absolute top-[calc(100%+10px)] z-[100] origin-top-right",
        align === "right" ? "right-0" : "left-0",
        // bg-[#ffffff] (not bg-white) on purpose: both theme skins in
        // globals.css rewrite the literal .bg-white class with !important
        // (admin: 70%-alpha glass, investor: solid slate), which broke these
        // panels on admin pages. The arbitrary-value class dodges those
        // selectors so the dark classes below render identically on BOTH
        // shells: the original investor glass look (95% #0d141d + blur).
        "rounded-xl border border-slate-200 bg-[#ffffff] shadow-[0_16px_50px_-12px_rgba(15,23,42,0.25)]",
        "dark:border-white/10 dark:bg-[#0d141d]/95 dark:[backdrop-filter:blur(16px)] dark:shadow-[0_16px_50px_-12px_rgba(0,0,0,0.7)]",
        "animate-in fade-in slide-in-from-top-2 duration-150",
        className
      )}
      role="menu"
    >
      {children}
    </div>
  );
}
