"use client";

import { useState, useMemo } from "react";
import { useNotificationStore } from "@/src/store/notification.store";
import type { ToastItem } from "@/src/store/notification.store";

// ── Types ──────────────────────────────────────────────────────────────────────

type DocType = "agreement" | "contract" | "bank" | "legal";

interface Document {
  id: string;
  name: string;
  type: DocType;
  date: string;
  description: string;
  filename: string;
}

type Tab = "all" | DocType;

// ── Static data ────────────────────────────────────────────────────────────────

const DOCUMENTS: Document[] = [
  {
    id: "1",
    name: "Partnership Agreement",
    type: "agreement",
    date: "May 15, 2025",
    description: "Agreement between investor and Aurum Sovereign Capital.",
    filename: "partnership-agreement.pdf",
  },
  {
    id: "2",
    name: "Investment Contract",
    type: "contract",
    date: "May 15, 2025",
    description: "Investment terms and conditions.",
    filename: "investment-contract.pdf",
  },
  {
    id: "3",
    name: "Bank Details",
    type: "bank",
    date: "May 15, 2025",
    description: "Company bank account details.",
    filename: "bank-details.pdf",
  },
  {
    id: "4",
    name: "Terms & Conditions",
    type: "legal",
    date: "May 15, 2025",
    description: "General terms and conditions.",
    filename: "terms-and-conditions.pdf",
  },
  {
    id: "5",
    name: "Privacy Policy",
    type: "legal",
    date: "May 15, 2025",
    description: "Privacy policy and data protection.",
    filename: "privacy-policy.pdf",
  },
];

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All Documents" },
  { id: "agreement", label: "Agreements" },
  { id: "contract", label: "Contracts" },
  { id: "bank", label: "Bank Details" },
  { id: "legal", label: "Legal Documents" },
];

// ── Type badge ─────────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<DocType, { label: string; className: string }> = {
  agreement: { label: "Agreement",   className: "bg-orange-50 text-orange-600" },
  contract:  { label: "Contract",    className: "bg-blue-50 text-blue-600" },
  bank:      { label: "Bank Detail", className: "bg-green-50 text-green-600" },
  legal:     { label: "Legal",       className: "bg-purple-50 text-purple-600" },
};

// ── Simulated download ─────────────────────────────────────────────────────────

function simulateDownload(doc: Document, addToast: (toast: Omit<ToastItem, "id">) => void) {
  // Create a tiny placeholder blob so the browser prompts a real save dialog
  const content = `Aurum Sovereign Capital\n${doc.name}\nDate: ${doc.date}\n\n${doc.description}\n\n[This is a simulated document for demo purposes.]`;
  const blob = new Blob([content], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = doc.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  addToast({
    title: "Download started",
    description: `${doc.name} is downloading.`,
    variant: "success",
  });
}

// ── Document icon ──────────────────────────────────────────────────────────────

function DocIcon() {
  return (
    <div className="w-8 h-8 bg-red-50 rounded flex items-center justify-center shrink-0">
      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13,9V3.5L18.5,9H13Z" />
      </svg>
    </div>
  );
}

// ── Download button ────────────────────────────────────────────────────────────

function DownloadBtn({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center px-3 py-1.5 border border-[#d4af37] text-[#d4af37] text-xs font-bold rounded-lg hover:bg-[#fdf6e3] transition-colors disabled:opacity-60"
    >
      {loading ? (
        <svg className="w-3.5 h-3.5 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      )}
      Download
    </button>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function LegalPage() {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [downloading, setDownloading] = useState<string | null>(null);
  const addToast = useNotificationStore((s) => s.addToast);

  const filtered = useMemo(
    () => (activeTab === "all" ? DOCUMENTS : DOCUMENTS.filter((d) => d.type === activeTab)),
    [activeTab]
  );

  const handleDownload = (doc: Document) => {
    if (downloading) return;
    setDownloading(doc.id);
    setTimeout(() => {
      simulateDownload(doc, addToast);
      setDownloading(null);
    }, 600);
  };

  const handleDownloadAll = () => {
    const docs = activeTab === "all" ? DOCUMENTS : filtered;
    docs.forEach((doc, i) => {
      setTimeout(() => {
        setDownloading(doc.id);
        setTimeout(() => {
          simulateDownload(doc, addToast);
          setDownloading(null);
        }, 400);
      }, i * 700);
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f8fafc] min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-1">My Contract</h1>
          <p className="text-sm text-[#64748b]">View and download your agreements and important documents.</p>
        </div>
        <button
          onClick={handleDownloadAll}
          className="flex w-fit items-center px-4 py-2 border border-[#d4af37] text-[#d4af37] rounded-lg text-sm font-semibold hover:bg-[#fdf6e3] transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
          Documents Guide
        </button>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden">
        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-[#e2e8f0] px-4 sm:px-6 pt-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-3 sm:px-4 py-3 text-sm font-medium mr-2 sm:mr-4 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-b-2 border-[#d4af37] text-[#050b14] font-semibold -mb-px"
                  : "text-[#64748b] hover:text-slate-900"
              }`}
            >
              {tab.label}
              {tab.id !== "all" && (
                <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">
                  {DOCUMENTS.filter((d) => d.type === tab.id).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto p-6">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-[#64748b] text-sm">
              No documents in this category.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-[#64748b] border-b border-[#e2e8f0]">
                  <th className="pb-4 font-semibold">Document Name</th>
                  <th className="pb-4 font-semibold">Type</th>
                  <th className="pb-4 font-semibold">Date</th>
                  <th className="pb-4 font-semibold">Description</th>
                  <th className="pb-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filtered.map((doc, idx) => {
                  const badge = TYPE_BADGE[doc.type];
                  const isLast = idx === filtered.length - 1;
                  return (
                    <tr
                      key={doc.id}
                      className={`transition-colors hover:bg-slate-50 ${!isLast ? "border-b border-slate-50" : ""}`}
                    >
                      <td className="py-5">
                        <div className="flex items-center">
                          <DocIcon />
                          <span className="ml-3 font-medium text-slate-900">{doc.name}</span>
                        </div>
                      </td>
                      <td className="py-5">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-5 text-[#64748b]">{doc.date}</td>
                      <td className="py-5 text-[#64748b]">{doc.description}</td>
                      <td className="py-5 text-right">
                        <DownloadBtn
                          onClick={() => handleDownload(doc)}
                          loading={downloading === doc.id}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Trust banner */}
        <div className="px-6 pb-6 pt-2">
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-center text-xs text-slate-700">
            <svg className="w-5 h-5 text-blue-600 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <span>
              <strong className="text-blue-700">Your security and peace of mind are our priority.</strong>{" "}
              All documents are legally verified and encrypted for your protection.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
