"use client";

// Stitch dark tokens:
// glass-panel: rgba(25,32,42,0.4) + blur(12px) + border rgba(255,255,255,0.05) / border-top rgba(255,255,255,0.1)
// primary: #f2ca50   on-primary: #3c2f00   secondary: #4edea3   error: #ffb4ab
// on-surface: #dce3f0   on-surface-variant: #d0c5af
// surface: #0d141d   surface-container: #19202a   surface-container-lowest: #080f18

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/src/store/auth.store";

// ── Types ─────────────────────────────────────────────────────────────────────
type UserStatus = "Verified" | "Pending" | "Suspended";
type UserTier   = "Tier 1 - Retail" | "Tier 2 - Pro" | "Tier 3 - Institutional";

type User = {
  id: string; uid: string; name: string; email: string; avatar?: string; initials?: string;
  tier: UserTier; status: UserStatus; volume: string; balanceRaw: number; lastActive: string;
  assignedManagerId?: string | null; assignedManagerName?: string | null;
  role: string; depositStatus: string; isSuspended: boolean;
};

type Manager = {
  id: string; name: string; initials: string;
  specialization: string; investorCount: number; maxCapacity: number;
  status: "Available" | "Busy" | "At Capacity";
};

type LogEntry = { time: string; text: string; kind: "gold" | "red" | "muted" };

type UserDetailData = {
  user: Record<string, unknown>;
  deposits: Array<{ id: string; amount_submitted: number; currency_submitted: string; settled_amount_usd: number | null; status: string; method: string; created_at: string }>;
  withdrawals: Array<{ id: string; amount_usd: number; status: string; method: string; reference: string; created_at: string }>;
  ledger: Array<{ id: string; entry_type: string; amount: number; note: string | null; created_at: string }>;
};

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

function managerStatus(count: number, max: number): Manager["status"] {
  const pct = count / max;
  if (pct >= 1) return "At Capacity";
  if (pct >= 0.75) return "Busy";
  return "Available";
}

// ── Data fetchers ─────────────────────────────────────────────────────────────
async function fetchUsers(): Promise<User[]> {
  const res = await fetch("/api/admin/users?role=investor");
  if (!res.ok) throw new Error("Failed to load investors.");
  const json = (await res.json()) as { users: User[] };
  return json.users;
}

async function fetchManagers(): Promise<Manager[]> {
  const res = await fetch("/api/admin/users?role=admin");
  if (!res.ok) throw new Error("Failed to load managers.");
  const json = (await res.json()) as { users: Array<User & { investorCount: number; maxCapacity: number }> };
  return json.users.map((u) => ({
    id: u.id,
    name: u.name,
    initials: u.initials ?? u.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase(),
    specialization: "Account Manager",
    investorCount: u.investorCount,
    maxCapacity: u.maxCapacity ?? 15,
    status: managerStatus(u.investorCount, u.maxCapacity ?? 15),
  }));
}

async function fetchUserDetail(id: string): Promise<UserDetailData> {
  const res = await fetch(`/api/admin/users/${id}`);
  if (!res.ok) throw new Error("Failed to load user detail.");
  return res.json() as Promise<UserDetailData>;
}

