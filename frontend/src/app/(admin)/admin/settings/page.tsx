"use client";

// Direct Stitch → Next.js conversion of System Settings.
// Sidebar + Navbar in (admin)/layout.tsx — only page canvas here.
// Spacing token map: xl→40px(p-10/mb-10), lg→24px(p-6), md→16px(p-4), sm→8px(py-2), xs→4px(py-1)
// Color token map: primary=#d4af37, secondary=#059669, error=#dc2626,
//   on-surface=#0f172a, on-surface-variant=#64748b

import { useState } from "react";

export default function SystemSettingsPage() {
  const [refreshRate, setRefreshRate] = useState(250);

  return (
    <div className="h-full overflow-y-auto bg-[#F8FAFC]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <header className="mb-10">
          <h2 className="font-headline-lg text-headline-lg text-slate-900">System Settings</h2>
          <p className="font-body-md text-body-md text-slate-500">
            Configure institutional parameters and security protocols for the Aurum network.
          </p>
        </header>

        <div className="grid grid-cols-12 gap-6">

          {/* ── General Configuration (col-span-8) ──────────────────────── */}
          <section className="col-span-12 lg:col-span-8 glass-card-light rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
              <span className="material-symbols-outlined text-[#d4af37]">public</span>
              <h3 className="font-label-caps text-label-caps uppercase text-slate-800 tracking-widest">
                General Configuration
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="font-label-caps text-label-caps text-slate-500 uppercase">Platform Name</label>
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-data-mono focus:outline-none focus:border-[#d4af37] focus:shadow-[0_0_10px_rgba(212,175,55,0.15)] text-slate-900"
                  type="text"
                  defaultValue="Aurum Admin"
                />
              </div>
              <div className="space-y-1">
                <label className="font-label-caps text-label-caps text-slate-500 uppercase">System Timezone</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-data-mono focus:outline-none focus:border-[#d4af37] appearance-none text-slate-900">
                  <option>UTC - Greenwich Mean Time</option>
                  <option>EST - Eastern Standard Time</option>
                  <option>HKT - Hong Kong Time</option>
                  <option>SGT - Singapore Time</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-label-caps text-label-caps text-slate-500 uppercase">Primary Currency</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-data-mono focus:outline-none focus:border-[#d4af37] text-slate-900">
                  <option>USD - United States Dollar</option>
                  <option>EUR - Euro</option>
                  <option>XAU - Gold Ounce</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-label-caps text-label-caps text-slate-500 uppercase">Data Refresh Rate</label>
                <div className="flex items-center gap-4">
                  <input
                    className="w-full accent-[#d4af37]"
                    type="range"
                    min={50}
                    max={1000}
                    value={refreshRate}
                    onChange={(e) => setRefreshRate(Number(e.target.value))}
                  />
                  <span className="font-data-mono text-[#d4af37] font-bold">{refreshRate}ms</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button className="bg-[#d4af37] text-white px-10 py-2 rounded-lg font-bold hover:brightness-110 active:scale-95 transition-all text-body-sm shadow-md">
                Save Changes
              </button>
            </div>
          </section>

          {/* ── Security Sidebar (col-span-4) ───────────────────────────── */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* System Health */}
            <div className="glass-card-light rounded-xl p-6 bg-emerald-50/50 border-emerald-100">
              <h4 className="font-label-caps text-label-caps text-emerald-700 mb-2 uppercase">System Health</h4>
              <div className="flex items-center gap-2 text-emerald-600">
                <span className="material-symbols-outlined text-[16px] font-bold">verified</span>
                <span className="font-data-mono text-[12px] font-bold">ALL ENCRYPTION PROTOCOLS ACTIVE</span>
              </div>
              <p className="text-[12px] text-slate-600 mt-4 leading-relaxed">
                Last audit performed 4 hours ago. No breaches detected. HSM modules functioning within
                nominal temperatures.
              </p>
            </div>
            {/* Admin Logs */}
            <div className="glass-card-light rounded-xl p-6">
              <h4 className="font-label-caps text-label-caps text-slate-500 mb-4 uppercase">Admin Logs</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <span className="font-data-mono text-[10px] text-slate-400">14:22:10</span>
                  <span className="font-body-sm text-[12px] flex-1 text-slate-700">
                    IP 192.168.1.1 accessed Security
                  </span>
                </div>
                <div className="flex justify-between items-start gap-4">
                  <span className="font-data-mono text-[10px] text-slate-400">13:45:02</span>
                  <span className="font-body-sm text-[12px] flex-1 text-slate-700">
                    API Key &apos;Trade-Node-A&apos; rotated
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Security Protocols (col-span-12) ────────────────────────── */}
          <section className="col-span-12 glass-card-light rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[#d4af37]">security</span>
                <h3 className="font-label-caps text-label-caps uppercase text-slate-800 tracking-widest">
                  Security Protocols
                </h3>
              </div>
              <span className="text-[10px] bg-red-100 text-red-700 px-4 py-1 rounded uppercase font-bold tracking-tighter">
                High Risk Area
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {/* Two-Factor Auth */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-body-md font-bold mb-1 text-slate-900">Two-Factor Authentication</h4>
                  <p className="text-body-sm text-slate-500">Mandatory for all admin level accounts.</p>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-body-sm text-emerald-600 font-medium">Active: Hardware Token</span>
                  <button className="text-[#d4af37] text-[12px] font-bold underline">Configure</button>
                </div>
              </div>
              {/* API Key Management */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-body-md font-bold mb-1 text-slate-900">API Key Management</h4>
                  <p className="text-body-sm text-slate-500">Manage server-side execution keys.</p>
                </div>
                <button className="w-full border border-slate-200 text-slate-700 py-2 rounded-lg font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">key</span>
                  <span className="text-body-sm">Manage 14 Keys</span>
                </button>
              </div>
              {/* Auto-Logout Timer */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-body-md font-bold mb-1 text-slate-900">Auto-Logout Timer</h4>
                  <p className="text-body-sm text-slate-500">Inactivity duration before forced termination.</p>
                </div>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-data-mono focus:outline-none focus:border-[#d4af37] text-slate-900">
                  <option>15 Minutes</option>
                  <option>30 Minutes (Standard)</option>
                  <option>1 Hour</option>
                  <option>Never (Insecure)</option>
                </select>
              </div>
            </div>
          </section>

          {/* ── Notification Channels (col-span-7) ──────────────────────── */}
          <section className="col-span-12 lg:col-span-7 glass-card-light rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
              <span className="material-symbols-outlined text-[#d4af37]">notifications_active</span>
              <h3 className="font-label-caps text-label-caps uppercase text-slate-800 tracking-widest">
                Notification Channels
              </h3>
            </div>
            <div className="space-y-6">
              {/* Email toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#d4af37]/10 rounded-full flex items-center justify-center text-[#d4af37]">
                    <span className="material-symbols-outlined">mail</span>
                  </div>
                  <div>
                    <p className="font-bold text-body-sm text-slate-900">Email Critical Alerts</p>
                    <p className="text-[12px] text-slate-500">Sent to compliance@aurum.com</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input defaultChecked className="sr-only peer" type="checkbox" />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d4af37]" />
                </label>
              </div>
              {/* Webhook 1 */}
              <div className="space-y-1">
                <label className="font-label-caps text-label-caps text-slate-500 uppercase">
                  Webhook URL (Trade Signals)
                </label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-data-mono text-[13px] focus:outline-none focus:border-[#d4af37] focus:shadow-[0_0_10px_rgba(212,175,55,0.15)] text-slate-900"
                    type="text"
                    defaultValue="https://api.aurum-internal.io/hooks/v1/signals"
                  />
                  <button className="px-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all text-slate-500">
                    <span className="material-symbols-outlined text-[18px]">features</span>
                  </button>
                </div>
              </div>
              {/* Webhook 2 */}
              <div className="space-y-1">
                <label className="font-label-caps text-label-caps text-slate-500 uppercase">
                  Webhook URL (Security Alerts)
                </label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-data-mono text-[13px] focus:outline-none focus:border-[#d4af37] focus:shadow-[0_0_10px_rgba(212,175,55,0.15)] text-slate-900"
                    placeholder="https://external-monitoring.com/hook"
                    type="text"
                  />
                  <button className="px-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all text-slate-500">
                    <span className="material-symbols-outlined text-[18px]">features</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ── Institutional Integrity (col-span-5) ────────────────────── */}
          <section className="col-span-12 lg:col-span-5 glass-card-light rounded-xl p-6 relative overflow-hidden flex flex-col justify-center min-h-[300px]">
            <div className="relative z-10 space-y-4">
              <h4 className="font-headline-md text-headline-md text-slate-900">Institutional Integrity</h4>
              <p className="text-body-sm text-slate-500 leading-relaxed">
                Settings modifications are logged on the immutable ledger. Ensure all changes comply
                with regulatory standards (VASP/MiCA).
              </p>
              <div className="flex items-center gap-10 mt-6">
                <div>
                  <p className="text-[#d4af37] font-data-mono text-[24px] font-bold">99.99%</p>
                  <p className="font-label-caps uppercase text-[10px] text-slate-400 font-bold">Uptime SLA</p>
                </div>
                <div className="h-10 w-px bg-slate-200" />
                <div>
                  <p className="text-emerald-600 font-data-mono text-[24px] font-bold">&lt;1ms</p>
                  <p className="font-label-caps uppercase text-[10px] text-slate-400 font-bold">Latency Goal</p>
                </div>
              </div>
            </div>
            {/* Ambient glows */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#d4af37]/5 blur-[100px] rounded-full" />
              <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-50 blur-[80px] rounded-full" />
            </div>
          </section>

        </div>

        {/* ── Global Action Footer ─────────────────────────────────────────── */}
        <footer className="mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-slate-200 pt-6">
          <div className="flex items-center gap-4 text-slate-400">
            <span className="material-symbols-outlined text-[18px]">info</span>
            <p className="text-[12px]">Last configuration update: Oct 24, 2023 - 10:45 AM UTC</p>
          </div>
          <div className="flex gap-4">
            <button className="px-6 py-2 rounded-lg border border-slate-200 font-bold hover:bg-slate-50 transition-all text-body-sm text-slate-600">
              Discard Changes
            </button>
            <button className="px-6 sm:px-10 py-2 rounded-lg bg-[#d4af37] text-white font-bold hover:brightness-110 shadow-lg active:scale-95 transition-all text-body-sm">
              Confirm &amp; Deploy Settings
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
}
