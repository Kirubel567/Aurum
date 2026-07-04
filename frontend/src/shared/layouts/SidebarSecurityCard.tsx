"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Fingerprint, KeyRound, Lock, ServerCog, ShieldCheck, X } from "lucide-react";

const SECURITY_POINTS = [
  {
    icon: Lock,
    title: "256-bit TLS encryption",
    body: "Every connection between your browser and our servers is encrypted in transit with industry-standard 256-bit TLS.",
  },
  {
    icon: KeyRound,
    title: "Hardened authentication",
    body: "Passwords are never stored in readable form — they are hashed with bcrypt and managed by dedicated authentication infrastructure.",
  },
  {
    icon: ShieldCheck,
    title: "Row-level data isolation",
    body: "Database-level access policies ensure your account data is readable by you and authorized staff only — enforced by the database itself, not just the application.",
  },
  {
    icon: ServerCog,
    title: "Least-privilege operations",
    body: "Financial operations run through controlled, audited server-side procedures. No client application can write to balances directly.",
  },
  {
    icon: Fingerprint,
    title: "Verified sessions",
    body: "Your session is cryptographically verified on every request and can be revoked instantly if anything looks wrong.",
  },
];

export function SidebarSecurityCard() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <div className="rounded-xl border border-gray-800 bg-[#101927] p-5 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-[#C5A059]/20">
          <Lock className="size-5 text-[#C5A059]" />
        </div>
        <h4 className="mb-1 text-xs font-semibold text-white">
          Your Security is Our Priority
        </h4>
        <p className="mb-4 text-[10px] leading-relaxed text-gray-400">
          All transactions are secured with 256-bit encryption.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-md border border-[#C5A059] py-2 text-xs font-semibold text-[#C5A059] transition-colors hover:bg-[#C5A059] hover:text-[#0B1221]"
        >
          Learn More
        </button>
      </div>

      {/* Portaled to <body>: the sidebar's slide-in transform creates a CSS
          containing block that would otherwise trap this "fixed" overlay
          inside the sidebar — clipped, unscrollable, close button offscreen. */}
      {open && createPortal(
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="How we protect your account"
        >
          <div
            className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B1221] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 bg-gradient-to-r from-[#C5A059] via-[#e8c878] to-[#C5A059]" />

            <div className="flex items-start justify-between px-6 pt-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C5A059]">
                  Aurum Sovereign Capital
                </p>
                <h3 className="mt-1 text-lg font-bold text-white">
                  How we protect your account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <ul className="min-h-0 space-y-4 overflow-y-auto px-6 py-5">
              {SECURITY_POINTS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#C5A059]/15">
                    <Icon className="size-4 text-[#C5A059]" />
                  </span>
                  <span>
                    <span className="block text-[13px] font-semibold text-white">
                      {title}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-relaxed text-gray-400">
                      {body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="border-t border-white/[0.06] bg-white/[0.02] px-6 py-4">
              <p className="text-[10.5px] leading-relaxed text-gray-500">
                Questions about account security? Contact your account manager
                or our support team at any time.
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
