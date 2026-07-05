"use client";

// Stitch dark tokens:
// glass-card: rgba(25,32,42,0.4) + blur(12px) + border rgba(255,255,255,0.1) + top-line gradient gold
// body bg: #050B14   surface: #0d141d   primary: #f2ca50   on-surface: #dce3f0

import { useState, useEffect, useCallback } from "react";

import { ChangePasswordCard } from "@/src/features/settings/components/ChangePasswordCard";

// ── Types (match API responses) ────────────────────────────────────────────────

interface SystemSettings {
  minDepositUsd: number;
  minWithdrawalUsd: number;
  standardWithdrawalFeePct: number;
  expressWithdrawalFeePct: number;
  lockupPeriodDays: number;
  updatedAt: string;
  updatedByName: string | null;
}

interface AuditLogEntry {
  id: string;
  userName: string;
  role: string;
  deviceLabel: string;
  ipAddress: string | null;
  at: string;
}

// glass-card class helper (all dark tokens inline to avoid global CSS conflicts)
const gc = [
  "dark:bg-[rgba(25,32,42,0.4)]",
  "dark:[backdrop-filter:blur(12px)]",
  "dark:border-[rgba(255,255,255,0.1)]",
  "dark:[box-shadow:inset_0_1px_0_rgba(212,175,55,0.18)]",
].join(" ");