// ── Assign Manager Modal ──────────────────────────────────────────────────────
function AssignManagerModal({
  investor, managers, onAssign, onClose,
}: {
  investor: User;
  managers: Manager[];
  onAssign: (investorId: string, managerId: string | null) => Promise<void>;
  onClose: () => void;
}) {
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<string | null>(investor.assignedManagerId ?? null);
  const [saving, setSaving]     = useState(false);
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

  async function handleSave() {
    setSaving(true);
    try { await onAssign(investor.id, selected); onClose(); }
    finally { setSaving(false); }
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
              <h3 className="font-headline-md text-headline-md font-bold text-[#0f172a] dark:text-[#dce3f0]">Assign Account Manager</h3>
              <p className="text-body-sm text-slate-500 dark:text-[#d0c5af] mt-0.5">
                Select a manager for <span className="font-bold text-[#0f172a] dark:text-[#dce3f0]">{investor.name}</span>
                <span className="ml-2 font-data-mono text-[11px] opacity-60">UID {investor.uid}</span>
              </p>
            </div>
            <button onClick={onClose} className="material-symbols-outlined text-slate-400 dark:text-[#d0c5af] hover:text-slate-900 dark:hover:text-white transition-colors">close</button>
          </div>
          {/* Current manager chip */}
          {currentMgr && (
            <div className="flex items-center gap-3 mt-4 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
              <div className="w-9 h-9 rounded-lg bg-[#d4af37]/10 dark:bg-[#f2ca50]/20 flex items-center justify-center text-[#d4af37] dark:text-[#f2ca50] font-bold text-sm">{currentMgr.initials}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-500 dark:text-[#d0c5af] uppercase tracking-wider">Current Manager</p>
                <p className="text-body-sm font-bold text-[#0f172a] dark:text-[#dce3f0]">{currentMgr.name}</p>
              </div>
              <button
                onClick={async () => { setSaving(true); try { await onAssign(investor.id, null); onClose(); } finally { setSaving(false); } }}
                disabled={saving}
                className="text-[11px] font-bold text-[#dc2626] dark:text-[#ffb4ab] hover:opacity-80 disabled:opacity-50"
              >
                {saving ? "Removing…" : "Remove"}
              </button>
            </div>
          )}
          {/* Search */}
          <div className="relative mt-3">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#d0c5af] text-sm">search</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-lg pl-9 pr-4 py-2 text-sm text-[#0f172a] dark:text-[#dce3f0] placeholder-slate-400 dark:placeholder-[#d0c5af]/50 outline-none focus:border-[#d4af37]/40 dark:focus:border-[#f2ca50]/40"
              placeholder="Search by name or specialization…" />
          </div>
        </div>

        {/* Manager list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 [scrollbar-width:thin] [scrollbar-color:rgba(212,175,55,0.2)_transparent]">
          {filtered.map((m) => {
            const { pct, color } = loadBar(m);
            const isSelected = selected === m.id;
            return (
              <button key={m.id} onClick={() => setSelected(isSelected ? null : m.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${isSelected
                  ? "bg-[#d4af37]/5 dark:bg-[#f2ca50]/5 border-[#d4af37]/30 dark:border-[#f2ca50]/30"
                  : "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10"}`}>
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-[#d4af37] dark:bg-[#f2ca50] flex items-center justify-center text-xs font-bold text-white dark:text-[#3c2f00]">{m.initials}</div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#19202a] ${STATUS_DOT[m.status]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-[#0f172a] dark:text-[#dce3f0]">{m.name}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${STATUS_BADGE[m.status]}`}>{m.status}</span>
                  </div>
                  <p className="text-[11px] text-[#64748b] dark:text-[#d0c5af] mt-0.5">{m.specialization}</p>
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] text-[#64748b] dark:text-[#d0c5af] mb-1 font-data-mono">
                      <span>Book Load</span><span>{m.investorCount}/{m.maxCapacity}</span>
                    </div>
                    <div className="h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
                {isSelected && <span className="material-symbols-outlined text-[#d4af37] dark:text-[#f2ca50] shrink-0">check_circle</span>}
              </button>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-sm text-slate-400 dark:text-[#d0c5af] py-8">No managers found.</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 shrink-0 flex gap-3">
          <button onClick={onClose} className={cancelBtn} disabled={saving}>Cancel</button>
          <button onClick={handleSave} disabled={saving || selected === (investor.assignedManagerId ?? null)}
            className={`${primaryBtn} disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center`}>
            {saving && <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>}
            {saving ? "Saving…" : selected ? "Assign Manager" : "Remove Assignment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Balance Override Modal ────────────────────────────────────────────────────
function BalanceModal({
  user, onClose, onDone,
}: {
  user: User;
  onClose: () => void;
  onDone: (log: string, kind: LogEntry["kind"]) => void;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function handleSubmit() {
    const num = parseFloat(amount);
    if (isNaN(num) || num === 0) { setError("Enter a non-zero amount."); return; }
    if (!reason.trim()) { setError("Reason is required."); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/balance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: num, reason: reason.trim() }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) { setError(json.error ?? "Failed."); return; }
      const sign = num > 0 ? "+" : "";
      const fmt  = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
      onDone(`Balance adjusted ${sign}${fmt} for ${user.name}: ${reason}`, num < 0 ? "red" : "gold");
      onClose();
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  }

  return (
    <Modal onClose={onClose} title="Override Balance">
      <div className="space-y-4">
        <div className="p-3 bg-[#d4af37]/5 dark:bg-[#f2ca50]/5 border border-[#d4af37]/20 dark:border-[#f2ca50]/20 rounded-lg">
          <p className="text-[11px] font-bold text-[#b08d1a] dark:text-[#f2ca50] uppercase tracking-wider">Investor</p>
          <p className="text-sm font-bold text-[#0f172a] dark:text-[#dce3f0]">{user.name}</p>
          <p className="text-[11px] font-data-mono text-[#64748b] dark:text-[#d0c5af]">Current balance: {user.volume}</p>
        </div>
        <Field label="Amount (USD) — negative to deduct">
          <input type="number" step="0.01" className={inp} placeholder="e.g. 500 or -200"
            value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Reason *">
          <input className={inp} placeholder="e.g. Bonus credit for referral"
            value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        {error && <p className="text-xs text-[#dc2626] dark:text-[#ffb4ab] font-bold">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className={cancelBtn} disabled={saving}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className={`${primaryBtn} disabled:opacity-60 flex items-center gap-2 justify-center`}>
            {saving && <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>}
            {saving ? "Applying…" : "Apply Override"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Promote to Admin Modal ────────────────────────────────────────────────────
function PromoteAdminModal({
  user, onClose, onDone,
}: {
  user: User;
  onClose: () => void;
  onDone: (log: string, kind: LogEntry["kind"]) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function handleSubmit() {
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin" }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) { setError(json.error ?? "Failed."); return; }
      onDone(`${user.name} promoted to admin`, "gold");
      onClose();
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  }

  return (
    <Modal onClose={onClose} title="Promote to Admin">
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-[#d0c5af]">
          Promote <span className="font-bold text-[#0f172a] dark:text-[#dce3f0]">{user.name}</span> to an
          administrator? They will gain access to the admin console and staff areas. This does not grant
          super-admin privileges.
        </p>
        {error && <p className="text-xs text-[#dc2626] dark:text-[#ffb4ab] font-bold">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className={cancelBtn} disabled={saving}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className={`${primaryBtn} disabled:opacity-60 flex items-center gap-2 justify-center`}>
            {saving && <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>}
            {saving ? "Promoting…" : "Promote to Admin"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UserManagementPage() {
  const searchParams = useSearchParams();
  const qc           = useQueryClient();
  const session      = useAuthStore((s) => s.session);
  const isSuperAdmin = session?.user.role === "super_admin";

  const [logs, setLogs]             = useState<LogEntry[]>([]);
  const [search, setSearch]         = useState(searchParams.get("q") ?? "");
  const [tierFilter, setTierFilter] = useState("All Tiers");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [page, setPage]             = useState(1);

  // Modals
  const [detailUserId, setDetailUserId]   = useState<string | null>(null);
  const [kycItem, setKycItem]             = useState<string | null>(null);
  const [newUserOpen, setNewUserOpen]     = useState(false);
  const [auditOpen, setAuditOpen]         = useState(false);
  const [assignTarget, setAssignTarget]   = useState<User | null>(null);
  const [balanceTarget, setBalanceTarget] = useState<User | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<User | null>(null);

  // New-user form
  const [newName, setNewName]             = useState("");
  const [newEmail, setNewEmail]           = useState("");
  const [newRole, setNewRole]             = useState<"investor" | "admin">("investor");
  const [newTier, setNewTier]             = useState<UserTier>("Tier 1 - Retail");
  const [newPhone, setNewPhone]           = useState("");
  const [newCountry, setNewCountry]       = useState("");
  const [creating, setCreating]           = useState(false);
  const [createResult, setCreateResult]   = useState<{ password?: string; warning?: string; error?: string } | null>(null);

  // Data
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchUsers,
    staleTime: 30_000,
  });

  const { data: managers = [], isLoading: loadingManagers } = useQuery({
    queryKey: ["admin-managers"],
    queryFn: fetchManagers,
    staleTime: 30_000,
  });

  const { data: detailData } = useQuery({
    queryKey: ["admin-user-detail", detailUserId],
    queryFn: () => fetchUserDetail(detailUserId!),
    enabled: !!detailUserId,
    staleTime: 10_000,
  });

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["admin-users"] });
    void qc.invalidateQueries({ queryKey: ["admin-managers"] });
  }, [qc]);

  function addLog(text: string, kind: LogEntry["kind"] = "gold") {
    setLogs((prev) => [{ time: now(), text, kind }, ...prev.slice(0, 19)]);
  }

  // ── Assign manager ──────────────────────────────────────────────────────────
  async function handleAssign(investorId: string, managerId: string | null) {
    const investor = users.find((u) => u.id === investorId);
    const mgrName  = managerId ? managers.find((m) => m.id === managerId)?.name : null;

    const res = await fetch(`/api/admin/users/${investorId}/assign-manager`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId }),
    });

    if (res.ok) {
      invalidate();
      if (mgrName) {
        addLog(`Manager assigned: ${mgrName} → ${investor?.name ?? investorId}`, "gold");
      } else {
        addLog(`Manager removed from ${investor?.name ?? investorId}`, "muted");
      }
    } else {
      const json = await res.json() as { error?: string };
      addLog(`Assignment failed: ${json.error ?? "Unknown error"}`, "red");
    }
  }

  // ── Suspend / reinstate ─────────────────────────────────────────────────────
  async function toggleSuspend(user: User) {
    const suspend = !user.isSuspended;
    const res = await fetch(`/api/admin/users/${user.id}/terminate`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspend }),
    });
    if (res.ok) {
      invalidate();
      addLog(`Admin: user ${user.name} status → ${suspend ? "Suspended" : "Reinstated"}`, suspend ? "red" : "gold");
    }
  }

  // ── Create user ─────────────────────────────────────────────────────────────
  async function createUser() {
    if (!newName.trim() || !newEmail.trim()) return;
    setCreating(true); setCreateResult(null);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: newName.trim(), email: newEmail.trim(), role: newRole, tier: newTier, phone: newPhone.trim(), country: newCountry.trim() }),
      });
      const json = await res.json() as { error?: string; temporaryPassword?: string; warning?: string };
      if (!res.ok) {
        setCreateResult({ error: json.error ?? "Unknown error" });
      } else {
        invalidate();
        addLog(`Admin: new ${newRole} "${newName.trim()}" (${newEmail.trim()}) created.`, "gold");
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
    const rows = ["ID,Name,Email,Tier,Status,Balance,Last Active,Assigned Manager",
      ...users.map((u) => `${u.id},${u.name},${u.email},${u.tier},${u.status},${u.volume},${u.lastActive},${u.assignedManagerName ?? "Unassigned"}`)
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "users_export.csv"; a.click();
    addLog("Export generated: users_export.csv", "muted");
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.uid.toLowerCase().includes(q))
      && (tierFilter === "All Tiers" || u.tier === tierFilter)
      && (statusFilter === "All Status" || u.status === statusFilter);
  });

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const managerRoster = managers.map((m) => ({
    ...m,
    investors: users.filter((u) => u.assignedManagerId === m.id),
  }));

  const detailUser = detailUserId ? users.find((u) => u.id === detailUserId) : null;

  return (
    <main className="px-4 sm:p-6 pt-6 space-y-6 h-full overflow-y-auto bg-[#f8fafc] dark:bg-[#050b14]">

      {/* Modals */}
      {assignTarget && (
        <AssignManagerModal
          investor={assignTarget}
          managers={managers}
          onAssign={handleAssign}
          onClose={() => setAssignTarget(null)}
        />
      )}
      {balanceTarget && isSuperAdmin && (
        <BalanceModal
          user={balanceTarget}
          onClose={() => setBalanceTarget(null)}
          onDone={(text, kind) => { addLog(text, kind); invalidate(); }}
        />
      )}
      {promoteTarget && isSuperAdmin && (
        <PromoteAdminModal
          user={promoteTarget}
          onClose={() => setPromoteTarget(null)}
          onDone={(text, kind) => { addLog(text, kind); invalidate(); }}
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
          { label: "Total Investors",      value: loadingUsers ? "…" : users.filter((u) => u.role === "investor").length.toLocaleString(), sub: "Active",    subColor: "text-[#059669] dark:text-[#4edea3]", icon: "group",          accentL: "", accentD: "" },
          { label: "Pending KYC",          value: loadingUsers ? "…" : users.filter((u) => u.status === "Pending").length.toLocaleString(), sub: "Pending",   subColor: "text-[#d4af37] dark:text-[#f2ca50]", icon: "assignment_late", accentL: "border-l-4! border-l-[#d4af37]!", accentD: "dark:border-l-[#f2ca50]!" },
          { label: "Suspended",            value: loadingUsers ? "…" : users.filter((u) => u.status === "Suspended").length.toLocaleString(), sub: "Locked",  subColor: "text-[#dc2626] dark:text-[#ffb4ab]", icon: "block",          accentL: "border-l-4! border-l-[#dc2626]!", accentD: "dark:border-l-[#ffb4ab]!" },
          { label: "Account Managers",     value: loadingManagers ? "…" : managers.length.toLocaleString(), sub: "Staff",    subColor: "text-[#059669] dark:text-[#4edea3]", icon: "manage_accounts", accentL: "", accentD: "" },
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
            placeholder="Filter by Name, Email, or UID..." type="text" />
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
                {["User Identity","Tier Level","Status","Account Manager","Total Balance (USD)","Last Active",""].map((h) => (
                  <th key={h} className={`px-5 py-4 font-label-caps text-label-caps text-[#64748b] dark:text-[#d0c5af] uppercase tracking-wider ${h === "" ? "text-right" : ""}`}>{h || "Actions"}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-body-sm">
              {(loadingUsers) && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400 dark:text-[#d0c5af]">Loading users…</td></tr>
              )}
              {!loadingUsers && paginated.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400 dark:text-[#d0c5af]">No users match the current filters.</td></tr>
              )}
              {paginated.map((u) => {
                const assignedMgr = managers.find((m) => m.id === u.assignedManagerId);
                return (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#d4af37]/10 dark:bg-[#f2ca50]/20 flex items-center justify-center text-[#d4af37] dark:text-[#f2ca50] font-bold text-sm">{u.initials}</div>
                        <div>
                          <p className="font-bold text-[#0f172a] dark:text-[#dce3f0]">{u.name}</p>
                          <p className="font-data-mono text-[11px] text-[#64748b] dark:text-[#d0c5af]">{u.email}</p>
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
                    {/* Assigned Manager cell */}
                    <td className="px-5 py-4">
                      {assignedMgr ? (
                        <button onClick={() => isSuperAdmin && setAssignTarget({ ...u })}
                          className="flex items-center gap-2 group/mgr hover:opacity-80 transition-opacity text-left">
                          <div className="w-7 h-7 rounded-lg bg-[#d4af37] dark:bg-[#f2ca50] flex items-center justify-center text-[9px] font-bold text-white dark:text-[#3c2f00] shrink-0">
                            {assignedMgr.initials}
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-[#0f172a] dark:text-[#dce3f0] leading-none">{assignedMgr.name}</p>
                            <p className="text-[10px] text-[#64748b] dark:text-[#d0c5af] mt-0.5">{assignedMgr.specialization}</p>
                          </div>
                          {isSuperAdmin && <span className="material-symbols-outlined text-[14px] text-[#64748b] dark:text-[#d0c5af] opacity-0 group-hover/mgr:opacity-100 transition-opacity ml-1">edit</span>}
                        </button>
                      ) : (
                        isSuperAdmin ? (
                          <button onClick={() => setAssignTarget({ ...u })}
                            className="flex items-center gap-1.5 text-[12px] font-bold text-[#d4af37] dark:text-[#f2ca50] hover:opacity-80 transition-opacity border border-dashed border-[#d4af37]/30 dark:border-[#f2ca50]/30 px-2.5 py-1 rounded-lg">
                            <span className="material-symbols-outlined text-[14px]">person_add</span>Assign
                          </button>
                        ) : (
                          <span className="text-[12px] text-[#64748b] dark:text-[#d0c5af]">Unassigned</span>
                        )
                      )}
                    </td>
                    <td className="px-5 py-4 font-data-mono text-[#0f172a] dark:text-[#dce3f0] font-semibold">{u.volume}</td>
                    <td className="px-5 py-4 font-data-mono text-[#64748b] dark:text-[#d0c5af]">{u.lastActive}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setDetailUserId(u.id)} title="Activity Log" className="hover:text-[#059669] dark:hover:text-[#4edea3] transition-colors text-slate-500 dark:text-[#d0c5af]">
                          <span className="material-symbols-outlined text-[18px]">list_alt</span>
                        </button>
                        {isSuperAdmin && (
                          <>
                            <button onClick={() => setAssignTarget({ ...u })} title="Assign Manager" className="hover:text-[#d4af37] dark:hover:text-[#f2ca50] transition-colors text-slate-500 dark:text-[#d0c5af]">
                              <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                            </button>
                            <button onClick={() => setBalanceTarget({ ...u })} title="Override Balance" className="hover:text-[#d4af37] dark:hover:text-[#f2ca50] transition-colors text-slate-500 dark:text-[#d0c5af]">
                              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                            </button>
                            {u.role === "investor" && (
                              <button onClick={() => setPromoteTarget({ ...u })} title="Promote to Admin" className="hover:text-[#d4af37] dark:hover:text-[#f2ca50] transition-colors text-slate-500 dark:text-[#d0c5af]">
                                <span className="material-symbols-outlined text-[18px]">shield_person</span>
                              </button>
                            )}
                            {u.status === "Suspended"
                              ? <button onClick={() => void toggleSuspend(u)} title="Reinstate" className="hover:text-[#059669] dark:hover:text-[#4edea3] transition-colors text-slate-500 dark:text-[#d0c5af]"><span className="material-symbols-outlined text-[18px]">lock_open</span></button>
                              : <button onClick={() => void toggleSuspend(u)}    title="Suspend"   className="hover:text-[#dc2626] dark:hover:text-[#ffb4ab] transition-colors text-slate-500 dark:text-[#d0c5af]"><span className="material-symbols-outlined text-[18px]">block</span></button>
                            }
                          </>
                        )}
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
            Showing <span className="font-bold text-[#0f172a] dark:text-[#dce3f0]">{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-bold text-[#0f172a] dark:text-[#dce3f0]">{filtered.length}</span> investors
          </p>
          <div className="flex items-center gap-1">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-[#64748b] dark:text-[#d0c5af] disabled:opacity-30"><span className="material-symbols-outlined">chevron_left</span></button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded text-xs font-bold transition-colors ${page === n ? "bg-[#d4af37] dark:bg-[#f2ca50] text-white dark:text-[#3c2f00]" : "hover:bg-slate-200 dark:hover:bg-white/5 text-[#64748b] dark:text-[#d0c5af]"}`}>{n}</button>
            ))}
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-[#64748b] dark:text-[#d0c5af] disabled:opacity-30"><span className="material-symbols-outlined">chevron_right</span></button>
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
          {loadingManagers && <p className="text-sm text-slate-400 dark:text-[#d0c5af] col-span-3">Loading managers…</p>}
          {managerRoster.map((m) => {
            const pct   = Math.round((m.investorCount / m.maxCapacity) * 100);
            const barCl = pct >= 100 ? "bg-[#dc2626] dark:bg-[#ffb4ab]" : pct >= 75 ? "bg-[#d4af37] dark:bg-[#f2ca50]" : "bg-[#059669] dark:bg-[#4edea3]";
            return (
              <div key={m.id} className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-3">
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
                <div>
                  <div className="flex justify-between text-[10px] text-[#64748b] dark:text-[#d0c5af] mb-1 font-data-mono">
                    <span>Book Load</span><span>{m.investorCount}/{m.maxCapacity}</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barCl}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                {m.investors.length > 0 ? (
                  <div className="space-y-1">
                    {m.investors.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-white/5 first:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-[#d4af37]/10 dark:bg-[#f2ca50]/20 flex items-center justify-center text-[8px] font-bold text-[#d4af37] dark:text-[#f2ca50]">{inv.initials}</div>
                          <span className="text-[12px] text-[#0f172a] dark:text-[#dce3f0] font-medium truncate max-w-[120px]">{inv.name}</span>
                        </div>
                        {isSuperAdmin && (
                          <button onClick={() => setAssignTarget({ ...inv })}
                            className="text-[10px] text-[#64748b] dark:text-[#d0c5af] hover:text-[#d4af37] dark:hover:text-[#f2ca50] transition-colors font-bold">
                            Reassign
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 dark:text-[#d0c5af]/50 italic">No investors assigned yet.</p>
                )}
              </div>
            );
          })}
          {!loadingManagers && managerRoster.length === 0 && (
            <p className="text-[11px] text-slate-400 dark:text-[#d0c5af]/50 col-span-3">No account managers yet.</p>
          )}
        </div>
      </div>

      {/* ── Bottom grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KYC Queue (placeholder) */}
        <div className={`lg:col-span-2 glass-panel ${gp} rounded-xl p-6 space-y-4 bg-white dark:bg-transparent`}>
          <div className="flex items-center justify-between">
            <h3 className="font-label-caps text-label-caps text-[#d4af37] dark:text-[#f2ca50] uppercase">KYC Escalation Queue</h3>
            <span className="px-2 py-0.5 bg-[#d4af37]/10 dark:bg-[#f2ca50]/10 text-[#d4af37] dark:text-[#f2ca50] text-[10px] font-bold rounded">Phase 16</span>
          </div>
          <p className="text-sm text-slate-400 dark:text-[#d0c5af]/60 italic">KYC document review will be available in Phase 16 (System Settings).</p>
        </div>

        {/* Security Logs */}
        <div className={`glass-panel ${gp} rounded-xl p-6 space-y-4 bg-white dark:bg-transparent`}>
          <h3 className="font-label-caps text-label-caps text-[#64748b] dark:text-[#d0c5af] uppercase">Admin Action Log</h3>
          <div className="space-y-4 max-h-48 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(212,175,55,0.2)_transparent] pr-1">
            {logs.length === 0 && <p className="text-xs text-slate-400 dark:text-[#d0c5af]/50 italic">No actions yet this session.</p>}
            {logs.slice(0, 8).map((log, i) => (
              <div key={i} className={`border-l-4 pl-4 py-1 ${log.kind === "gold" ? "border-[#d4af37] dark:border-[#f2ca50]" : log.kind === "red" ? "border-[#dc2626] dark:border-[#ffb4ab]" : "border-slate-200 dark:border-white/10"}`}>
                <p className={`text-xs font-data-mono ${log.kind === "gold" ? "text-[#059669] dark:text-[#4edea3]" : log.kind === "red" ? "text-[#dc2626] dark:text-[#ffb4ab]" : "text-[#64748b] dark:text-[#d0c5af]"}`}>{log.time}</p>
                <p className="text-body-sm text-[#0f172a] dark:text-[#dce3f0]">{log.text}</p>
              </div>
            ))}
          </div>
          {logs.length > 0 && (
            <button onClick={() => setAuditOpen(true)}
              className="w-full py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-[#64748b] dark:text-[#d0c5af] text-xs font-bold rounded uppercase tracking-widest transition-all">
              View All Logs
            </button>
          )}
        </div>
      </div>

      {/* ══ Modals ══════════════════════════════════════════════════════════ */}

      {detailUserId && detailUser && (
        <Modal onClose={() => setDetailUserId(null)} title={`Activity — ${detailUser.name}`}>
          <div className="space-y-3 text-sm">
            <InfoRow label="Email"          value={detailUser.email} />
            <InfoRow label="Tier"           value={detailUser.tier} />
            <InfoRow label="Status"         value={detailUser.status} />
            <InfoRow label="Balance"        value={detailUser.volume} />
            <InfoRow label="Last Active"    value={detailUser.lastActive} />
            <InfoRow label="Manager"        value={detailUser.assignedManagerName ?? "Unassigned"} />
            <div className="pt-2 border-t border-slate-100 dark:border-white/10 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 dark:text-[#d0c5af] uppercase tracking-widest">Recent Deposits</p>
              {detailData?.deposits.length === 0 && <p className="text-[12px] text-slate-400 dark:text-[#d0c5af] italic">No deposits yet.</p>}
              {detailData?.deposits.slice(0, 3).map((d) => (
                <p key={d.id} className="text-[12px] text-slate-600 dark:text-[#dce3f0] font-data-mono border-l-2 border-[#d4af37] dark:border-[#f2ca50] pl-3">
                  {d.method} deposit — {d.settled_amount_usd != null ? `$${d.settled_amount_usd.toLocaleString()}` : `$${d.amount_submitted}`} — {d.status}
                </p>
              ))}
              <p className="text-[10px] font-bold text-slate-400 dark:text-[#d0c5af] uppercase tracking-widest mt-3">Recent Withdrawals</p>
              {detailData?.withdrawals.length === 0 && <p className="text-[12px] text-slate-400 dark:text-[#d0c5af] italic">No withdrawals yet.</p>}
              {detailData?.withdrawals.slice(0, 3).map((w) => (
                <p key={w.id} className="text-[12px] text-slate-600 dark:text-[#dce3f0] font-data-mono border-l-2 border-[#d4af37] dark:border-[#f2ca50] pl-3">
                  {w.method} — ${w.amount_usd.toLocaleString()} — {w.status} — {w.reference}
                </p>
              ))}
            </div>
            <button onClick={() => setDetailUserId(null)} className={`w-full mt-2 ${cancelBtn}`}>Close</button>
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
              <InfoRow label="Last Review" value="Phase 16" />
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
        <Modal onClose={() => setAuditOpen(false)} title="Admin Action Log">
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
const cancelBtn  = "flex-1 py-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#d0c5af] rounded font-bold text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors";
