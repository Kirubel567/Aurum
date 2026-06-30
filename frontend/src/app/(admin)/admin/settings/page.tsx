"use client";

// Stitch dark tokens:
// glass-card: rgba(25,32,42,0.4) + blur(12px) + border rgba(255,255,255,0.1) + top-line gradient gold
// body bg: #050B14   surface: #0d141d   surface-container-low: #151c26
// primary: #f2ca50   primary-container: #d4af37   on-primary: #3c2f00
// secondary: #4edea3   error: #ffb4ab   error-container: #93000a
// on-surface: #dce3f0   on-surface-variant: #d0c5af   outline-variant: #4d4635

import { useState } from "react";

// ── mock admin log entries (newest-first, live-appended on save) ──────────────
const INITIAL_LOGS = [
  { time: "14:22:10", text: "IP 192.168.1.1 accessed Security" },
  { time: "13:45:02", text: "API Key 'Trade-Node-A' rotated" },
  { time: "11:30:55", text: "Notification webhook updated" },
  { time: "09:12:44", text: "Auto-logout timer set to 30 min" },
];

const MOCK_API_KEYS = [
  { id: "ak-001", label: "Trade-Node-A",    created: "Oct 12, 2023", status: "Active"  },
  { id: "ak-002", label: "Analytics-Feed",  created: "Sep 28, 2023", status: "Active"  },
  { id: "ak-003", label: "Compliance-Hook", created: "Aug 05, 2023", status: "Active"  },
  { id: "ak-004", label: "Backup-Node-B",   created: "Jul 19, 2023", status: "Revoked" },
];

// glass-card class helper (all dark tokens inline to avoid global CSS conflicts)
const gc = [
  "dark:bg-[rgba(25,32,42,0.4)]",
  "dark:[backdrop-filter:blur(12px)]",
  "dark:border-[rgba(255,255,255,0.1)]",
  // top gold shimmer via box-shadow instead of ::before pseudo-element
  "dark:[box-shadow:inset_0_1px_0_rgba(212,175,55,0.18)]",
].join(" ");

const inp = [
  "w-full rounded-lg px-4 py-2 font-data-mono text-[13px] outline-none transition-all",
  "bg-slate-50 border border-slate-200 text-slate-900",
  "focus:border-[#d4af37] focus:shadow-[0_0_10px_rgba(212,175,55,0.15)]",
  "dark:bg-black/20 dark:border-[rgba(255,255,255,0.1)] dark:text-[#dce3f0]",
  "dark:focus:border-[#f2ca50] dark:focus:shadow-[0_0_10px_rgba(242,202,80,0.2)]",
].join(" ");

const sel = inp + " appearance-none";