const inp = [
  "w-full rounded-lg px-4 py-2 font-data-mono text-[13px] outline-none transition-all",
  "bg-slate-50 border border-slate-200 text-slate-900",
  "focus:border-[#d4af37] focus:shadow-[0_0_10px_rgba(212,175,55,0.15)]",
  "dark:bg-black/20 dark:border-[rgba(255,255,255,0.1)] dark:text-[#dce3f0]",
  "dark:focus:border-[#f2ca50] dark:focus:shadow-[0_0_10px_rgba(242,202,80,0.2)]",
].join(" ");

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, isError }: { msg: string; isError?: boolean }) {
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[300] pointer-events-none
      bg-[#0d141d] dark:bg-[rgba(25,32,42,0.95)] dark:border
      ${isError ? "dark:border-[#ffb4ab]/40 text-white dark:text-[#ffb4ab]" : "dark:border-[rgba(242,202,80,0.3)] text-white dark:text-[#f2ca50]"}
      text-sm font-bold px-6 py-3 rounded-xl shadow-2xl animate-fade-in`}>
      {msg}
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SystemSettingsPage() {
  const [settings, setSettings]   = useState<SystemSettings | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [auditLog, setAuditLog]   = useState<AuditLogEntry[]>([]);

  // Editable form state (strings so inputs behave naturally)
  const [minDeposit, setMinDeposit]       = useState("");
  const [minWithdrawal, setMinWithdrawal] = useState("");
  const [stdFee, setStdFee]               = useState(""); // entered as %, stored as fraction
  const [expFee, setExpFee]               = useState("");
  const [lockupDays, setLockupDays]       = useState("");

  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState<{ msg: string; isError?: boolean } | null>(null);

  const showToast = (msg: string, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3500);
  };

  const applyToForm = (s: SystemSettings) => {
    setMinDeposit(String(s.minDepositUsd));
    setMinWithdrawal(String(s.minWithdrawalUsd));
    setStdFee(String(Number((s.standardWithdrawalFeePct * 100).toFixed(3))));
    setExpFee(String(Number((s.expressWithdrawalFeePct * 100).toFixed(3))));
    setLockupDays(String(s.lockupPeriodDays));
  };

  const load = useCallback(async () => {
    try {
      const [settingsRes, auditRes] = await Promise.all([
        fetch("/api/admin/settings"),
        fetch("/api/admin/settings/audit-log"),
      ]);
      if (!settingsRes.ok) throw new Error("settings failed");
      const s = await settingsRes.json() as SystemSettings;
      setSettings(s);
      applyToForm(s);
      setLoadError(false);
      if (auditRes.ok) {
        const audit = await auditRes.json() as { entries: AuditLogEntry[] };
        setAuditLog(audit.entries ?? []);
      }
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (saving) return;

    const parsed = {
      minDepositUsd: Number(minDeposit),
      minWithdrawalUsd: Number(minWithdrawal),
      standardWithdrawalFeePct: Number(stdFee) / 100,
      expressWithdrawalFeePct: Number(expFee) / 100,
      lockupPeriodDays: Number(lockupDays),
    };

    for (const [key, value] of Object.entries(parsed)) {
      if (!Number.isFinite(value) || value < 0) {
        showToast(`Invalid value for ${key}.`, true);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      showToast("Platform parameters saved.");
      await load();
    } catch (e) {
      showToast((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (settings) {
      applyToForm(settings);
      showToast("Changes discarded — reverted to saved values.");
    }
  }

  const dirty =
    settings != null &&
    (Number(minDeposit) !== settings.minDepositUsd ||
      Number(minWithdrawal) !== settings.minWithdrawalUsd ||
      Number(stdFee) / 100 !== settings.standardWithdrawalFeePct ||
      Number(expFee) / 100 !== settings.expressWithdrawalFeePct ||
      Number(lockupDays) !== settings.lockupPeriodDays);

  return (
    <div className="h-full overflow-y-auto bg-[#F8FAFC] dark:bg-[#050b14]">
      {toast && <Toast msg={toast.msg} isError={toast.isError} />}

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <header className="mb-10">
          <h2 className="font-headline-lg text-headline-lg text-slate-900 dark:text-[#dce3f0]">System Settings</h2>
          <p className="font-body-md text-body-md text-slate-500 dark:text-[#d0c5af]">
            Platform financial parameters and staff access oversight.
          </p>
        </header>

        {loadError && (
          <div className="mb-6 bg-red-50 dark:bg-[#ffb4ab]/10 border border-red-200 dark:border-[#ffb4ab]/20 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-[#ffb4ab] flex items-center justify-between">
            <span>Failed to load system settings.</span>
            <button onClick={load} className="font-bold underline">Retry</button>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">

          {/* ── Platform Financial Parameters ─────────────────────────────── */}
          <section className={`col-span-12 lg:col-span-8 rounded-xl p-6 space-y-6
            bg-white border border-slate-100 shadow-sm ${gc}`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[#d4af37] dark:text-[#f2ca50]">payments</span>
                <h3 className="font-label-caps text-label-caps uppercase text-slate-800 dark:text-[#dce3f0] tracking-widest">
                  Platform Financial Parameters
                </h3>
              </div>
              <span className="text-[10px] bg-red-100 dark:bg-[#93000a] text-red-700 dark:text-[#ffb4ab] px-4 py-1 rounded uppercase font-bold tracking-tighter">
                Super Admin Only
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] uppercase">Minimum Deposit (USD)</label>
                <input className={inp} type="number" min="0" step="50" value={minDeposit}
                  onChange={(e) => setMinDeposit(e.target.value)} disabled={!settings} />
                <p className="text-[11px] text-slate-400 dark:text-[#99907c]">Investors cannot submit deposits below this amount.</p>
              </div>
              <div className="space-y-1">
                <label className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] uppercase">Minimum Withdrawal (USD)</label>
                <input className={inp} type="number" min="0" step="50" value={minWithdrawal}
                  onChange={(e) => setMinWithdrawal(e.target.value)} disabled={!settings} />
                <p className="text-[11px] text-slate-400 dark:text-[#99907c]">Smallest withdrawal an investor may request.</p>
              </div>
              <div className="space-y-1">
                <label className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] uppercase">Standard Withdrawal Fee (%)</label>
                <input className={inp} type="number" min="0" max="20" step="0.1" value={stdFee}
                  onChange={(e) => setStdFee(e.target.value)} disabled={!settings} />
                <p className="text-[11px] text-slate-400 dark:text-[#99907c]">Applied to standard (24–48h) withdrawals.</p>
              </div>
              <div className="space-y-1">
                <label className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] uppercase">Express Withdrawal Fee (%)</label>
                <input className={inp} type="number" min="0" max="20" step="0.1" value={expFee}
                  onChange={(e) => setExpFee(e.target.value)} disabled={!settings} />
                <p className="text-[11px] text-slate-400 dark:text-[#99907c]">Applied to express (same-day) withdrawals.</p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] uppercase">Principal Lock-up Period (Days)</label>
                <input className={inp} type="number" min="0" max="1095" step="1" value={lockupDays}
                  onChange={(e) => setLockupDays(e.target.value)} disabled={!settings} />
                <p className="text-[11px] text-slate-400 dark:text-[#99907c]">
                  Days each approved deposit&apos;s principal stays locked before it becomes withdrawable. Yield is never locked.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleSave}
                disabled={saving || !dirty}
                className="bg-[#d4af37] dark:bg-[#f2ca50] text-white dark:text-[#3c2f00] px-10 py-2 rounded-lg font-bold hover:brightness-110 active:scale-95 transition-all text-body-sm shadow-md dark:shadow-[0_0_20px_rgba(242,202,80,0.15)] disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </section>

          {/* ── Staff Access Log ──────────────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className={`rounded-xl p-6 bg-white border border-slate-100 shadow-sm ${gc}`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] uppercase">Staff Access Log</h4>
                <button onClick={load} className="text-[#d4af37] dark:text-[#f2ca50] text-[10px] font-bold hover:underline">
                  Refresh
                </button>
              </div>
              {auditLog.length === 0 ? (
                <p className="text-[12px] text-slate-400 dark:text-[#99907c] py-4">
                  {settings ? "No staff login sessions recorded yet." : "Loading…"}
                </p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(212,175,55,0.2)_transparent]">
                  {auditLog.map((entry) => (
                    <div key={entry.id} className="flex justify-between items-start gap-3 border-l-2 border-[#d4af37]/30 dark:border-[#f2ca50]/30 pl-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-body-sm text-[12px] text-slate-700 dark:text-[#dce3f0] font-semibold truncate">
                          {entry.userName}
                          <span className="ml-1.5 text-[9px] uppercase font-bold text-slate-400 dark:text-[#99907c]">{entry.role}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-[#d0c5af] truncate">
                          {entry.deviceLabel}{entry.ipAddress ? ` · ${entry.ipAddress}` : ""}
                        </p>
                      </div>
                      <span className="font-data-mono text-[10px] text-slate-400 dark:text-[#d0c5af]/50 shrink-0 mt-0.5">
                        {timeAgo(entry.at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-slate-400 dark:text-[#99907c] mt-4">
                Real login sessions from staff accounts, recorded at every sign-in.
              </p>
            </div>

            {/* Current values summary */}
            <div className={`rounded-xl p-6 bg-emerald-50/50 dark:bg-[#f2ca50]/5 border border-emerald-100 dark:border-[#f2ca50]/20 shadow-sm ${gc}`}>
              <h4 className="font-label-caps text-label-caps text-emerald-700 dark:text-[#f2ca50] mb-3 uppercase">Live Platform Values</h4>
              {settings ? (
                <div className="space-y-2 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-[#d0c5af]">Min deposit</span>
                    <span className="font-data-mono font-bold text-slate-900 dark:text-[#dce3f0]">${settings.minDepositUsd.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-[#d0c5af]">Min withdrawal</span>
                    <span className="font-data-mono font-bold text-slate-900 dark:text-[#dce3f0]">${settings.minWithdrawalUsd.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-[#d0c5af]">Standard fee</span>
                    <span className="font-data-mono font-bold text-slate-900 dark:text-[#dce3f0]">{(settings.standardWithdrawalFeePct * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-[#d0c5af]">Express fee</span>
                    <span className="font-data-mono font-bold text-slate-900 dark:text-[#dce3f0]">{(settings.expressWithdrawalFeePct * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-[#d0c5af]">Lock-up</span>
                    <span className="font-data-mono font-bold text-slate-900 dark:text-[#dce3f0]">{settings.lockupPeriodDays} days</span>
                  </div>
                </div>
              ) : (
                <p className="text-[12px] text-slate-400 dark:text-[#99907c]">Loading…</p>
              )}
              <p className="text-[10px] text-slate-500 dark:text-[#d0c5af]/60 mt-4">
                These values are enforced live across the deposit and withdrawal flows.
              </p>
            </div>
          </div>

          {/* ── Account Security ──────────────────────────────────────────── */}
          <section className={`col-span-12 rounded-xl p-6 space-y-6 bg-white border border-slate-100 shadow-sm ${gc}`}>
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-white/10 pb-4">
              <span className="material-symbols-outlined text-[#d4af37] dark:text-[#f2ca50]">security</span>
              <h3 className="font-label-caps text-label-caps uppercase text-slate-800 dark:text-[#dce3f0] tracking-widest">
                Account Security
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {/* Change Password (real, wired to /api/auth/change-password) */}
              <ChangePasswordCard />

              {/* Session tracking (real) */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-body-md font-bold mb-1 text-slate-900 dark:text-[#dce3f0]">Session Tracking</h4>
                  <p className="text-body-sm text-slate-500 dark:text-[#d0c5af]">Every sign-in is recorded with device and IP.</p>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/5">
                  <span className="text-body-sm text-emerald-600 dark:text-[#4edea3] font-medium">
                    Active — {auditLog.length} recent staff session{auditLog.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              {/* Investor 2FA (real, lives in investor profile) */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-body-md font-bold mb-1 text-slate-900 dark:text-[#dce3f0]">Two-Factor Authentication</h4>
                  <p className="text-body-sm text-slate-500 dark:text-[#d0c5af]">
                    TOTP-based 2FA is available per account. Investors enable it from their Profile Settings → Security tab.
                  </p>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/5">
                  <span className="text-body-sm text-slate-600 dark:text-[#d0c5af] font-medium">Managed per account</span>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* ── Global Action Footer ─────────────────────────────────────────── */}
        <footer className="mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-slate-200 dark:border-white/10 pt-6">
          <div className="flex items-center gap-4 text-slate-400 dark:text-[#d0c5af]/60">
            <span className="material-symbols-outlined text-[18px]">info</span>
            <p className="text-[12px]">
              {settings
                ? `Last updated: ${new Date(settings.updatedAt).toLocaleString()}${settings.updatedByName ? ` by ${settings.updatedByName}` : ""}`
                : "Loading configuration…"}
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleDiscard}
              disabled={!dirty}
              className="px-6 py-2 rounded-lg border border-slate-200 dark:border-[rgba(255,255,255,0.1)] font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-body-sm text-slate-600 dark:text-[#dce3f0] disabled:opacity-50"
            >
              Discard Changes
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="px-6 sm:px-10 py-2 rounded-lg bg-[#d4af37] dark:bg-[#f2ca50] text-white dark:text-[#3c2f00] font-bold hover:brightness-110 shadow-lg dark:shadow-[0_4px_15px_rgba(242,202,80,0.2)] active:scale-95 transition-all text-body-sm disabled:opacity-50"
            >
              {saving ? "Saving…" : "Confirm & Save Settings"}
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
}
