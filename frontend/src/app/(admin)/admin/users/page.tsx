"use client";

// Stitch dark tokens:
// glass-panel: rgba(25,32,42,0.4) + blur(12px) + border rgba(255,255,255,0.05) / border-top rgba(255,255,255,0.1)
// primary: #f2ca50   on-primary: #3c2f00   secondary: #4edea3   error: #ffb4ab
// on-surface: #dce3f0   on-surface-variant: #d0c5af
// surface: #0d141d   surface-container: #19202a   surface-container-lowest: #080f18

import { useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type UserStatus = "Verified" | "Pending" | "Suspended";
type UserTier   = "Tier 1 - Retail" | "Tier 2 - Pro" | "Tier 3 - Institutional";

type User = {
  uid: string; name: string; avatar?: string; initials?: string;
  tier: UserTier; status: UserStatus; volume: string; lastActive: string;
  assignedManagerId?: string;
};

type Manager = {
  id: string; name: string; initials: string; avatar?: string;
  specialization: string; investorCount: number; maxCapacity: number;
  status: "Available" | "Busy" | "At Capacity";
  since?: string;
};

type LogEntry = { time: string; text: string; kind: "gold" | "red" | "muted" };

// ── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK_MANAGERS: Manager[] = [
  { id: "mgr-001", name: "Abebe Girma",      initials: "AG", specialization: "Forex & Commodities",  investorCount: 8,  maxCapacity: 15, status: "Available" },
  { id: "mgr-002", name: "Liya Tadesse",     initials: "LT", specialization: "Crypto & Digital Assets", investorCount: 12, maxCapacity: 15, status: "Busy"      },
  { id: "mgr-003", name: "Dawit Bekele",     initials: "DB", specialization: "Institutional Equity",  investorCount: 5,  maxCapacity: 15, status: "Available" },
  { id: "mgr-004", name: "Selamawit Haile",  initials: "SH", specialization: "Fixed Income & Bonds",  investorCount: 15, maxCapacity: 15, status: "At Capacity"},
  { id: "mgr-005", name: "Yonas Tesfaye",    initials: "YT", specialization: "Multi-Asset Portfolio", investorCount: 3,  maxCapacity: 15, status: "Available" },
];