function now() {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-[#d4af37] dark:bg-[#f2ca50]" : "bg-slate-200 dark:bg-white/10"}`}>
      <span className={`absolute top-[2px] left-[2px] w-5 h-5 rounded-full shadow transition-transform
        ${checked ? "translate-x-5 bg-white dark:bg-[#3c2f00]" : "bg-white dark:bg-white/40"}`} />
    </button>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[300] pointer-events-none
      bg-[#0d141d] dark:bg-[rgba(25,32,42,0.95)] dark:border dark:border-[rgba(242,202,80,0.3)]
      text-white dark:text-[#f2ca50] text-sm font-bold px-6 py-3 rounded-xl shadow-2xl animate-fade-in">
      {msg}
    </div>
  );
}

// ── API Keys Modal ────────────────────────────────────────────────────────────
function ApiKeysModal({ keys, onClose, onRevoke, onRotate }:
  { keys: typeof MOCK_API_KEYS; onClose: () => void; onRevoke: (id: string) => void; onRotate: (id: string) => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-[#050b14]/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-lg rounded-xl p-6 shadow-2xl
        bg-white dark:bg-[rgba(25,32,42,0.95)] dark:[backdrop-filter:blur(12px)]
        border border-slate-100 dark:border-[rgba(255,255,255,0.1)]`}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-headline-md text-headline-md font-bold text-slate-900 dark:text-[#dce3f0]">API Key Management</h3>
          <button onClick={onClose} className="material-symbols-outlined text-slate-400 dark:text-[#d0c5af] hover:text-slate-900 dark:hover:text-white">close</button>
        </div>
        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-[rgba(255,255,255,0.05)]">
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-[#dce3f0]">{k.label}</p>
                <p className="text-[10px] text-slate-400 dark:text-[#d0c5af] font-data-mono">Created: {k.created}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${k.status === "Active" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-[#4edea3]" : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-[#d0c5af] line-through"}`}>{k.status}</span>
                {k.status === "Active" && (
                  <>
                    <button onClick={() => onRotate(k.id)} className="text-[11px] font-bold text-[#d4af37] dark:text-[#f2ca50] hover:underline">Rotate</button>
                    <button onClick={() => onRevoke(k.id)} className="text-[11px] font-bold text-red-500 dark:text-[#ffb4ab] hover:underline">Revoke</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-5 w-full py-2 bg-[#d4af37] dark:bg-[#f2ca50] text-white dark:text-[#3c2f00] font-bold rounded-lg text-sm hover:brightness-110 active:scale-95 transition-all">Close</button>
      </div>
    </div>
  );
}

// ── 2FA Config Modal ──────────────────────────────────────────────────────────
function TwoFAModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"view" | "setup">("view");
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-[#050b14]/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl p-6 shadow-2xl bg-white dark:bg-[rgba(25,32,42,0.95)] dark:[backdrop-filter:blur(12px)] border border-slate-100 dark:border-[rgba(255,255,255,0.1)]">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-headline-md font-bold text-slate-900 dark:text-[#dce3f0]">2FA Configuration</h3>
          <button onClick={onClose} className="material-symbols-outlined text-slate-400 dark:text-[#d0c5af] hover:text-slate-900 dark:hover:text-white">close</button>
        </div>
        {step === "view" ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-lg flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-600 dark:text-[#4edea3]">verified</span>
              <div>
                <p className="font-bold text-sm text-emerald-700 dark:text-[#4edea3]">Hardware Token Active</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">YubiKey 5C NFC — Serial #AK99210</p>
              </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-[#d0c5af]">All admin-level accounts require hardware 2FA. Backup codes were generated on setup.</p>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#dce3f0] rounded-lg font-bold text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={() => setStep("setup")} className="flex-1 py-2 bg-[#d4af37] dark:bg-[#f2ca50] text-white dark:text-[#3c2f00] rounded-lg font-bold text-sm hover:brightness-110 transition-all">Re-configure</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-[#d0c5af]">Insert your hardware token and press the button to register it as your primary 2FA device.</p>
            <div className="p-6 border-2 border-dashed border-[#d4af37]/30 dark:border-[#f2ca50]/20 rounded-lg text-center space-y-2">
              <span className="material-symbols-outlined text-4xl text-[#d4af37] dark:text-[#f2ca50]">usb</span>
              <p className="text-sm font-bold text-slate-700 dark:text-[#dce3f0]">Waiting for hardware token…</p>
            </div>
            <button onClick={onClose} className="w-full py-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#dce3f0] rounded-lg font-bold text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-all">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SystemSettingsPage() {
  const [refreshRate, setRefreshRate]   = useState(250);
  const [platformName, setPlatformName] = useState("Aurum Admin");
  const [timezone, setTimezone]         = useState("UTC - Greenwich Mean Time");
  const [currency, setCurrency]         = useState("USD - United States Dollar");
  const [logoutTimer, setLogoutTimer]   = useState("30 Minutes (Standard)");
  const [emailAlerts, setEmailAlerts]   = useState(true);
  const [webhookTrade, setWebhookTrade] = useState("https://api.aurum-internal.io/hooks/v1/signals");
  const [webhookSec, setWebhookSec]     = useState("");
  const [logs, setLogs]                 = useState(INITIAL_LOGS);
  const [apiKeys, setApiKeys]           = useState(MOCK_API_KEYS);
  const [toast, setToast]               = useState<string | null>(null);
  const [showApiModal, setShowApiModal] = useState(false);
  const [show2FA, setShow2FA]           = useState(false);
  const [lastUpdate, setLastUpdate]     = useState("Oct 24, 2023 - 10:45 AM UTC");

  function addLog(text: string) {
    setLogs((prev) => [{ time: now(), text }, ...prev.slice(0, 9)]);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleSaveGeneral() {
    addLog(`General config saved — tz: ${timezone.split(" ")[0]}, currency: ${currency.split(" ")[0]}, refresh: ${refreshRate}ms`);
    setLastUpdate(new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " UTC");
    showToast("General configuration saved.");
  }

  function handleDeploy() {
    addLog("Confirm & Deploy executed by admin.");
    setLastUpdate(new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " UTC");
    showToast("Settings deployed successfully.");
  }

  function handleDiscard() {
    setPlatformName("Aurum Admin");
    setTimezone("UTC - Greenwich Mean Time");
    setCurrency("USD - United States Dollar");
    setRefreshRate(250);
    setLogoutTimer("30 Minutes (Standard)");
    setWebhookTrade("https://api.aurum-internal.io/hooks/v1/signals");
    setWebhookSec("");
    addLog("Config discarded — reverted to last saved state.");
    showToast("Changes discarded.");
  }

  function testWebhook(url: string, label: string) {
    if (!url) { showToast("Enter a webhook URL first."); return; }
    addLog(`Webhook test sent: ${label}`);
    showToast(`Test ping sent to ${label}.`);
  }

  function revokeKey(id: string) {
    const key = apiKeys.find((k) => k.id === id);
    setApiKeys((prev) => prev.map((k) => k.id === id ? { ...k, status: "Revoked" } : k));
    addLog(`API Key '${key?.label}' revoked.`);
    showToast(`Key '${key?.label}' revoked.`);
  }

  function rotateKey(id: string) {
    const key = apiKeys.find((k) => k.id === id);
    addLog(`API Key '${key?.label}' rotated.`);
    showToast(`Key '${key?.label}' rotated — new secret issued.`);
  }

  return (
    <div className="h-full overflow-y-auto bg-[#F8FAFC] dark:bg-[#050b14]">
      {toast && <Toast msg={toast} />}
      {showApiModal && <ApiKeysModal keys={apiKeys} onClose={() => setShowApiModal(false)} onRevoke={revokeKey} onRotate={rotateKey} />}
      {show2FA  && <TwoFAModal onClose={() => setShow2FA(false)} />}

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <header className="mb-10">
          <h2 className="font-headline-lg text-headline-lg text-slate-900 dark:text-[#dce3f0]">System Settings</h2>
          <p className="font-body-md text-body-md text-slate-500 dark:text-[#d0c5af]">
            Configure institutional parameters and security protocols for the Aurum network.
          </p>
        </header>

        <div className="grid grid-cols-12 gap-6">

          {/* ── General Configuration ─────────────────────────────────────── */}
          <section className={`col-span-12 lg:col-span-8 rounded-xl p-6 space-y-6
            bg-white border border-slate-100 shadow-sm ${gc}`}>
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-white/10 pb-4">
              <span className="material-symbols-outlined text-[#d4af37] dark:text-[#f2ca50]">public</span>
              <h3 className="font-label-caps text-label-caps uppercase text-slate-800 dark:text-[#dce3f0] tracking-widest">
                General Configuration
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] uppercase">Platform Name</label>
                <input className={inp} type="text" value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] uppercase">System Timezone</label>
                <select className={sel} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                  <option>UTC - Greenwich Mean Time</option>
                  <option>EST - Eastern Standard Time</option>
                  <option>HKT - Hong Kong Time</option>
                  <option>SGT - Singapore Time</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] uppercase">Primary Currency</label>
                <select className={sel} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option>USD - United States Dollar</option>
                  <option>EUR - Euro</option>
                  <option>XAU - Gold Ounce</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] uppercase">Data Refresh Rate</label>
                <div className="flex items-center gap-4">
                  <input className="w-full accent-[#d4af37] dark:accent-[#f2ca50]" type="range"
                    min={50} max={1000} step={50} value={refreshRate}
                    onChange={(e) => setRefreshRate(Number(e.target.value))} />
                  <span className="font-data-mono text-[#d4af37] dark:text-[#f2ca50] font-bold w-16 text-right">{refreshRate}ms</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button onClick={handleSaveGeneral}
                className="bg-[#d4af37] dark:bg-[#f2ca50] text-white dark:text-[#3c2f00] px-10 py-2 rounded-lg font-bold hover:brightness-110 active:scale-95 transition-all text-body-sm shadow-md dark:shadow-[0_0_20px_rgba(242,202,80,0.15)]">
                Save Changes
              </button>
            </div>
          </section>

          {/* ── Security Sidebar ──────────────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* System Health */}
            <div className={`rounded-xl p-6 bg-emerald-50/50 dark:bg-[#f2ca50]/5 border border-emerald-100 dark:border-[#f2ca50]/20 shadow-sm ${gc}`}>
              <h4 className="font-label-caps text-label-caps text-emerald-700 dark:text-[#f2ca50] mb-2 uppercase">System Health</h4>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-[#4edea3]">
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                <span className="font-data-mono text-[12px] font-bold">ALL ENCRYPTION PROTOCOLS ACTIVE</span>
              </div>
              <p className="text-[12px] text-slate-600 dark:text-[#d0c5af] mt-4 leading-relaxed">
                Last audit performed 4 hours ago. No breaches detected. HSM modules functioning within nominal temperatures.
              </p>
            </div>
            {/* Admin Logs */}
            <div className={`rounded-xl p-6 bg-white border border-slate-100 shadow-sm ${gc}`}>
              <h4 className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] mb-4 uppercase">Admin Logs</h4>
              <div className="space-y-3 max-h-48 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(212,175,55,0.2)_transparent]">
                {logs.map((l, i) => (
                  <div key={i} className="flex justify-between items-start gap-4 border-l-2 border-[#d4af37]/30 dark:border-[#f2ca50]/30 pl-3">
                    <span className="font-data-mono text-[10px] text-slate-400 dark:text-[#d0c5af]/50 shrink-0">{l.time}</span>
                    <span className="font-body-sm text-[12px] flex-1 text-slate-700 dark:text-[#dce3f0]">{l.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Security Protocols ────────────────────────────────────────── */}
          <section className={`col-span-12 rounded-xl p-6 space-y-6 bg-white border border-slate-100 shadow-sm ${gc}`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[#d4af37] dark:text-[#f2ca50]">security</span>
                <h3 className="font-label-caps text-label-caps uppercase text-slate-800 dark:text-[#dce3f0] tracking-widest">
                  Security Protocols
                </h3>
              </div>
              <span className="text-[10px] bg-red-100 dark:bg-[#93000a] text-red-700 dark:text-[#ffb4ab] px-4 py-1 rounded uppercase font-bold tracking-tighter">
                High Risk Area
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {/* 2FA */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-body-md font-bold mb-1 text-slate-900 dark:text-[#dce3f0]">Two-Factor Authentication</h4>
                  <p className="text-body-sm text-slate-500 dark:text-[#d0c5af]">Mandatory for all admin level accounts.</p>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/5">
                  <span className="text-body-sm text-emerald-600 dark:text-[#4edea3] font-medium">Active: Hardware Token</span>
                  <button onClick={() => setShow2FA(true)}
                    className="text-[#d4af37] dark:text-[#f2ca50] text-[12px] font-bold underline hover:opacity-80 transition-opacity">
                    Configure
                  </button>
                </div>
              </div>
              {/* API Key Management */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-body-md font-bold mb-1 text-slate-900 dark:text-[#dce3f0]">API Key Management</h4>
                  <p className="text-body-sm text-slate-500 dark:text-[#d0c5af]">Manage server-side execution keys.</p>
                </div>
                <button onClick={() => setShowApiModal(true)}
                  className="w-full border border-[#d4af37]/30 dark:border-[#f2ca50]/30 text-[#d4af37] dark:text-[#f2ca50] py-2 rounded-lg font-bold hover:bg-[#d4af37]/5 dark:hover:bg-[#f2ca50]/5 transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">key</span>
                  <span className="text-body-sm">Manage {apiKeys.filter((k) => k.status === "Active").length + 10} Keys</span>
                </button>
              </div>
              {/* Auto-Logout Timer */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-body-md font-bold mb-1 text-slate-900 dark:text-[#dce3f0]">Auto-Logout Timer</h4>
                  <p className="text-body-sm text-slate-500 dark:text-[#d0c5af]">Inactivity duration before forced termination.</p>
                </div>
                <select className={sel} value={logoutTimer}
                  onChange={(e) => { setLogoutTimer(e.target.value); addLog(`Auto-logout timer set to ${e.target.value}`); }}>
                  <option>15 Minutes</option>
                  <option>30 Minutes (Standard)</option>
                  <option>1 Hour</option>
                  <option>Never (Insecure)</option>
                </select>
              </div>
            </div>
          </section>

          {/* ── Notification Channels ─────────────────────────────────────── */}
          <section className={`col-span-12 lg:col-span-7 rounded-xl p-6 space-y-6 bg-white border border-slate-100 shadow-sm ${gc}`}>
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-white/10 pb-4">
              <span className="material-symbols-outlined text-[#d4af37] dark:text-[#f2ca50]">notifications_active</span>
              <h3 className="font-label-caps text-label-caps uppercase text-slate-800 dark:text-[#dce3f0] tracking-widest">
                Notification Channels
              </h3>
            </div>
            <div className="space-y-6">
              {/* Email toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#d4af37]/10 dark:bg-[#f2ca50]/10 rounded-full flex items-center justify-center text-[#d4af37] dark:text-[#f2ca50]">
                    <span className="material-symbols-outlined">mail</span>
                  </div>
                  <div>
                    <p className="font-bold text-body-sm text-slate-900 dark:text-[#dce3f0]">Email Critical Alerts</p>
                    <p className="text-[12px] text-slate-500 dark:text-[#d0c5af]">Sent to compliance@aurum.com</p>
                  </div>
                </div>
                <Toggle checked={emailAlerts} onChange={() => {
                  setEmailAlerts((v) => !v);
                  addLog(`Email alerts ${!emailAlerts ? "enabled" : "disabled"}.`);
                }} />
              </div>
              {/* Webhook Trade */}
              <div className="space-y-1">
                <label className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] uppercase">
                  Webhook URL (Trade Signals)
                </label>
                <div className="flex gap-2">
                  <input className={inp} type="text" value={webhookTrade} onChange={(e) => setWebhookTrade(e.target.value)} />
                  <button onClick={() => testWebhook(webhookTrade, "Trade Signals")}
                    className="px-3 border border-slate-200 dark:border-[rgba(255,255,255,0.1)] rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-slate-500 dark:text-[#d0c5af]">
                    <span className="material-symbols-outlined text-[18px]">features</span>
                  </button>
                </div>
              </div>
              {/* Webhook Security */}
              <div className="space-y-1">
                <label className="font-label-caps text-label-caps text-slate-500 dark:text-[#d0c5af] uppercase">
                  Webhook URL (Security Alerts)
                </label>
                <div className="flex gap-2">
                  <input className={inp} placeholder="https://external-monitoring.com/hook" type="text"
                    value={webhookSec} onChange={(e) => setWebhookSec(e.target.value)} />
                  <button onClick={() => testWebhook(webhookSec, "Security Alerts")}
                    className="px-3 border border-slate-200 dark:border-[rgba(255,255,255,0.1)] rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-slate-500 dark:text-[#d0c5af]">
                    <span className="material-symbols-outlined text-[18px]">features</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ── Institutional Integrity ───────────────────────────────────── */}
          <section className={`col-span-12 lg:col-span-5 rounded-xl p-6 relative overflow-hidden flex flex-col justify-center min-h-[300px]
            bg-white border border-slate-100 shadow-sm ${gc}`}>
            <div className="relative z-10 space-y-4">
              <h4 className="font-headline-md text-headline-md text-slate-900 dark:text-[#dce3f0]">Institutional Integrity</h4>
              <p className="text-body-sm text-slate-500 dark:text-[#d0c5af] leading-relaxed">
                Settings modifications are logged on the immutable ledger. Ensure all changes comply with regulatory standards (VASP/MiCA).
              </p>
              <div className="flex items-center gap-10 mt-6">
                <div>
                  <p className="text-[#d4af37] dark:text-[#f2ca50] font-data-mono text-[24px] font-bold">99.99%</p>
                  <p className="font-label-caps uppercase text-[10px] text-slate-400 dark:text-[#d0c5af]/50 font-bold">Uptime SLA</p>
                </div>
                <div className="h-10 w-px bg-slate-200 dark:bg-white/10" />
                <div>
                  <p className="text-emerald-600 dark:text-[#4edea3] font-data-mono text-[24px] font-bold">&lt;1ms</p>
                  <p className="font-label-caps uppercase text-[10px] text-slate-400 dark:text-[#d0c5af]/50 font-bold">Latency Goal</p>
                </div>
              </div>
            </div>
            {/* Ambient glows */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#d4af37]/5 dark:bg-[#f2ca50]/10 blur-[100px] rounded-full" />
              <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-50 dark:bg-[#4edea3]/5 blur-[80px] rounded-full" />
            </div>
          </section>

        </div>

        {/* ── Global Action Footer ─────────────────────────────────────────── */}
        <footer className="mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-slate-200 dark:border-white/10 pt-6">
          <div className="flex items-center gap-4 text-slate-400 dark:text-[#d0c5af]/60">
            <span className="material-symbols-outlined text-[18px]">info</span>
            <p className="text-[12px]">Last configuration update: {lastUpdate}</p>
          </div>
          <div className="flex gap-4">
            <button onClick={handleDiscard}
              className="px-6 py-2 rounded-lg border border-slate-200 dark:border-[rgba(255,255,255,0.1)] font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-body-sm text-slate-600 dark:text-[#dce3f0]">
              Discard Changes
            </button>
            <button onClick={handleDeploy}
              className="px-6 sm:px-10 py-2 rounded-lg bg-[#d4af37] dark:bg-[#f2ca50] text-white dark:text-[#3c2f00] font-bold hover:brightness-110 shadow-lg dark:shadow-[0_4px_15px_rgba(242,202,80,0.2)] active:scale-95 transition-all text-body-sm">
              Confirm &amp; Deploy Settings
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
}
