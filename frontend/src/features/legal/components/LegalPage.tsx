"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { X, Download, Loader2, Shield, FileText, Eye, Handshake, ScrollText, Landmark, Scale, Lock, RefreshCw } from "lucide-react";
import { useNotificationStore } from "@/src/store/notification.store";
import type { ToastItem } from "@/src/store/notification.store";

// ── Types ──────────────────────────────────────────────────────────────────────

type DocType = "agreement" | "contract" | "bank" | "legal";
type Tab = "all" | DocType;

interface LegalDocument {
  id: string;
  title: string;
  doc_type: DocType;
  description: string;
  storage_path: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "all",       label: "All Documents" },
  { id: "agreement", label: "Agreements" },
  { id: "contract",  label: "Contracts" },
  { id: "bank",      label: "Bank Details" },
  { id: "legal",     label: "Legal" },
];

const TYPE_BADGE: Record<DocType, { label: string; className: string }> = {
  agreement: { label: "Agreement",   className: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400" },
  contract:  { label: "Contract",    className: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" },
  bank:      { label: "Bank Detail", className: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400" },
  legal:     { label: "Legal",       className: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// ── Doc icon ───────────────────────────────────────────────────────────────────

function DocIcon({ size = "sm" }: { size?: "sm" | "lg" }) {
  const cls  = size === "lg" ? "w-12 h-12 rounded-xl" : "w-8 h-8 rounded";
  const icon = size === "lg" ? "w-6 h-6" : "w-4 h-4";
  return (
    <div className={`${cls} bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0`}>
      <svg className={`${icon} text-red-500 dark:text-red-400`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13,9V3.5L18.5,9H13Z" />
      </svg>
    </div>
  );
}

// ── Preview modal ──────────────────────────────────────────────────────────────

function PreviewModal({
  doc,
  onClose,
  onDownload,
  downloading,
}: {
  doc: LegalDocument;
  onClose: () => void;
  onDownload: () => void;
  downloading: boolean;
}) {
  const badge = TYPE_BADGE[doc.doc_type];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 dark:bg-[rgba(15,23,42,0.6)] dark:[backdrop-filter:blur(12px)] dark:border dark:border-[rgba(255,255,255,0.1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 bg-[#0C1526] shrink-0 dark:border-[rgba(255,255,255,0.1)]">
          <DocIcon size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{doc.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${badge.className}`}>
                {badge.label}
              </span>
              <span className="text-[11px] text-slate-400">{formatDate(doc.created_at)}</span>
              {doc.is_read && (
                <span className="text-[10px] text-emerald-400 font-semibold">✓ Read</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#D4AF37] text-[#0C1526] text-xs font-bold rounded-xl hover:bg-[#c9a030] transition-all active:scale-95 disabled:opacity-60"
            >
              {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              Download
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="size-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Document body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50/50 dark:bg-transparent [scrollbar-width:thin] [scrollbar-color:#e2e8f0_transparent]">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5 dark:bg-[rgba(255,255,255,0.03)] dark:border-[rgba(255,255,255,0.1)]">
            {/* Watermark header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[rgba(255,255,255,0.1)]">
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">Aurum Sovereign Capital</p>
                <p className="text-[11px] text-slate-400 dark:text-white/30">Confidential · {formatDate(doc.created_at)}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-[#0C1526] flex items-center justify-center">
                <FileText className="size-3.5 text-[#D4AF37]" />
              </div>
            </div>

            {/* Document info */}
            <div className="space-y-3">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white text-center tracking-wide">{doc.title}</h2>
              {doc.description && (
                <p className="text-[13px] text-slate-600 dark:text-white/60 leading-relaxed text-center">{doc.description}</p>
              )}
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-4 text-[13px] text-amber-800 dark:text-amber-300">
                <p className="font-semibold mb-1">Document Notice</p>
                <p>This document is confidential and issued specifically to you by Aurum Sovereign Capital. Download the PDF to view the full content.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 dark:border-[rgba(255,255,255,0.1)] flex items-center gap-2">
              <Shield className="size-3.5 text-slate-300 dark:text-white/20 shrink-0" />
              <p className="text-[10px] text-slate-400 dark:text-white/30">
                Document ID: ASC-{doc.id.slice(0, 8).toUpperCase()} · Digitally signed · Aurum Sovereign Capital LLC
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="py-20 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
        <FileText className="size-7 text-slate-300 dark:text-white/20" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700 dark:text-white/70 mb-1">No documents yet</p>
        <p className="text-xs text-slate-400 dark:text-white/30">Your legal documents will appear here once your account manager assigns them.</p>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function LegalPage() {
  const [activeTab, setActiveTab]     = useState<Tab>("all");
  const [documents, setDocuments]     = useState<LegalDocument[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [preview, setPreview]         = useState<LegalDocument | null>(null);
  const [showGuide, setShowGuide]     = useState(false);
  const addToast = useNotificationStore((s) => s.addToast);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/legal/documents");
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load documents");
      const data = await res.json() as { documents: LegalDocument[] };
      setDocuments(data.documents);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const filtered = useMemo(
    () => activeTab === "all" ? documents : documents.filter((d) => d.doc_type === activeTab),
    [activeTab, documents]
  );

  // Mark as read when preview opens
  const openPreview = useCallback(async (doc: LegalDocument) => {
    setPreview(doc);
    if (!doc.is_read) {
      await fetch(`/api/legal/documents/${doc.id}/read`, { method: "PATCH" });
      setDocuments((prev) =>
        prev.map((d) => d.id === doc.id ? { ...d, is_read: true, read_at: new Date().toISOString() } : d)
      );
    }
  }, []);

  const handleDownload = useCallback(async (doc: LegalDocument, addToastFn: (t: Omit<ToastItem, "id">) => void) => {
    if (downloading) return;
    setDownloading(doc.id);
    try {
      const res = await fetch(`/api/legal/documents/${doc.id}/download`);
      if (!res.ok) throw new Error((await res.json()).error ?? "Download failed");
      const { url } = await res.json() as { url: string };
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.title.toLowerCase().replace(/\s+/g, "-")}.pdf`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addToastFn({ title: "Download started", description: `${doc.title} is downloading.`, variant: "success" });
    } catch (e) {
      addToastFn({ title: "Download failed", description: (e as Error).message, variant: "error" });
    } finally {
      setDownloading(null);
    }
  }, [downloading]);

  const unreadCount = documents.filter((d) => !d.is_read).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f8fafc] dark:bg-transparent">

      {/* Documents Guide modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowGuide(false)}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 dark:bg-[rgba(15,23,42,0.6)] dark:[backdrop-filter:blur(12px)] dark:border dark:border-[rgba(255,255,255,0.1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#0C1526] shrink-0 dark:border-[rgba(255,255,255,0.1)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 flex items-center justify-center">
                  <FileText className="size-4 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Documents Guide</p>
                  <p className="text-[10px] text-slate-400">What each document type means</p>
                </div>
              </div>
              <button onClick={() => setShowGuide(false)} className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors">
                <X className="size-4 text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 [scrollbar-width:thin] [scrollbar-color:#e2e8f0_transparent]">
              {([
                { type: "agreement" as DocType, title: "Partnership Agreement", Icon: Handshake,  what: "The foundational legal contract between you and Aurum Sovereign Capital.", contains: ["Your investor rights and obligations", "Profit-sharing ratio (70% investor / 30% Aurum)", "Lock-up period terms", "Dispute resolution process"], action: "Read carefully before your first deposit. This is the core document governing your investment relationship." },
                { type: "contract"  as DocType, title: "Investment Contract",   Icon: ScrollText, what: "Defines exactly how your capital is invested and managed.", contains: ["Strategy pool allocation details", "Risk disclosure and acknowledgements", "Fee structure", "Withdrawal terms and timelines"], action: "Review the risk section thoroughly. It outlines scenarios where capital may be at risk." },
                { type: "bank"      as DocType, title: "Bank Details",          Icon: Landmark,   what: "The official bank account information for sending your deposits.", contains: ["CBE local transfer details", "International wire transfer details", "Your Investor ID for transfer reference", "Security warnings"], action: "Always verify this document before making a transfer. Never use banking details sent via email or chat." },
                { type: "legal"     as DocType, title: "Legal Documents",       Icon: Scale,      what: "Terms & Conditions, Privacy Policy, and compliance documents.", contains: ["Eligibility requirements", "Account security responsibilities", "Data protection rights", "Limitation of liability"], action: "Your continued use of the platform implies acceptance. Review any updates when notified." },
              ] as { type: DocType; title: string; Icon: React.ComponentType<{ className?: string }>; what: string; contains: string[]; action: string }[]).map((item, i) => {
                const badge = TYPE_BADGE[item.type];
                return (
                  <div key={i} className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-colors dark:border-[rgba(255,255,255,0.1)] dark:hover:border-[rgba(255,255,255,0.2)]">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        <item.Icon className="size-4 text-slate-500 dark:text-white/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-[13px] font-bold text-slate-900 dark:text-white">{item.title}</p>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${badge.className}`}>{badge.label}</span>
                        </div>
                        <p className="text-[12px] text-slate-500 dark:text-white/40">{item.what}</p>
                      </div>
                    </div>
                    <div className="ml-9 space-y-2">
                      <p className="text-[11px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-wide">Contains</p>
                      <ul className="space-y-1">
                        {item.contains.map((c) => (
                          <li key={c} className="flex items-start gap-2 text-[12px] text-slate-600 dark:text-white/60">
                            <svg className="w-2.5 h-2.5 text-[#D4AF37] mt-1 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            {c}
                          </li>
                        ))}
                      </ul>
                      <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-lg px-3 py-2 mt-2">
                        <p className="text-[11px] text-[#9a7c3f] dark:text-[#d4af37]/80 font-medium">{item.action}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <PreviewModal
          doc={preview}
          onClose={() => setPreview(null)}
          onDownload={() => handleDownload(preview, addToast)}
          downloading={downloading === preview.id}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-1">My Contract</h1>
          <p className="text-sm text-[#64748b] dark:text-[#94a3b8]">
            View and download your agreements and important documents.
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDocuments}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowGuide(true)}
            className="flex w-fit items-center gap-2 px-4 py-2 border border-[#d4af37] text-[#d4af37] rounded-lg text-sm font-semibold hover:bg-[#fdf6e3] transition-colors dark:hover:bg-[#d4af37]/10"
          >
            <FileText className="size-4" />
            Documents Guide
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden dark:bg-[rgba(15,23,42,0.6)] dark:[backdrop-filter:blur(12px)] dark:border-[rgba(255,255,255,0.1)] dark:shadow-none">

        {/* Tabs */}
        <div className="flex overflow-x-auto overflow-y-hidden border-b border-[#e2e8f0] px-4 sm:px-6 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:border-[rgba(255,255,255,0.1)]">
          {TABS.map((tab) => {
            const count = tab.id === "all"
              ? documents.length
              : documents.filter((d) => d.doc_type === tab.id).length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 px-3 sm:px-4 py-3 text-sm font-medium mr-2 sm:mr-4 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-b-2 border-[#d4af37] text-[#050b14] font-semibold -mb-px dark:text-[#d4af37]"
                    : "text-[#64748b] hover:text-slate-900 dark:text-[#94a3b8] dark:hover:text-white"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium dark:bg-white/10 dark:text-white/40">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <Loader2 className="size-8 text-[#d4af37] animate-spin" />
              <p className="text-sm text-slate-400 dark:text-white/40">Loading your documents…</p>
            </div>
          ) : error ? (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>
              <button onClick={fetchDocuments} className="text-xs text-[#d4af37] underline">Try again</button>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* ── Mobile cards ── */}
              <div className="flex flex-col gap-3 md:hidden">
                {filtered.map((doc) => {
                  const badge = TYPE_BADGE[doc.doc_type];
                  return (
                    <div
                      key={doc.id}
                      onClick={() => openPreview(doc)}
                      className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer hover:border-[#d4af37]/30 transition-all dark:border-[rgba(255,255,255,0.08)] dark:bg-white/5 dark:hover:border-[#d4af37]/30 dark:hover:bg-[rgba(212,175,55,0.05)]"
                      style={{ borderColor: doc.is_read ? undefined : "#d4af3740" }}
                    >
                      <div className="relative">
                        <DocIcon />
                        {!doc.is_read && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-[13px] font-semibold text-slate-900 dark:text-white leading-tight">{doc.title}</p>
                          <span className={`shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${badge.className}`}>{badge.label}</span>
                        </div>
                        {doc.description && (
                          <p className="text-[11px] text-slate-500 dark:text-white/40 mb-2">{doc.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 dark:text-white/30">{formatDate(doc.created_at)}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); openPreview(doc); }}
                              className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors dark:text-white/40 dark:hover:text-white"
                            >
                              <Eye className="size-3" /> Preview
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDownload(doc, addToast); }}
                              disabled={downloading === doc.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#d4af37] text-[#d4af37] text-xs font-bold rounded-lg hover:bg-[#fdf6e3] transition-colors disabled:opacity-60 dark:hover:bg-[#d4af37]/10"
                            >
                              {downloading === doc.id ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Desktop table ── */}
              <table className="hidden md:table w-full text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-[#64748b] dark:text-white/40 border-b border-[#e2e8f0] dark:border-[rgba(255,255,255,0.1)]">
                    <th className="pb-4 font-semibold">Document Name</th>
                    <th className="pb-4 font-semibold">Type</th>
                    <th className="pb-4 font-semibold">Date Added</th>
                    <th className="pb-4 font-semibold">Status</th>
                    <th className="pb-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filtered.map((doc, idx) => {
                    const badge = TYPE_BADGE[doc.doc_type];
                    const isLast = idx === filtered.length - 1;
                    return (
                      <tr
                        key={doc.id}
                        onClick={() => openPreview(doc)}
                        className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-[rgba(255,255,255,0.03)] ${!isLast ? "border-b border-slate-50 dark:border-[rgba(255,255,255,0.05)]" : ""}`}
                      >
                        <td className="py-5">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <DocIcon />
                              {!doc.is_read && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
                              )}
                            </div>
                            <span className="font-medium text-slate-900 dark:text-slate-200">{doc.title}</span>
                          </div>
                        </td>
                        <td className="py-5">
                          <span className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-5 text-[#64748b] dark:text-[#94a3b8]">{formatDate(doc.created_at)}</td>
                        <td className="py-5">
                          {doc.is_read ? (
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">✓ Read</span>
                          ) : (
                            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">● New</span>
                          )}
                        </td>
                        <td className="py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); openPreview(doc); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors dark:text-white/40 dark:border-white/10 dark:hover:bg-white/5"
                            >
                              <Eye className="size-3.5" /> Preview
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDownload(doc, addToast); }}
                              disabled={downloading === doc.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#d4af37] text-[#d4af37] text-xs font-bold rounded-lg hover:bg-[#fdf6e3] transition-colors disabled:opacity-60 dark:hover:bg-[#d4af37]/10"
                            >
                              {downloading === doc.id ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                              Download
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Trust banner */}
        {!loading && !error && (
          <div className="px-4 sm:px-6 pb-6 pt-2">
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-center gap-3 text-xs text-slate-700 dark:bg-blue-900/20 dark:border-blue-500/30 dark:text-blue-200">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                <strong className="text-blue-700 dark:text-blue-300">Your security and peace of mind are our priority.</strong>{" "}
                All documents are legally verified. Downloads are secured with time-limited signed URLs.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
