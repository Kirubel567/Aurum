"use client";

// Direct Stitch → Next.js conversion of User Management Terminal.
// Sidebar + Navbar live in (admin)/layout.tsx — only page canvas here.
// Spacing token map: lg→24px(p-6), md→16px(p-4), sm→8px(p-2), xs→4px(gap-1), xl→40px(mb-10)
// Color token map: primary=#d4af37, secondary=#059669, error=#dc2626,
//   on-surface=#0f172a, on-surface-variant=#64748b

import { useEffect, useState } from "react";

export default function UserManagementPage() {
  const [activeSessions, setActiveSessions] = useState(1204);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveSessions((v) => v + (Math.random() > 0.5 ? 1 : -1));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="p-6 space-y-6 h-full overflow-y-auto bg-[#f8fafc]">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <header className="flex justify-between items-end pb-2 border-b border-slate-200">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-[#0f172a]">User Management</h2>
          <p className="font-body-md text-body-md text-[#64748b]">Monitor and manage institutional client access and KYC compliance.</p>
        </div>
        <div className="flex gap-2">
          <button className="glass-panel px-4 py-2 rounded-lg flex items-center gap-2 text-body-sm hover:bg-slate-50 transition-all">
            <span className="material-symbols-outlined text-sm">download</span>
            Export CSV
          </button>
          <button className="bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37] px-4 py-2 rounded-lg flex items-center gap-2 text-body-sm hover:bg-[#d4af37]/20 transition-all font-bold">
            <span className="material-symbols-outlined text-sm">add</span>
            New User Account
          </button>
        </div>
      </header>

      {/* ── Key Metrics Bento Grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Total Users */}
        <div className="glass-panel p-6 rounded-xl gold-glow relative overflow-hidden group">
          <div className="relative z-10">
            <p className="font-label-caps text-label-caps text-[#64748b] mb-2 uppercase">Total Users</p>
            <div className="flex items-baseline gap-2">
              <span className="font-display-lg text-display-lg font-bold text-[#0f172a]">12,842</span>
              <span className="text-[#059669] font-data-mono text-sm">+4% MoM</span>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity text-slate-400">
            <span className="material-symbols-outlined text-8xl" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
          </div>
        </div>

        {/* Pending KYC */}
        <div className="glass-panel p-6 rounded-xl gold-glow relative overflow-hidden group border-l-4 border-l-[#dc2626]">
          <div className="relative z-10">
            <p className="font-label-caps text-label-caps text-[#64748b] mb-2 uppercase">Pending KYC</p>
            <div className="flex items-baseline gap-2">
              <span className="font-display-lg text-display-lg font-bold text-[#dc2626]">42</span>
              <span className="text-[#dc2626] font-data-mono text-sm font-bold uppercase">Urgent</span>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity text-[#dc2626]">
            <span className="material-symbols-outlined text-8xl" style={{ fontVariationSettings: "'FILL' 1" }}>assignment_late</span>
          </div>
        </div>

        {/* Verified Institutions */}
        <div className="glass-panel p-6 rounded-xl gold-glow relative overflow-hidden group">
          <div className="relative z-10">
            <p className="font-label-caps text-label-caps text-[#64748b] mb-2 uppercase">Verified Institutions</p>
            <div className="flex items-baseline gap-2">
              <span className="font-display-lg text-display-lg font-bold text-[#0f172a]">856</span>
              <span className="text-[#d4af37] font-data-mono text-sm">Tier 3</span>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity text-[#d4af37]">
            <span className="material-symbols-outlined text-8xl" style={{ fontVariationSettings: "'FILL' 1" }}>corporate_fare</span>
          </div>
        </div>

        {/* Active Sessions — live counter */}
        <div className="glass-panel p-6 rounded-xl gold-glow relative overflow-hidden group border-l-4 border-l-[#059669]">
          <div className="relative z-10">
            <p className="font-label-caps text-label-caps text-[#64748b] mb-2 uppercase">Active Sessions</p>
            <div className="flex items-baseline gap-2">
              <span className="font-display-lg text-display-lg font-bold text-[#059669]">{activeSessions.toLocaleString()}</span>
              <span className="text-[#059669] font-data-mono text-sm animate-pulse">Live</span>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity text-[#059669]">
            <span className="material-symbols-outlined text-8xl" style={{ fontVariationSettings: "'FILL' 1" }}>sensors</span>
          </div>
        </div>
      </div>

      {/* ── Filter Row ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass-panel p-4 rounded-xl">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b] text-sm">search</span>
            <input
              className="w-full bg-slate-50 border border-slate-200 rounded px-10 py-2 text-body-sm focus:outline-none focus:border-[#d4af37]/40 text-[#0f172a]"
              placeholder="Filter by Name or UID..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select className="bg-slate-50 border border-slate-200 rounded px-4 py-2 text-body-sm focus:outline-none focus:border-[#d4af37]/40 appearance-none min-w-[140px] text-[#0f172a]">
            <option>All Tiers</option>
            <option>Tier 1 - Retail</option>
            <option>Tier 2 - Pro</option>
            <option>Tier 3 - Institutional</option>
          </select>
          <select className="bg-slate-50 border border-slate-200 rounded px-4 py-2 text-body-sm focus:outline-none focus:border-[#d4af37]/40 appearance-none min-w-[140px] text-[#0f172a]">
            <option>All Status</option>
            <option>Verified</option>
            <option>Pending</option>
            <option>Suspended</option>
          </select>
          <button className="bg-slate-50 border border-slate-200 hover:bg-slate-100 p-2 rounded transition-all text-[#64748b]">
            <span className="material-symbols-outlined text-sm">refresh</span>
          </button>
        </div>
      </div>

      {/* ── Data Table ──────────────────────────────────────────────────── */}
      <div className="glass-panel rounded-xl overflow-hidden bg-white">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 font-label-caps text-label-caps text-[#64748b] uppercase tracking-wider">User Identity</th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-[#64748b] uppercase tracking-wider">Tier Level</th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-[#64748b] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-[#64748b] uppercase tracking-wider">Total Volume (USD)</th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-[#64748b] uppercase tracking-wider">Last Active</th>
                <th className="px-6 py-4 font-label-caps text-label-caps text-[#64748b] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-body-sm">

              {/* Row 1 — Alexander Sterling — Tier 3 Institutional — Verified */}
              <tr className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="w-10 h-10 rounded shadow-sm object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDxw6hw8xOtz7GXu-rZwb51nP9XchZ6ty8IzlJON6T4XxpqMisHWLZ0d1I-oJZwz06Rzk2tO99jOmsp8UvEWrH4iYtryogKfOJqB6iENS2RQkS2UKNaSoA1hIcfbDa1yk8DZdBIgGss78o0XbqmKFUcJdZEbIHjAOiUGB4TIBzryipXKPwYHQWnE5mdkFDeMpsm9aoMneTEYNpZUYCiZSFYwUTUJqSnH1fBTiYOxdjXY62tGW1PNIqepzCEVVqfRQPnmsfzSrlP53Q"
                      alt="Alexander Sterling"
                    />
                    <div>
                      <p className="font-bold text-[#0f172a]">Alexander Sterling</p>
                      <p className="font-data-mono text-xs text-[#64748b]">UID: 8820412</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37] text-[10px] font-bold rounded uppercase tracking-tighter">
                    Tier 3 - Institutional
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#059669]" />
                    <span className="text-[#059669] font-bold">Verified</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-data-mono text-[#0f172a] font-semibold">$12,450,200.00</td>
                <td className="px-6 py-4 font-data-mono text-[#64748b]">2 mins ago</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                    <button className="hover:text-[#d4af37] transition-colors"><span className="material-symbols-outlined text-md">edit</span></button>
                    <button className="hover:text-[#dc2626] transition-colors"><span className="material-symbols-outlined text-md">block</span></button>
                    <button className="hover:text-[#059669] transition-colors"><span className="material-symbols-outlined text-md">list_alt</span></button>
                  </div>
                </td>
              </tr>

              {/* Row 2 — Elena Rodriguez — Tier 2 Pro — Pending */}
              <tr className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="w-10 h-10 rounded shadow-sm object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBINHTsODF3ZAis2jax1B4Vb4erU6Z2y_Yolt1cwnL3YrZV15zWgsM5gBtuKFn5Zt6tU2RQxo4VpmSPhVlXCVAy5ISO4ynMyGPCSRhm4BAB5-rNadmLm891ycs2K8sh2nBWhKvIYRWkXFIV3_q2AAhsEkB08_y9MCeFQb2-L-t80-UgJkAkQwOviuWbv0VZfAs8D9SRAHGRwfqSKHatnW2cH_ciG7BFB68VCY4l1Y5R4MxJA09n-FPtX3AxIPZQrAlkmGm9keJihx8"
                      alt="Elena Rodriguez"
                    />
                    <div>
                      <p className="font-bold text-[#0f172a]">Elena Rodriguez</p>
                      <p className="font-data-mono text-xs text-[#64748b]">UID: 9144021</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-slate-100 border border-slate-200 text-[#0f172a] text-[10px] font-bold rounded uppercase tracking-tighter">
                    Tier 2 - Pro
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse" />
                    <span className="text-[#d4af37] font-bold">Pending</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-data-mono text-[#0f172a] font-semibold">$420,150.00</td>
                <td className="px-6 py-4 font-data-mono text-[#64748b]">14 mins ago</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                    <button className="hover:text-[#d4af37] transition-colors"><span className="material-symbols-outlined text-md">edit</span></button>
                    <button className="hover:text-[#dc2626] transition-colors"><span className="material-symbols-outlined text-md">block</span></button>
                    <button className="hover:text-[#059669] transition-colors"><span className="material-symbols-outlined text-md">list_alt</span></button>
                  </div>
                </td>
              </tr>

              {/* Row 3 — Marcus Chen — Tier 1 Retail — Verified */}
              <tr className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="w-10 h-10 rounded shadow-sm object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFknTKtQKzbcPHLtpeJNCF3KMrXpUS6kduT6xyimqRSmOlsSWEYKjn7q_KiuJNn1f2inTQ7Ach8aKEkBaSGSUA4H6rQJQOOFv0-ZQyi0LqjLV0lpxzh75k-VkvhKl2H2lnu9JvdjLdbdeCIJ_fhlFVYYzYpCbyP0mgArhGkdqRx3rz_Ix_e8BSCxDtKk3UvZ8weCQtTQbJaQ8vrzsfnUukMQ4t8ylQq0ZXGI--5YeOVVrR_LTjwy1nde-vpmRzJuV4aFCVXmPXlqk"
                      alt="Marcus Chen"
                    />
                    <div>
                      <p className="font-bold text-[#0f172a]">Marcus Chen</p>
                      <p className="font-data-mono text-xs text-[#64748b]">UID: 7721590</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-slate-50 border border-slate-100 text-[#64748b] text-[10px] font-bold rounded uppercase tracking-tighter">
                    Tier 1 - Retail
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#059669]" />
                    <span className="text-[#059669] font-bold">Verified</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-data-mono text-[#0f172a] font-semibold">$88,400.00</td>
                <td className="px-6 py-4 font-data-mono text-[#64748b]">3 hours ago</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                    <button className="hover:text-[#d4af37] transition-colors"><span className="material-symbols-outlined text-md">edit</span></button>
                    <button className="hover:text-[#dc2626] transition-colors"><span className="material-symbols-outlined text-md">block</span></button>
                    <button className="hover:text-[#059669] transition-colors"><span className="material-symbols-outlined text-md">list_alt</span></button>
                  </div>
                </td>
              </tr>

              {/* Row 4 — Sophia Van Der Berg — Tier 3 Institutional — Suspended */}
              <tr className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="w-10 h-10 rounded shadow-sm object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDN26jWaMhGqy41tK-PZOV8I7yCXy9v1LBgZs7XXKsdN7ka_JZDzeXsA5UQdhi_kECZdDy3AU3GHuCoOqaZ5iBVCfrZleVB_JAtrEU26XYUTQVC8QJIAhHQQbO2fdzkUF7IZCiM080k6UPO0nUUOwM7T7-j3YsVEtPwnsrBOtbvqX5xJWkg03B-47o2mQt4aOhR_tcEdgyyB6fsPvsu2mkp_Mh_A4gGi1n1gSMiMOpbGpUJMf49pwAy_aCoAWWGjkv97pogIZyqLyI"
                      alt="Sophia Van Der Berg"
                    />
                    <div>
                      <p className="font-bold text-[#0f172a]">Sophia Van Der Berg</p>
                      <p className="font-data-mono text-xs text-[#64748b]">UID: 6650392</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37] text-[10px] font-bold rounded uppercase tracking-tighter">
                    Tier 3 - Institutional
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#dc2626]" />
                    <span className="text-[#dc2626] font-bold">Suspended</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-data-mono text-[#0f172a] font-semibold">$25,600,000.00</td>
                <td className="px-6 py-4 font-data-mono text-[#64748b]">4 days ago</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                    <button className="hover:text-[#d4af37] transition-colors"><span className="material-symbols-outlined text-md">edit</span></button>
                    <button className="hover:text-[#059669] transition-colors"><span className="material-symbols-outlined text-md">lock_open</span></button>
                    <button className="hover:text-[#059669] transition-colors"><span className="material-symbols-outlined text-md">list_alt</span></button>
                  </div>
                </td>
              </tr>

            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="bg-slate-50 px-6 py-2 border-t border-slate-200 flex items-center justify-between">
          <p className="text-body-sm text-[#64748b]">
            Showing <span className="font-bold text-[#0f172a]">1 - 10</span> of 12,842 users
          </p>
          <div className="flex items-center gap-1">
            <button className="p-1 rounded hover:bg-slate-200 text-[#64748b] disabled:opacity-30" disabled>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button className="w-8 h-8 rounded bg-[#d4af37] text-white text-xs font-bold shadow-sm">1</button>
            <button className="w-8 h-8 rounded hover:bg-slate-200 text-[#64748b] text-xs">2</button>
            <button className="w-8 h-8 rounded hover:bg-slate-200 text-[#64748b] text-xs">3</button>
            <span className="text-[#64748b] mx-1">...</span>
            <button className="w-8 h-8 rounded hover:bg-slate-200 text-[#64748b] text-xs">1285</button>
            <button className="p-1 rounded hover:bg-slate-200 text-[#64748b]">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── System Alerts / Compliance Logs Grid ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* KYC Escalation Queue */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-6 space-y-4 bg-white">
          <div className="flex items-center justify-between">
            <h3 className="font-label-caps text-label-caps text-[#d4af37] uppercase">KYC Escalation Queue</h3>
            <span className="px-2 py-0.5 bg-[#dc2626]/10 text-[#dc2626] text-[10px] font-bold rounded">12 CRITICAL</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 gold-glow transition-all">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[#d4af37]">description</span>
                <div>
                  <p className="text-body-sm font-bold text-[#0f172a]">Invesco Cap Fund - Application</p>
                  <p className="text-[10px] text-[#64748b]">Submission ID: KYC-9921-X</p>
                </div>
              </div>
              <button className="text-xs bg-[#d4af37] text-white font-bold px-4 py-1.5 rounded shadow-sm hover:bg-[#d4af37]/90">
                REVIEW
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 gold-glow transition-all">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[#d4af37]">verified</span>
                <div>
                  <p className="text-body-sm font-bold text-[#0f172a]">Blue Whale Assets L.P.</p>
                  <p className="text-[10px] text-[#64748b]">Update: Beneficial Ownership Change</p>
                </div>
              </div>
              <button className="text-xs bg-[#d4af37] text-white font-bold px-4 py-1.5 rounded shadow-sm hover:bg-[#d4af37]/90">
                REVIEW
              </button>
            </div>
          </div>
        </div>

        {/* Terminal Security Logs */}
        <div className="glass-panel rounded-xl p-6 space-y-4 bg-white">
          <h3 className="font-label-caps text-label-caps text-[#64748b] uppercase">Terminal Security Logs</h3>
          <div className="space-y-4 custom-scrollbar max-h-48 overflow-y-auto pr-2">
            <div className="border-l-4 border-[#d4af37] pl-4 py-1">
              <p className="text-xs font-data-mono text-[#059669]">12:04:33 GMT</p>
              <p className="text-body-sm text-[#0f172a]">Admin root: user 8820412 status -&gt; Verified</p>
            </div>
            <div className="border-l-4 border-[#dc2626] pl-4 py-1">
              <p className="text-xs font-data-mono text-[#dc2626]">11:58:21 GMT</p>
              <p className="text-body-sm text-[#0f172a]">Suspicious activity: user 6650392 -&gt; Automated Lock</p>
            </div>
            <div className="border-l-4 border-slate-200 pl-4 py-1">
              <p className="text-xs font-data-mono text-[#64748b]">11:45:10 GMT</p>
              <p className="text-body-sm text-[#0f172a]">Export generated: All_Institutional_v2.csv</p>
            </div>
          </div>
          <button className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-[#64748b] text-xs font-bold rounded uppercase tracking-widest transition-all">
            View Complete Audit Trail
          </button>
        </div>

      </div>
    </main>
  );
}
