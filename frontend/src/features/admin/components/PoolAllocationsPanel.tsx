"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";

import { useAdminUserSearch } from "@/src/features/notifications/hooks/useNotifications";
import {
  useInvestorAllocations,
  usePoolAllocationSummary,
  useSaveInvestorAllocations,
} from "@/src/features/admin/hooks/usePoolAllocations";

const TAG_DOT: Record<string, string> = {
  gold: "bg-[#d4af37]",
  slate: "bg-slate-400",
  dark: "bg-slate-800 dark:bg-white",
};

interface PoolAllocationsPanelProps {
  canEdit: boolean;
  onLog: (text: string, color?: string) => void;
  onToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function PoolAllocationsPanel({ canEdit, onLog, onToast }: PoolAllocationsPanelProps) {
  const { data: summaryData } = usePoolAllocationSummary();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);
  const { data: searchData, isFetching: searching } = useAdminUserSearch(debouncedQuery);

  const { data: allocData, isLoading: loadingAlloc } = useInvestorAllocations(selectedId);
  const saveMutation = useSaveInvestorAllocations();

  const [draft, setDraft] = useState<Record<string, number>>({});
  const [syncedInvestorId, setSyncedInvestorId] = useState<string | null>(null);
  if (allocData && syncedInvestorId !== selectedId) {
    setSyncedInvestorId(selectedId);
    setDraft(Object.fromEntries(allocData.pools.map((p) => [p.id, p.allocationPct])));
  }

  const total = Object.values(draft).reduce((s, v) => s + (v || 0), 0);
  const totalValid = Math.abs(total - 100) < 0.01;

  async function handleSave() {
    if (!selectedId || !allocData) return;
    try {
      await saveMutation.mutateAsync({
        investorId: selectedId,
        allocations: allocData.pools.map((p) => ({ poolId: p.id, allocationPct: draft[p.id] ?? 0 })),
      });
      onLog(`Updated pool allocations for ${allocData.investor.name}: ${allocData.pools.map((p) => `${p.name} ${draft[p.id] ?? 0}%`).join(", ")}.`, "text-[#d4af37]");
      onToast("Pool allocations updated.", "success");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Failed to save allocations.", "error");
    }
  }

  return (
    <div className="bg-white dark:bg-[rgba(25,32,42,0.4)] dark:backdrop-blur-md rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.08)] shadow-sm dark:shadow-none p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[12px] font-bold text-slate-900 dark:text-[#dce3f0] uppercase tracking-wider">Pool Allocations</h3>
        <span className="material-symbols-outlined text-slate-400 dark:text-[#99907c]">water_drop</span>
      </div>

      {/* Platform-wide summary */}
      <div className="space-y-2 mb-5">
        {(summaryData?.pools ?? []).map((pool) => (
          <div key={pool.id} className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-2 font-semibold text-slate-600 dark:text-[#d0c5af]">
              <span className={`size-2 rounded-full ${TAG_DOT[pool.tagColor] ?? TAG_DOT.gold}`} />
              {pool.name}
            </span>
            <span className="text-slate-500 dark:text-[#99907c]">
              {pool.investorCount} investor{pool.investorCount === 1 ? "" : "s"} · avg {pool.averageAllocationPct}%
            </span>
          </div>
        ))}
        {(summaryData?.pools ?? []).length === 0 && (
          <p className="text-[11px] text-slate-400 dark:text-[#99907c]">No active pools.</p>
        )}
      </div>

      {!canEdit ? (
        <p className="text-[11px] text-slate-400 dark:text-[#99907c] border-t border-slate-100 dark:border-[#4d4635] pt-4">
          Only the Platform Controller can edit individual investor allocations.
        </p>
      ) : (
        <div className="border-t border-slate-100 dark:border-[#4d4635] pt-4 space-y-3">
          <div className="relative">
            {searching ? (
              <Loader2 className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-[#d4af37]" />
            ) : (
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            )}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search investor to edit allocations..."
              className="w-full bg-slate-50 dark:bg-[#080f18] border border-slate-200 dark:border-[#4d4635] rounded-lg py-2 pl-9 pr-3 text-[12px] text-slate-900 dark:text-[#dce3f0] outline-none focus:border-[#d4af37]"
            />
          </div>

          {debouncedQuery.trim().length >= 2 && !selectedId && (
            <ul className="max-h-40 overflow-y-auto rounded-lg border border-slate-100 dark:border-[#4d4635] divide-y divide-slate-50 dark:divide-white/5">
              {(searchData?.results ?? []).length === 0 && (
                <li className="px-3 py-2 text-[11px] text-slate-400 dark:text-[#99907c]">No matches.</li>
              )}
              {(searchData?.results ?? []).map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => { setSelectedId(r.id); setQuery(""); }}
                    className="w-full text-left px-3 py-2 text-[12px] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <span className="font-semibold text-slate-800 dark:text-[#dce3f0]">{r.name}</span>{" "}
                    <span className="text-slate-400 dark:text-[#99907c]">{r.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selectedId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-bold text-slate-800 dark:text-[#dce3f0]">
                  {loadingAlloc ? "Loading..." : allocData?.investor.name}
                </p>
                <button
                  type="button"
                  onClick={() => { setSelectedId(null); setSyncedInvestorId(null); }}
                  className="text-[10px] font-bold text-slate-400 dark:text-[#99907c] hover:text-[#d4af37]"
                >
                  Change
                </button>
              </div>

              {allocData?.pools.map((pool) => (
                <div key={pool.id} className="flex items-center gap-3">
                  <span className="flex-1 text-[11px] font-semibold text-slate-600 dark:text-[#d0c5af]">{pool.name}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={draft[pool.id] ?? 0}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [pool.id]: Number(e.target.value) }))}
                    className="w-16 bg-slate-50 dark:bg-[#080f18] border border-slate-200 dark:border-[#4d4635] rounded px-2 py-1 text-[12px] text-right text-slate-900 dark:text-[#dce3f0] outline-none focus:border-[#d4af37]"
                  />
                  <span className="text-[11px] text-slate-400 dark:text-[#99907c]">%</span>
                </div>
              ))}

              <div className="flex items-center justify-between pt-1">
                <span className={`text-[11px] font-bold ${totalValid ? "text-[#4edea3]" : "text-red-500 dark:text-[#ffb4ab]"}`}>
                  Total: {total.toFixed(1)}%
                </span>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!totalValid || saveMutation.isPending}
                  className="px-4 py-1.5 rounded-lg bg-[#d4af37] text-[#3c2f00] text-[11px] font-bold disabled:opacity-50 hover:bg-[#c9a830] transition-colors"
                >
                  {saveMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
