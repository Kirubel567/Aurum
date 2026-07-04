"use client";

import { useState } from "react";

// Change-password block for the admin System Settings page. Styling follows
// the page's existing design tokens (see the inline token comment at the top
// of admin/settings/page.tsx).

const inputClass = [
  "w-full rounded-lg px-4 py-2 font-data-mono text-[13px] outline-none transition-all",
  "bg-slate-50 border border-slate-200 text-slate-900",
  "focus:border-[#d4af37] focus:shadow-[0_0_10px_rgba(212,175,55,0.15)]",
  "dark:bg-black/20 dark:border-[rgba(255,255,255,0.1)] dark:text-[#dce3f0]",
  "dark:focus:border-[#f2ca50] dark:focus:shadow-[0_0_10px_rgba(242,202,80,0.2)]",
].join(" ");

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setStatus({ kind: "error", message: "All fields are required." });
      return;
    }
    if (newPassword.length < 8) {
      setStatus({ kind: "error", message: "New password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus({ kind: "error", message: "New passwords do not match." });
      return;
    }

    setStatus({ kind: "saving" });
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        setStatus({
          kind: "error",
          message: payload.error ?? "Could not update the password. Please try again.",
        });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatus({ kind: "success" });
    } catch {
      setStatus({
        kind: "error",
        message: "Something went wrong. Please check your connection and try again.",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-body-md font-bold mb-1 text-slate-900 dark:text-[#dce3f0]">
          Account Password
        </h4>
        <p className="text-body-sm text-slate-500 dark:text-[#d0c5af]">
          Rotate your sign-in password. Required after first login with a
          generated temporary password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="New password (min. 8 characters)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputClass}
        />

        {status.kind === "error" && (
          <p className="text-[12px] font-medium text-red-500 dark:text-[#ffb4ab]" role="alert">
            {status.message}
          </p>
        )}
        {status.kind === "success" && (
          <p className="text-[12px] font-medium text-emerald-600 dark:text-[#4edea3]" role="status">
            Password updated. Use it on your next sign-in.
          </p>
        )}

        <button
          type="submit"
          disabled={status.kind === "saving"}
          className="w-full border border-[#d4af37]/30 dark:border-[#f2ca50]/30 text-[#d4af37] dark:text-[#f2ca50] py-2 rounded-lg font-bold hover:bg-[#d4af37]/5 dark:hover:bg-[#f2ca50]/5 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[18px]">password</span>
          <span className="text-body-sm">
            {status.kind === "saving" ? "Updating..." : "Update Password"}
          </span>
        </button>
      </form>
    </div>
  );
}