const INITIAL_USERS: User[] = [
  { uid: "8820412", name: "Alexander Sterling",  avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDxw6hw8xOtz7GXu-rZwb51nP9XchZ6ty8IzlJON6T4XxpqMisHWLZ0d1I-oJZwz06Rzk2tO99jOmsp8UvEWrH4iYtryogKfOJqB6iENS2RQkS2UKNaSoA1hIcfbDa1yk8DZdBIgGss78o0XbqmKFUcJdZEbIHjAOiUGB4TIBzryipXKPwYHQWnE5mdkFDeMpsm9aoMneTEYNpZUYCiZSFYwUTUJqSnH1fBTiYOxdjXY62tGW1PNIqepzCEVVqfRQPnmsfzSrlP53Q", tier: "Tier 3 - Institutional", status: "Verified",  volume: "$12,450,200.00", lastActive: "2 mins ago",  assignedManagerId: "mgr-001" },
  { uid: "9144021", name: "Elena Rodriguez",     avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBINHTsODF3ZAis2jax1B4Vb4erU6Z2y_Yolt1cwnL3YrZV15zWgsM5gBtuKFn5Zt6tU2RQxo4VpmSPhVlXCVAy5ISO4ynMyGPCSRhm4BAB5-rNadmLm891ycs2K8sh2nBWhKvIYRWkXFIV3_q2AAhsEkB08_y9MCeFQb2-L-t80-UgJkAkQwOviuWbv0VZfAs8D9SRAHGRwfqSKHatnW2cH_ciG7BFB68VCY4l1Y5R4MxJA09n-FPtX3AxIPZQrAlkmGm9keJihx8",  tier: "Tier 2 - Pro",           status: "Pending",   volume: "$420,150.00",    lastActive: "14 mins ago", assignedManagerId: undefined },
  { uid: "7721590", name: "Marcus Chen",         avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAFknTKtQKzbcPHLtpeJNCF3KMrXpUS6kduT6xyimqRSmOlsSWEYKjn7q_KiuJNn1f2inTQ7Ach8aKEkBaSGSUA4H6rQJQOOFv0-ZQyi0LqjLV0lpxzh75k-VkvhKl2H2lnu9JvdjLdbdeCIJ_fhlFVYYzYpCbyP0mgArhGkdqRx3rz_Ix_e8BSCxDtKk3UvZ8weCQtTQbJaQ8vrzsfnUukMQ4t8ylQq0ZXGI--5YeOVVrR_LTjwy1nde-vpmRzJuV4aFCVXmPXlqk",  tier: "Tier 1 - Retail",        status: "Verified",  volume: "$88,400.00",     lastActive: "3 hours ago", assignedManagerId: "mgr-003" },
  { uid: "6650392", name: "Sophia Van Der Berg", avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDN26jWaMhGqy41tK-PZOV8I7yCXy9v1LBgZs7XXKsdN7ka_JZDzeXsA5UQdhi_kECZdDy3AU3GHuCoOqaZ5iBVCfrZleVB_JAtrEU26XYUTQVC8QJIAhHQQbO2fdzkUF7IZCiM080k6UPO0nUUOwM7T7-j3YsVEtPwnsrBOtbvqX5xJWkg03B-47o2mQt4aOhR_tcEdgyyB6fsPvsu2mkp_Mh_A4gGi1n1gSMiMOpbGpUJMf49pwAy_aCoAWWGjkv97pogIZyqLyI", tier: "Tier 3 - Institutional", status: "Suspended", volume: "$25,600,000.00", lastActive: "4 days ago",  assignedManagerId: "mgr-002" },
];

const INITIAL_LOGS: LogEntry[] = [
  { time: "12:04:33 GMT", text: "Admin root: user 8820412 status → Verified",         kind: "gold"  },
  { time: "11:58:21 GMT", text: "Suspicious activity: user 6650392 → Automated Lock", kind: "red"   },
  { time: "11:45:10 GMT", text: "Export generated: All_Institutional_v2.csv",         kind: "muted" },
];

const TIER_BADGE: Record<UserTier, string> = {
  "Tier 3 - Institutional": "bg-[#d4af37]/10 dark:bg-[#f2ca50]/10 border border-[#d4af37]/20 dark:border-[#f2ca50]/30 text-[#d4af37] dark:text-[#f2ca50]",
  "Tier 2 - Pro":           "bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/20 text-slate-700 dark:text-[#dce3f0]",
  "Tier 1 - Retail":        "bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 text-slate-500 dark:text-[#d0c5af]",
};

const STATUS_DOT: Record<Manager["status"], string> = {
  "Available":   "bg-[#059669] dark:bg-[#4edea3]",
  "Busy":        "bg-[#d4af37] dark:bg-[#f2ca50] animate-pulse",
  "At Capacity": "bg-[#dc2626] dark:bg-[#ffb4ab]",
};
const STATUS_BADGE: Record<Manager["status"], string> = {
  "Available":   "bg-emerald-50 dark:bg-[#4edea3]/10 text-emerald-700 dark:text-[#4edea3] border-emerald-200 dark:border-[#4edea3]/20",
  "Busy":        "bg-[#d4af37]/10 dark:bg-[#f2ca50]/10 text-[#b08d1a] dark:text-[#f2ca50] border-[#d4af37]/20 dark:border-[#f2ca50]/20",
  "At Capacity": "bg-red-50 dark:bg-[#ffb4ab]/10 text-red-700 dark:text-[#ffb4ab] border-red-200 dark:border-[#ffb4ab]/20",
};

const gp = "dark:bg-[rgba(25,32,42,0.4)] dark:[backdrop-filter:blur(12px)] dark:border-[rgba(255,255,255,0.05)] dark:[border-top:1px_solid_rgba(255,255,255,0.1)]";

function now() {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "GMT" }) + " GMT";
}

// ── Assign Manager Modal ──────────────────────────────────────────────────────
function AssignManagerModal({
  investor, managers, onAssign, onClose,
}: {
  investor: User;
  managers: Manager[];
  onAssign: (investorUid: string, managerId: string | null) => void;
  onClose: () => void;
}) {
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<string | null>(investor.assignedManagerId ?? null);
  const currentMgr = managers.find((m) => m.id === investor.assignedManagerId);

  const filtered = managers.filter((m) =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.specialization.toLowerCase().includes(search.toLowerCase())
  );

  function loadBar(m: Manager) {
    const pct = Math.round((m.investorCount / m.maxCapacity) * 100);
    const color = pct >= 100 ? "bg-[#dc2626] dark:bg-[#ffb4ab]" : pct >= 75 ? "bg-[#d4af37] dark:bg-[#f2ca50]" : "bg-[#059669] dark:bg-[#4edea3]";
    return { pct, color };
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 dark:bg-[#050b14]/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[rgba(19,26,36,0.98)] dark:[backdrop-filter:blur(20px)]
                      w-full max-w-2xl rounded-2xl shadow-2xl dark:shadow-none
                      border border-slate-100 dark:border-[rgba(255,255,255,0.08)]
                      dark:[box-shadow:inset_0_1px_0_rgba(242,202,80,0.12),0_32px_64px_rgba(0,0,0,0.6)]
                      overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-headline-md text-headline-md font-bold text-[#0f172a] dark:text-[#dce3f0]">
                Assign Account Manager
              </h3>
              <p className="text-body-sm text-slate-500 dark:text-[#d0c5af] mt-0.5">
                Select a manager for <span className="font-bold text-[#0f172a] dark:text-[#dce3f0]">{investor.name}</span>
                <span className="ml-2 font-data-mono text-[11px] opacity-60">UID {investor.uid}</span>
              </p>
            </div>
            <button onClick={onClose} className="material-symbols-outlined text-slate-400 dark:text-[#d0c5af] hover:text-slate-900 dark:hover:text-white transition-colors">close</button>
          </div>

          {/* Investor context chip */}
          <div className="flex items-center gap-3 mt-4 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
            {investor.avatar
              ? <img src={investor.avatar} alt={investor.name} className="w-9 h-9 rounded-lg object-cover" />
              : <div className="w-9 h-9 rounded-lg bg-[#d4af37]/10 dark:bg-[#f2ca50]/20 flex items-center justify-center text-[#d4af37] dark:text-[#f2ca50] font-bold text-sm">{investor.initials}</div>
            }
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-[#0f172a] dark:text-[#dce3f0]">{investor.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${TIER_BADGE[investor.tier]}`}>{investor.tier}</span>
                <span className="text-[11px] font-data-mono text-slate-400 dark:text-[#d0c5af]">{investor.volume}</span>
              </div>
            </div>
            {currentMgr ? (
              <div className="text-right shrink-0">
                <p className="text-[10px] text-slate-400 dark:text-[#d0c5af] uppercase tracking-wider">Currently</p>
                <p className="text-sm font-bold text-[#d4af37] dark:text-[#f2ca50]">{currentMgr.name}</p>
              </div>
            ) : (
              <span className="text-[11px] font-bold text-slate-400 dark:text-[#d0c5af] bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-lg">Unassigned</span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-white/5 shrink-0">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#d0c5af] text-[18px]">search</span>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or specialization…"
              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-lg pl-9 pr-4 py-2 text-sm text-[#0f172a] dark:text-[#dce3f0] placeholder-slate-400 dark:placeholder-[#d0c5af]/50 outline-none focus:border-[#d4af37]/40 dark:focus:border-[#f2ca50]/40"
            />
          </div>
        </div>

        {/* Manager cards */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 [scrollbar-width:thin] [scrollbar-color:rgba(212,175,55,0.2)_transparent]">
          {filtered.map((m) => {
            const { pct, color } = loadBar(m);
            const isSelected = selected === m.id;
            const isCurrent  = investor.assignedManagerId === m.id;

            return (
              <button key={m.id} type="button"
                onClick={() => setSelected(isSelected ? null : m.id)}
                disabled={m.status === "At Capacity" && !isCurrent}
                className={[
                  "w-full text-left p-4 rounded-xl border transition-all group",
                  isSelected
                    ? "border-[#d4af37] dark:border-[#f2ca50] bg-[#d4af37]/5 dark:bg-[#f2ca50]/5 shadow-[0_0_0_1px_rgba(212,175,55,0.2)] dark:shadow-[0_0_0_1px_rgba(242,202,80,0.15)]"
                    : m.status === "At Capacity" && !isCurrent
                      ? "border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] opacity-50 cursor-not-allowed"
                      : "border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.03] hover:border-[#d4af37]/30 dark:hover:border-[#f2ca50]/20 hover:bg-white dark:hover:bg-white/[0.06]",
                ].join(" ")}>

                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className={[
                    "w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-colors",
                    isSelected
                      ? "bg-[#d4af37] dark:bg-[#f2ca50] text-white dark:text-[#3c2f00]"
                      : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-[#d0c5af]"
                  ].join(" ")}>
                    {m.initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-[#0f172a] dark:text-[#dce3f0]">{m.name}</p>
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#d4af37]/10 dark:bg-[#f2ca50]/10 text-[#d4af37] dark:text-[#f2ca50] border border-[#d4af37]/20 dark:border-[#f2ca50]/20">
                          Current
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${STATUS_BADGE[m.status]}`}>
                        {m.status}
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-500 dark:text-[#d0c5af] mt-0.5">{m.specialization}</p>

                    {/* Load bar */}
                    <div className="mt-2.5 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] font-data-mono text-slate-500 dark:text-[#d0c5af] shrink-0">
                        {m.investorCount}/{m.maxCapacity} investors
                      </span>
                    </div>
                  </div>

                  {/* Checkmark */}
                  <div className={[
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
                    isSelected
                      ? "border-[#d4af37] dark:border-[#f2ca50] bg-[#d4af37] dark:bg-[#f2ca50]"
                      : "border-slate-300 dark:border-white/20"
                  ].join(" ")}>
                    {isSelected && <span className="material-symbols-outlined text-[12px] text-white dark:text-[#3c2f00]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>}
                  </div>
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-10 text-slate-400 dark:text-[#d0c5af]">No managers match your search.</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 shrink-0 flex items-center justify-between gap-3">
          <div className="text-[12px] text-slate-400 dark:text-[#d0c5af]">
            {selected
              ? <>Assigning <span className="font-bold text-[#0f172a] dark:text-[#dce3f0]">{managers.find((m) => m.id === selected)?.name}</span></>
              : investor.assignedManagerId ? "Click a manager to change assignment, or remove below." : "No manager selected."
            }
          </div>
          <div className="flex gap-2">
            {investor.assignedManagerId && (
              <button onClick={() => onAssign(investor.uid, null)}
                className="px-4 py-2 rounded-lg border border-red-200 dark:border-[#ffb4ab]/20 text-red-600 dark:text-[#ffb4ab] text-sm font-bold hover:bg-red-50 dark:hover:bg-[#ffb4ab]/5 transition-all">
                Remove Assignment
              </button>
            )}
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#dce3f0] text-sm font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button
              disabled={!selected || selected === investor.assignedManagerId}
              onClick={() => { if (selected) onAssign(investor.uid, selected); }}
              className="px-5 py-2 rounded-lg bg-[#d4af37] dark:bg-[#f2ca50] text-white dark:text-[#3c2f00] text-sm font-bold hover:brightness-110 active:scale-95 transition-all shadow-sm dark:shadow-[0_0_12px_rgba(242,202,80,0.2)] disabled:opacity-40 disabled:cursor-not-allowed">
              Confirm Assignment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UserManagementPage() {
  const [users, setUsers]           = useState<User[]>(INITIAL_USERS);
  const [managers, setManagers]     = useState<Manager[]>(MOCK_MANAGERS);
  const [logs, setLogs]             = useState<LogEntry[]>(INITIAL_LOGS);
  const [activeSessions, setActiveSessions] = useState(1204);
  const [search, setSearch]         = useState("");
  const [tierFilter, setTierFilter] = useState("All Tiers");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [page, setPage]             = useState(1);

  // Modals
  const [editUser, setEditUser]         = useState<User | null>(null);
  const [detailUser, setDetailUser]     = useState<User | null>(null);
  const [kycItem, setKycItem]           = useState<string | null>(null);
  const [newUserOpen, setNewUserOpen]   = useState(false);
  const [auditOpen, setAuditOpen]       = useState(false);
  const [assignTarget, setAssignTarget] = useState<User | null>(null);

  // New-user form
  const [newName, setNewName]           = useState("");
  const [newEmail, setNewEmail]         = useState("");
  const [newRole, setNewRole]           = useState<"investor" | "admin">("investor");
  const [newTier, setNewTier]           = useState<UserTier>("Tier 1 - Retail");
  const [newPhone, setNewPhone]         = useState("");
  const [newCountry, setNewCountry]     = useState("");
  const [creating, setCreating]         = useState(false);
  const [createResult, setCreateResult] = useState<{ password?: string; warning?: string; error?: string } | null>(null);
  const uidRef = useRef(9999000);

  useEffect(() => {
    const id = setInterval(() => setActiveSessions((v) => v + (Math.random() > 0.5 ? 1 : -1)), 5000);
    return () => clearInterval(id);
  }, []);

  function addLog(text: string, kind: LogEntry["kind"] = "gold") {
    setLogs((prev) => [{ time: now(), text, kind }, ...prev.slice(0, 19)]);
  }

  // ── Assign manager ─────────────────────────────────────────────────────────
  function handleAssign(investorUid: string, managerId: string | null) {
    const investor = users.find((u) => u.uid === investorUid);
    const prevMgrId = investor?.assignedManagerId;

    // Update user
    setUsers((prev) => prev.map((u) => u.uid === investorUid ? { ...u, assignedManagerId: managerId ?? undefined } : u));

    // Adjust manager counts
    setManagers((prev) => prev.map((m) => {
      let count = m.investorCount;
      if (m.id === prevMgrId)  count = Math.max(0, count - 1);
      if (m.id === managerId)  count = count + 1;
      const status: Manager["status"] = count >= m.maxCapacity ? "At Capacity" : count >= m.maxCapacity * 0.75 ? "Busy" : "Available";
      return { ...m, investorCount: count, status };
    }));

    const mgrName = managerId ? managers.find((m) => m.id === managerId)?.name : null;
    if (mgrName) {
      addLog(`Manager assigned: ${mgrName} → ${investor?.name} (UID ${investorUid})`, "gold");
    } else {
      addLog(`Manager removed from ${investor?.name} (UID ${investorUid})`, "muted");
    }
    setAssignTarget(null);
  }

  // ── User mutations ─────────────────────────────────────────────────────────
  function suspendUser(uid: string) {
    setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, status: "Suspended" } : u));
    addLog(`Admin root: user ${uid} status → Suspended`, "red");
  }
  function reinstateUser(uid: string) {
    setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, status: "Verified" } : u));
    addLog(`Admin root: user ${uid} status → Verified`, "gold");
  }
  function saveEdit(updated: User) {
    setUsers((prev) => prev.map((u) => u.uid === updated.uid ? updated : u));
    addLog(`Admin root: user ${updated.uid} profile updated.`, "gold");
    setEditUser(null);
  }

  async function createUser() {
    if (!newName.trim() || !newEmail.trim()) return;
    setCreating(true); setCreateResult(null);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: newName.trim(), email: newEmail.trim(), role: newRole, tier: newTier, phone: newPhone.trim(), country: newCountry.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setCreateResult({ error: json.error ?? "Unknown error" });
      } else {
        const uid = String(uidRef.current++);
        setUsers((prev) => [{ uid, name: newName.trim(), initials: newName.trim().split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(), tier: newTier, status: newRole === "admin" ? "Verified" : "Pending", volume: "$0.00", lastActive: "just now" }, ...prev]);
        addLog(`Admin root: new ${newRole} "${newName.trim()}" (${newEmail.trim()}) created.`, "gold");
        if (json.temporaryPassword) {
          setCreateResult({ password: json.temporaryPassword, warning: json.warning });
        } else {
          setNewName(""); setNewEmail(""); setNewPhone(""); setNewCountry(""); setNewRole("investor"); setCreateResult(null); setNewUserOpen(false);
        }
      }
    } catch { setCreateResult({ error: "Network error — could not reach server." }); }
    finally { setCreating(false); }
  }

  function exportCSV() {
    const rows = ["UID,Name,Tier,Status,Volume,Last Active,Assigned Manager",
      ...users.map((u) => {
        const mgr = managers.find((m) => m.id === u.assignedManagerId)?.name ?? "Unassigned";
        return `${u.uid},${u.name},${u.tier},${u.status},${u.volume},${u.lastActive},${mgr}`;
      })];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "users_export.csv"; a.click();
    addLog("Export generated: users_export.csv", "muted");
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (!q || u.name.toLowerCase().includes(q) || u.uid.includes(q))
      && (tierFilter === "All Tiers" || u.tier === tierFilter)
      && (statusFilter === "All Status" || u.status === statusFilter);
  });

  // Manager → investors map for the Relationship Overview
  const managerRoster = managers.map((m) => ({
    ...m,
    investors: users.filter((u) => u.assignedManagerId === m.id),
  }));

  return (
    <main className="px-4 sm:p-6 pt-6 space-y-6 h-full overflow-y-auto bg-[#f8fafc] dark:bg-[#050b14]">

      {/* Assign Manager Modal */}
      {assignTarget && (
        <AssignManagerModal
          investor={assignTarget}
          managers={managers}
          onAssign={handleAssign}
          onClose={() => setAssignTarget(null)}
        />
      )}

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 pb-2 border-b border-slate-200 dark:border-white/5">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-[#0f172a] dark:text-[#dce3f0]">User Management</h2>
          <p className="font-body-md text-body-md text-[#64748b] dark:text-[#d0c5af]">Monitor, manage and assign account managers to institutional clients.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className={`glass-panel ${gp} px-4 py-2 rounded-lg flex items-center gap-2 text-body-sm text-slate-700 dark:text-[#dce3f0] hover:bg-slate-50 dark:hover:bg-white/10 transition-all`}>
            <span className="material-symbols-outlined text-sm">download</span>Export CSV
          </button>
          <button onClick={() => setNewUserOpen(true)}
            className="bg-[#d4af37]/10 dark:bg-[#f2ca50]/10 border border-[#d4af37]/20 dark:border-[#f2ca50]/20 text-[#d4af37] dark:text-[#f2ca50] px-4 py-2 rounded-lg flex items-center gap-2 text-body-sm hover:bg-[#d4af37]/20 dark:hover:bg-[#f2ca50]/20 transition-all font-bold">
            <span className="material-symbols-outlined text-sm">add</span>New User Account
          </button>
        </div>
      </header>

      {/* ── Key Metrics ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users",          value: (users.length + 12838).toLocaleString(), sub: "+4% MoM",  subColor: "text-[#059669] dark:text-[#4edea3]", icon: "group",          accentL: "", accentD: "" },
          { label: "Pending KYC",          value: String(users.filter((u) => u.status === "Pending").length + 40), sub: "Urgent", subColor: "text-[#dc2626] dark:text-[#ffb4ab]", icon: "assignment_late", accentL: "border-l-4 border-l-[#dc2626]", accentD: "dark:border-l-[#ffb4ab]" },
          { label: "Verified Institutions",value: "856",   sub: "Tier 3",  subColor: "text-[#d4af37] dark:text-[#f2ca50]", icon: "corporate_fare", accentL: "", accentD: "" },
          { label: "Active Sessions",       value: activeSessions.toLocaleString(), sub: "Live", subColor: "text-[#059669] dark:text-[#4edea3] animate-pulse", icon: "sensors", accentL: "border-l-4 border-l-[#059669]", accentD: "dark:border-l-[#4edea3]" },
        ].map((c) => (
          <div key={c.label} className={`glass-panel ${gp} p-6 rounded-xl relative overflow-hidden group ${c.accentL} ${c.accentD}`}>
            <p className="font-label-caps text-label-caps text-[#64748b] dark:text-[#d0c5af] mb-2 uppercase">{c.label}</p>
            <div className="flex items-baseline gap-2">
              <span className="font-display-lg text-display-lg font-bold text-[#0f172a] dark:text-[#dce3f0]">{c.value}</span>
              <span className={`font-data-mono text-sm font-bold ${c.subColor}`}>{c.sub}</span>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity text-slate-400 dark:text-[#dce3f0]">
              <span className="material-symbols-outlined text-8xl" style={{ fontVariationSettings: "'FILL' 1" }}>{c.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Row ───────────────────────────────────────────────────── */}
      <div className={`flex flex-col md:flex-row gap-4 items-center justify-between glass-panel ${gp} p-4 rounded-xl`}>
        <div className="relative flex-1 md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b] dark:text-[#d0c5af] text-sm">search</span>
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded px-10 py-2 text-body-sm text-[#0f172a] dark:text-[#dce3f0] placeholder-slate-400 dark:placeholder-[#d0c5af]/50 focus:outline-none focus:border-[#d4af37]/40 dark:focus:border-[#f2ca50]/40"
            placeholder="Filter by Name or UID..." type="text" />
        </div>
        <div className="flex items-center gap-2">
          <select value={tierFilter} onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
            className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded px-4 py-2 text-body-sm text-[#0f172a] dark:text-[#dce3f0] focus:outline-none appearance-none min-w-[140px]">
            <option>All Tiers</option><option>Tier 1 - Retail</option><option>Tier 2 - Pro</option><option>Tier 3 - Institutional</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded px-4 py-2 text-body-sm text-[#0f172a] dark:text-[#dce3f0] focus:outline-none appearance-none min-w-[140px]">
            <option>All Status</option><option>Verified</option><option>Pending</option><option>Suspended</option>
          </select>
          <button onClick={() => { setSearch(""); setTierFilter("All Tiers"); setStatusFilter("All Status"); setPage(1); }}
            className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 p-2 rounded transition-all text-[#64748b] dark:text-[#d0c5af]">
            <span className="material-symbols-outlined text-sm">refresh</span>
          </button>
        </div>
      </div>

      {/* ── Data Table ───────────────────────────────────────────────────── */}
      <div className={`glass-panel ${gp} rounded-xl overflow-hidden bg-white dark:bg-transparent`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                {["User Identity","Tier Level","Status","Account Manager","Total Volume (USD)","Last Active",""].map((h) => (
                  <th key={h} className={`px-5 py-4 font-label-caps text-label-caps text-[#64748b] dark:text-[#d0c5af] uppercase tracking-wider ${h === "" ? "text-right" : ""}`}>{h || "Actions"}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-body-sm">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400 dark:text-[#d0c5af]">No users match the current filters.</td></tr>
              )}
              {filtered.map((u) => {
                const assignedMgr = managers.find((m) => m.id === u.assignedManagerId);
                return (
                  <tr key={u.uid} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {u.avatar
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img className="w-9 h-9 rounded-lg shadow-sm object-cover" src={u.avatar} alt={u.name} />
                          : <div className="w-9 h-9 rounded-lg bg-[#d4af37]/10 dark:bg-[#f2ca50]/20 flex items-center justify-center text-[#d4af37] dark:text-[#f2ca50] font-bold text-sm">{u.initials}</div>
                        }
                        <div>
                          <p className="font-bold text-[#0f172a] dark:text-[#dce3f0]">{u.name}</p>
                          <p className="font-data-mono text-[11px] text-[#64748b] dark:text-[#d0c5af]">UID: {u.uid}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-tighter ${TIER_BADGE[u.tier]}`}>{u.tier}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${u.status === "Verified" ? "bg-[#059669] dark:bg-[#4edea3]" : u.status === "Pending" ? "bg-[#d4af37] dark:bg-[#f2ca50] animate-pulse" : "bg-[#dc2626] dark:bg-[#ffb4ab]"}`} />
                        <span className={`font-bold ${u.status === "Verified" ? "text-[#059669] dark:text-[#4edea3]" : u.status === "Pending" ? "text-[#d4af37] dark:text-[#f2ca50]" : "text-[#dc2626] dark:text-[#ffb4ab]"}`}>{u.status}</span>
                      </div>
                    </td>
                    {/* ── Assigned Manager cell ── */}
                    <td className="px-5 py-4">
                      {assignedMgr ? (
                        <button onClick={() => setAssignTarget({ ...u })}
                          className="flex items-center gap-2 group/mgr hover:opacity-80 transition-opacity text-left">
                          <div className="w-7 h-7 rounded-lg bg-[#d4af37] dark:bg-[#f2ca50] flex items-center justify-center text-[9px] font-bold text-white dark:text-[#3c2f00] shrink-0">
                            {assignedMgr.initials}
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-[#0f172a] dark:text-[#dce3f0] leading-none">{assignedMgr.name}</p>
                            <p className="text-[10px] text-[#64748b] dark:text-[#d0c5af] mt-0.5">{assignedMgr.specialization}</p>
                          </div>
                          <span className="material-symbols-outlined text-[14px] text-[#64748b] dark:text-[#d0c5af] opacity-0 group-hover/mgr:opacity-100 transition-opacity ml-1">edit</span>
                        </button>
                      ) : (
                        <button onClick={() => setAssignTarget({ ...u })}
                          className="flex items-center gap-1.5 text-[12px] font-bold text-[#d4af37] dark:text-[#f2ca50] hover:opacity-80 transition-opacity border border-dashed border-[#d4af37]/30 dark:border-[#f2ca50]/30 px-2.5 py-1 rounded-lg">
                          <span className="material-symbols-outlined text-[14px]">person_add</span>
                          Assign
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-4 font-data-mono text-[#0f172a] dark:text-[#dce3f0] font-semibold">{u.volume}</td>
                    <td className="px-5 py-4 font-data-mono text-[#64748b] dark:text-[#d0c5af]">{u.lastActive}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditUser({ ...u })} title="Edit"
                          className="hover:text-[#d4af37] dark:hover:text-[#f2ca50] transition-colors text-slate-500 dark:text-[#d0c5af]">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button onClick={() => setAssignTarget({ ...u })} title="Assign Manager"
                          className="hover:text-[#d4af37] dark:hover:text-[#f2ca50] transition-colors text-slate-500 dark:text-[#d0c5af]">
                          <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                        </button>
                        {u.status === "Suspended"
                          ? <button onClick={() => reinstateUser(u.uid)} title="Reinstate" className="hover:text-[#059669] dark:hover:text-[#4edea3] transition-colors text-slate-500 dark:text-[#d0c5af]"><span className="material-symbols-outlined text-[18px]">lock_open</span></button>
                          : <button onClick={() => suspendUser(u.uid)}    title="Suspend"   className="hover:text-[#dc2626] dark:hover:text-[#ffb4ab] transition-colors text-slate-500 dark:text-[#d0c5af]"><span className="material-symbols-outlined text-[18px]">block</span></button>
                        }
                        <button onClick={() => setDetailUser(u)} title="Activity Log" className="hover:text-[#059669] dark:hover:text-[#4edea3] transition-colors text-slate-500 dark:text-[#d0c5af]">
                          <span className="material-symbols-outlined text-[18px]">list_alt</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 dark:bg-white/5 px-6 py-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
          <p className="text-body-sm text-[#64748b] dark:text-[#d0c5af]">
            Showing <span className="font-bold text-[#0f172a] dark:text-[#dce3f0]">{Math.min(10 * page, filtered.length || 12842)}</span> of {(filtered.length + 12838).toLocaleString()} users
          </p>
          <div className="flex items-center gap-1">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-[#64748b] dark:text-[#d0c5af] disabled:opacity-30"><span className="material-symbols-outlined">chevron_left</span></button>
            {[1,2,3].map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded text-xs font-bold transition-colors ${page === n ? "bg-[#d4af37] dark:bg-[#f2ca50] text-white dark:text-[#3c2f00]" : "hover:bg-slate-200 dark:hover:bg-white/5 text-[#64748b] dark:text-[#d0c5af]"}`}>{n}</button>
            ))}
            <span className="text-[#64748b] dark:text-[#d0c5af] mx-1">…</span>
            <button className="w-8 h-8 rounded hover:bg-slate-200 dark:hover:bg-white/5 text-[#64748b] dark:text-[#d0c5af] text-xs">1285</button>
            <button disabled={page === 3} onClick={() => setPage((p) => p + 1)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-[#64748b] dark:text-[#d0c5af] disabled:opacity-30"><span className="material-symbols-outlined">chevron_right</span></button>
          </div>
        </div>
      </div>

      {/* ── Account Manager Relationship Overview ─────────────────────────── */}
      <div className={`glass-panel ${gp} rounded-xl p-6 bg-white dark:bg-transparent space-y-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#d4af37] dark:text-[#f2ca50]">account_tree</span>
            <h3 className="font-label-caps text-label-caps text-[#d4af37] dark:text-[#f2ca50] uppercase tracking-widest">Account Manager Roster</h3>
          </div>
          <span className="text-[10px] font-bold text-[#64748b] dark:text-[#d0c5af] bg-slate-100 dark:bg-white/5 px-2 py-1 rounded">
            {managers.filter((m) => m.status !== "At Capacity").length} of {managers.length} available
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {managerRoster.map((m) => {
            const pct   = Math.round((m.investorCount / m.maxCapacity) * 100);
            const barCl = pct >= 100 ? "bg-[#dc2626] dark:bg-[#ffb4ab]" : pct >= 75 ? "bg-[#d4af37] dark:bg-[#f2ca50]" : "bg-[#059669] dark:bg-[#4edea3]";
            return (
              <div key={m.id} className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-3">
                {/* Manager header */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-[#d4af37] dark:bg-[#f2ca50] flex items-center justify-center text-xs font-bold text-white dark:text-[#3c2f00]">{m.initials}</div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#19202a] ${STATUS_DOT[m.status]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[#0f172a] dark:text-[#dce3f0] truncate">{m.name}</p>
                    <p className="text-[11px] text-[#64748b] dark:text-[#d0c5af] truncate">{m.specialization}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${STATUS_BADGE[m.status]}`}>{m.status}</span>
                </div>

                {/* Load bar */}
                <div>
                  <div className="flex justify-between text-[10px] text-[#64748b] dark:text-[#d0c5af] mb-1 font-data-mono">
                    <span>Book Load</span><span>{m.investorCount}/{m.maxCapacity}</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barCl}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Assigned investors */}
                {m.investors.length > 0 ? (
                  <div className="space-y-1">
                    {m.investors.map((inv) => (
                      <div key={inv.uid} className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-white/5 first:border-0">
                        <div className="flex items-center gap-2">
                          {inv.avatar
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={inv.avatar} alt={inv.name} className="w-5 h-5 rounded object-cover" />
                            : <div className="w-5 h-5 rounded bg-[#d4af37]/10 dark:bg-[#f2ca50]/20 flex items-center justify-center text-[8px] font-bold text-[#d4af37] dark:text-[#f2ca50]">{inv.initials}</div>
                          }
                          <span className="text-[12px] text-[#0f172a] dark:text-[#dce3f0] font-medium truncate max-w-[120px]">{inv.name}</span>
                        </div>
                        <button onClick={() => setAssignTarget({ ...inv })}
                          className="text-[10px] text-[#64748b] dark:text-[#d0c5af] hover:text-[#d4af37] dark:hover:text-[#f2ca50] transition-colors font-bold">
                          Reassign
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 dark:text-[#d0c5af]/50 italic">No investors assigned yet.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KYC Queue */}
        <div className={`lg:col-span-2 glass-panel ${gp} rounded-xl p-6 space-y-4 bg-white dark:bg-transparent`}>
          <div className="flex items-center justify-between">
            <h3 className="font-label-caps text-label-caps text-[#d4af37] dark:text-[#f2ca50] uppercase">KYC Escalation Queue</h3>
            <span className="px-2 py-0.5 bg-[#dc2626]/10 dark:bg-[#ffb4ab]/10 text-[#dc2626] dark:text-[#ffb4ab] text-[10px] font-bold rounded">12 CRITICAL</span>
          </div>
          <div className="space-y-2">
            {[
              { icon: "description", name: "Invesco Cap Fund - Application",  sub: "Submission ID: KYC-9921-X" },
              { icon: "verified",    name: "Blue Whale Assets L.P.",          sub: "Update: Beneficial Ownership Change" },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/5 transition-all">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-[#d4af37] dark:text-[#f2ca50]">{item.icon}</span>
                  <div>
                    <p className="text-body-sm font-bold text-[#0f172a] dark:text-[#dce3f0]">{item.name}</p>
                    <p className="text-[10px] text-[#64748b] dark:text-[#d0c5af]">{item.sub}</p>
                  </div>
                </div>
                <button onClick={() => setKycItem(item.name)}
                  className="text-xs bg-[#d4af37]/20 dark:bg-[#f2ca50]/20 hover:bg-[#d4af37]/30 dark:hover:bg-[#f2ca50]/30 text-[#d4af37] dark:text-[#f2ca50] font-bold px-4 py-1.5 rounded transition-colors">
                  REVIEW
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Security Logs */}
        <div className={`glass-panel ${gp} rounded-xl p-6 space-y-4 bg-white dark:bg-transparent`}>
          <h3 className="font-label-caps text-label-caps text-[#64748b] dark:text-[#d0c5af] uppercase">Terminal Security Logs</h3>
          <div className="space-y-4 max-h-48 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(212,175,55,0.2)_transparent] pr-1">
            {logs.slice(0, 8).map((log, i) => (
              <div key={i} className={`border-l-4 pl-4 py-1 ${log.kind === "gold" ? "border-[#d4af37] dark:border-[#f2ca50]" : log.kind === "red" ? "border-[#dc2626] dark:border-[#ffb4ab]" : "border-slate-200 dark:border-white/10"}`}>
                <p className={`text-xs font-data-mono ${log.kind === "gold" ? "text-[#059669] dark:text-[#4edea3]" : log.kind === "red" ? "text-[#dc2626] dark:text-[#ffb4ab]" : "text-[#64748b] dark:text-[#d0c5af]"}`}>{log.time}</p>
                <p className="text-body-sm text-[#0f172a] dark:text-[#dce3f0]">{log.text}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setAuditOpen(true)}
            className="w-full py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-[#64748b] dark:text-[#d0c5af] text-xs font-bold rounded uppercase tracking-widest transition-all">
            View Complete Audit Trail
          </button>
        </div>
      </div>

      {/* ══ Modals ══════════════════════════════════════════════════════════ */}

      {editUser && (
        <Modal onClose={() => setEditUser(null)} title="Edit User">
          <div className="space-y-4">
            <Field label="Name"><input className={inp} value={editUser.name} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} /></Field>
            <Field label="Tier">
              <select className={inp} value={editUser.tier} onChange={(e) => setEditUser({ ...editUser, tier: e.target.value as UserTier })}>
                <option>Tier 1 - Retail</option><option>Tier 2 - Pro</option><option>Tier 3 - Institutional</option>
              </select>
            </Field>
            <Field label="Status">
              <select className={inp} value={editUser.status} onChange={(e) => setEditUser({ ...editUser, status: e.target.value as UserStatus })}>
                <option>Verified</option><option>Pending</option><option>Suspended</option>
              </select>
            </Field>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditUser(null)} className={cancelBtn}>Cancel</button>
              <button onClick={() => saveEdit(editUser)} className={primaryBtn}>Save Changes</button>
            </div>
          </div>
        </Modal>
      )}

      {detailUser && (
        <Modal onClose={() => setDetailUser(null)} title={`Activity — ${detailUser.name}`}>
          <div className="space-y-3 text-sm">
            <InfoRow label="UID" value={detailUser.uid} />
            <InfoRow label="Tier" value={detailUser.tier} />
            <InfoRow label="Status" value={detailUser.status} />
            <InfoRow label="Total Volume" value={detailUser.volume} />
            <InfoRow label="Last Active" value={detailUser.lastActive} />
            <InfoRow label="Account Manager" value={managers.find((m) => m.id === detailUser.assignedManagerId)?.name ?? "Unassigned"} />
            <div className="pt-2 border-t border-slate-100 dark:border-white/10 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 dark:text-[#d0c5af] uppercase tracking-widest">Recent Transactions</p>
              {["BTC deposit 0.12 BTC — 2 days ago","USDT withdrawal $5,000 — 4 days ago","ETH deposit 2.1 ETH — 6 days ago"].map((t) => (
                <p key={t} className="text-[12px] text-slate-600 dark:text-[#dce3f0] font-data-mono border-l-2 border-[#d4af37] dark:border-[#f2ca50] pl-3">{t}</p>
              ))}
            </div>
            <button onClick={() => setDetailUser(null)} className={`w-full mt-2 ${cancelBtn}`}>Close</button>
          </div>
        </Modal>
      )}

      {kycItem && (
        <Modal onClose={() => setKycItem(null)} title="KYC Review">
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-[#d0c5af]">Reviewing: <span className="font-bold text-[#0f172a] dark:text-[#dce3f0]">{kycItem}</span></p>
            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/10 space-y-2 text-sm">
              <InfoRow label="Documents Submitted" value="3 / 3" />
              <InfoRow label="AML Risk Score" value="Low (12/100)" />
              <InfoRow label="Beneficial Owner" value="Verified" />
              <InfoRow label="Last Review" value="Oct 20, 2023" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { addLog(`KYC rejected: ${kycItem}`, "red"); setKycItem(null); }}
                className="flex-1 py-2 border border-[#dc2626]/30 dark:border-[#ffb4ab]/30 text-[#dc2626] dark:text-[#ffb4ab] rounded font-bold text-sm hover:bg-[#dc2626]/5 dark:hover:bg-[#ffb4ab]/10 transition-colors">Reject</button>
              <button onClick={() => { addLog(`KYC approved: ${kycItem}`, "gold"); setKycItem(null); }} className={primaryBtn}>Approve KYC</button>
            </div>
          </div>
        </Modal>
      )}

      {newUserOpen && (
        <Modal onClose={() => { setNewUserOpen(false); setCreateResult(null); }} title="Create New Account">
          {createResult?.password ? (
            <div className="space-y-4">
              <div className="p-4 bg-[#4edea3]/10 border border-[#4edea3]/30 rounded-lg">
                <p className="text-[11px] font-bold text-[#059669] dark:text-[#4edea3] uppercase tracking-wider mb-1">Account Created Successfully</p>
                <p className="text-sm text-slate-600 dark:text-[#d0c5af]">Welcome email sent to <span className="font-bold text-[#0f172a] dark:text-[#dce3f0]">{newEmail}</span></p>
              </div>
              {createResult.warning && <div className="p-3 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-lg text-xs text-[#b08d1a] dark:text-[#f2ca50]">{createResult.warning}</div>}
              <div className="p-3 bg-slate-50 dark:bg-[#080f18] border border-slate-200 dark:border-[#4d4635] rounded-lg">
                <p className="text-[10px] font-bold text-slate-400 dark:text-[#99907c] uppercase tracking-wider mb-1">Temporary Password</p>
                <p className="font-data-mono text-[#0f172a] dark:text-[#f2ca50] font-bold text-sm break-all select-all">{createResult.password}</p>
                <p className="text-[10px] text-slate-400 dark:text-[#d0c5af] mt-1">User must change this on first login.</p>
              </div>
              <button onClick={() => { setNewUserOpen(false); setCreateResult(null); setNewName(""); setNewEmail(""); setNewPhone(""); setNewCountry(""); setNewRole("investor"); }}
                className={`w-full ${primaryBtn}`}>Done</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {(["investor","admin"] as const).map((r) => (
                  <button key={r} type="button" onClick={() => setNewRole(r)}
                    className={`py-3 rounded-lg border text-sm font-bold uppercase tracking-wider transition-all ${newRole === r
                      ? r === "admin" ? "bg-[#d4af37]/10 dark:bg-[#f2ca50]/10 border-[#d4af37] dark:border-[#f2ca50] text-[#d4af37] dark:text-[#f2ca50]"
                                      : "bg-[#059669]/10 dark:bg-[#4edea3]/10 border-[#059669] dark:border-[#4edea3] text-[#059669] dark:text-[#4edea3]"
                      : "border-slate-200 dark:border-white/10 text-slate-400 dark:text-[#d0c5af]"}`}>
                    <span className="material-symbols-outlined text-[16px] align-middle mr-1">{r === "admin" ? "admin_panel_settings" : "person"}</span>
                    {r === "admin" ? "Admin" : "Investor"}
                  </button>
                ))}
              </div>
              {newRole === "admin" && (
                <div className="flex items-start gap-2 p-3 bg-[#d4af37]/5 dark:bg-[#f2ca50]/5 border border-[#d4af37]/20 dark:border-[#f2ca50]/20 rounded-lg">
                  <span className="material-symbols-outlined text-[#d4af37] dark:text-[#f2ca50] text-[16px] mt-0.5">warning</span>
                  <p className="text-[11px] text-[#b08d1a] dark:text-[#d0c5af]">Admin accounts get full platform access. A temporary password will be generated and emailed to them.</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Full Name *"><input className={inp} placeholder="e.g. John Smith" value={newName} onChange={(e) => setNewName(e.target.value)} /></Field>
                <Field label="Email Address *"><input className={inp} type="email" placeholder="user@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} /></Field>
                <Field label="Phone Number"><input className={inp} type="tel" placeholder="+1 555 000 0000" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} /></Field>
                <Field label="Country"><input className={inp} placeholder="e.g. United States" value={newCountry} onChange={(e) => setNewCountry(e.target.value)} /></Field>
              </div>
              {newRole === "investor" && (
                <Field label="Investor Tier">
                  <select className={inp} value={newTier} onChange={(e) => setNewTier(e.target.value as UserTier)}>
                    <option>Tier 1 - Retail</option><option>Tier 2 - Pro</option><option>Tier 3 - Institutional</option>
                  </select>
                </Field>
              )}
              {createResult?.error && (
                <div className="p-3 bg-[#dc2626]/10 dark:bg-[#ffb4ab]/10 border border-[#dc2626]/20 dark:border-[#ffb4ab]/20 rounded-lg text-xs text-[#dc2626] dark:text-[#ffb4ab] font-bold">{createResult.error}</div>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setNewUserOpen(false); setCreateResult(null); }} className={cancelBtn} disabled={creating}>Cancel</button>
                <button onClick={createUser} disabled={creating || !newName.trim() || !newEmail.trim()}
                  className={`${primaryBtn} disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2`}>
                  {creating && <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>}
                  {creating ? "Creating…" : `Create ${newRole === "admin" ? "Admin" : "Investor"}`}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {auditOpen && (
        <Modal onClose={() => setAuditOpen(false)} title="Complete Audit Trail">
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {logs.map((log, i) => (
              <div key={i} className={`border-l-4 pl-4 py-1 ${log.kind === "gold" ? "border-[#d4af37] dark:border-[#f2ca50]" : log.kind === "red" ? "border-[#dc2626] dark:border-[#ffb4ab]" : "border-slate-200 dark:border-white/10"}`}>
                <p className={`text-xs font-data-mono ${log.kind === "gold" ? "text-[#059669] dark:text-[#4edea3]" : log.kind === "red" ? "text-[#dc2626] dark:text-[#ffb4ab]" : "text-[#64748b] dark:text-[#d0c5af]"}`}>{log.time}</p>
                <p className="text-sm text-[#0f172a] dark:text-[#dce3f0]">{log.text}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setAuditOpen(false)} className={`w-full mt-4 ${cancelBtn}`}>Close</button>
        </Modal>
      )}
    </main>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-[#0d141d]/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[rgba(25,32,42,0.95)] dark:backdrop-blur-md w-full max-w-md rounded-xl p-6 shadow-2xl dark:shadow-none border border-slate-100 dark:border-[rgba(255,255,255,0.08)]">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-headline-md text-headline-md font-bold text-[#0f172a] dark:text-[#dce3f0]">{title}</h3>
          <button onClick={onClose} className="material-symbols-outlined text-slate-400 dark:text-[#d0c5af] hover:text-slate-900 dark:hover:text-white transition-colors">close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-500 dark:text-[#99907c] uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500 dark:text-[#d0c5af]">{label}</span>
      <span className="font-bold text-[#0f172a] dark:text-[#dce3f0] font-data-mono">{value}</span>
    </div>
  );
}
const inp        = "w-full bg-slate-50 dark:bg-[#080f18] border border-slate-200 dark:border-[#4d4635] rounded-lg px-3 py-2 text-sm text-[#0f172a] dark:text-[#dce3f0] focus:ring-1 focus:ring-[#d4af37] outline-none";
const primaryBtn = "flex-1 py-2 bg-[#d4af37] dark:bg-[#f2ca50] text-white dark:text-[#3c2f00] rounded font-bold text-sm hover:shadow-[0_0_12px_rgba(212,175,55,0.3)] transition-all active:scale-95";
const cancelBtn  = "flex-1 py-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#dce3f0] rounded font-bold text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors";
