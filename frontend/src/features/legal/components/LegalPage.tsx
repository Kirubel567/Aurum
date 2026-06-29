"use client";

import { useState, useMemo } from "react";
import { X, Download, Loader2, Shield, FileText, Eye, Handshake, ScrollText, Landmark, Scale, Lock } from "lucide-react";
import { useNotificationStore } from "@/src/store/notification.store";
import type { ToastItem } from "@/src/store/notification.store";

// ── Types ──────────────────────────────────────────────────────────────────────

type DocType = "agreement" | "contract" | "bank" | "legal";
type Tab = "all" | DocType;

interface Document {
  id: string;
  name: string;
  type: DocType;
  date: string;
  description: string;
  filename: string;
  previewContent: string[];  // paragraphs to show in preview modal
}

// ── Static data ────────────────────────────────────────────────────────────────

const DOCUMENTS: Document[] = [
  {
    id: "1",
    name: "Partnership Agreement",
    type: "agreement",
    date: "May 15, 2025",
    description: "Agreement between investor and Aurum Sovereign Capital.",
    filename: "partnership-agreement.pdf",
    previewContent: [
      "PARTNERSHIP AGREEMENT",
      "This Partnership Agreement (\"Agreement\") is entered into as of May 15, 2025, between Aurum Sovereign Capital LLC (\"Aurum\") and the undersigned investor (\"Partner\").",
      "1. PURPOSE\nThe purpose of this Agreement is to establish the terms and conditions under which the Partner will invest capital with Aurum Sovereign Capital for the purpose of participating in managed forex and commodity trading pools.",
      "2. CAPITAL CONTRIBUTION\nThe Partner agrees to contribute a minimum of USD 1,000 to the designated investment pool. Capital contributions are subject to the lock-up period outlined in Section 5.",
      "3. PROFIT SHARING\nProfits generated from trading activities shall be distributed as follows: 70% to the Partner, 30% to Aurum Sovereign Capital as management and performance fees.",
      "4. REPORTING\nAurum shall provide the Partner with monthly performance reports accessible through the investor portal. Real-time performance tracking is available via the Live Performance dashboard.",
      "5. LOCK-UP PERIOD\nCapital contributions are subject to a 30-day lock-up period from the date of deposit confirmation. Withdrawal requests may be submitted after the lock-up period has elapsed.",
      "6. GOVERNING LAW\nThis Agreement shall be governed by and construed in accordance with the laws of Ethiopia. Any disputes shall be resolved through binding arbitration.",
      "Signed electronically on May 15, 2025.\nAurum Sovereign Capital LLC — Authorized Signatory",
    ],
  },
  {
    id: "2",
    name: "Investment Contract",
    type: "contract",
    date: "May 15, 2025",
    description: "Investment terms and conditions.",
    filename: "investment-contract.pdf",
    previewContent: [
      "INVESTMENT CONTRACT",
      "This Investment Contract is made as of May 15, 2025, between Aurum Sovereign Capital LLC and the Investor named in the associated account profile.",
      "1. INVESTMENT STRATEGY\nThe Investor's capital will be allocated across Aurum's three strategy pools: Apex Gold (high-performance), Silver Shield (balanced), and Obsidian Core (conservative). Allocation ratios are determined at the time of onboarding.",
      "2. RISK DISCLOSURE\nForex and commodity trading involves significant risk of loss. Past performance is not indicative of future results. The Investor acknowledges that capital may be partially or fully lost and agrees to invest only amounts they can afford to lose.",
      "3. MANAGEMENT FEES\nAurum charges a 30% performance fee on net profits only. No management fee is charged on capital. Fees are deducted prior to profit distribution.",
      "4. WITHDRAWAL TERMS\nWithdrawal requests must be submitted through the investor portal. Processing time is 24–48 business hours after the lock-up period. Partial withdrawals are permitted subject to maintaining a minimum balance of USD 500.",
      "5. CONFIDENTIALITY\nAll terms of this contract are confidential. The Investor agrees not to disclose trading strategies, performance data, or internal communications to third parties.",
      "6. TERMINATION\nEither party may terminate this contract with 30 days written notice. Upon termination, all capital and accrued profits will be returned to the Investor within 5 business days.",
    ],
  },
  {
    id: "3",
    name: "Bank Details",
    type: "bank",
    date: "May 15, 2025",
    description: "Company bank account details for deposits.",
    filename: "bank-details.pdf",
    previewContent: [
      "AURUM SOVEREIGN CAPITAL — OFFICIAL BANK DETAILS",
      "The following bank account details are to be used exclusively for investment deposits. Please include your Investor ID in the transfer reference to ensure correct allocation.",
      "LOCAL TRANSFER (CBE)\nBank Name: Commercial Bank of Ethiopia\nAccount Name: Aurum Sovereign Capital LLC\nAccount Number: 1000XXXXXXXX\nBranch: Bole, Addis Ababa\nSWIFT/BIC: CBETETAA",
      "INTERNATIONAL WIRE TRANSFER\nBank Name: Commercial Bank of Ethiopia\nAccount Name: Aurum Sovereign Capital LLC\nIBAN: ET00 0000 0000 0000 XXXX\nSWIFT/BIC: CBETETAA\nCorrespondent Bank: Citibank N.A., New York\nCorrespondent SWIFT: CITIUS33",
      "IMPORTANT INSTRUCTIONS\n• Always include your Investor ID (e.g., ASC-78345) in the transfer reference\n• Send proof of transfer via the Deposit section of the portal\n• Processing time: 1–3 business hours for CBE transfers, 1–3 business days for international wires",
      "⚠️  WARNING: Aurum Sovereign Capital will NEVER ask you to transfer funds to a personal account. If you receive alternate banking instructions from any source, do not act on them and contact your account manager immediately.",
    ],
  },
  {
    id: "4",
    name: "Terms & Conditions",
    type: "legal",
    date: "May 15, 2025",
    description: "General platform terms and conditions.",
    filename: "terms-and-conditions.pdf",
    previewContent: [
      "TERMS & CONDITIONS",
      "Last updated: May 15, 2025. These Terms & Conditions govern your use of the Aurum Sovereign Capital investor portal and associated services.",
      "1. ACCEPTANCE OF TERMS\nBy accessing the Aurum investor portal, you confirm that you have read, understood, and agree to be bound by these Terms & Conditions and all applicable laws.",
      "2. ELIGIBILITY\nYou must be at least 18 years of age and legally capable of entering into binding contracts in your jurisdiction to use our services.",
      "3. ACCOUNT SECURITY\nYou are responsible for maintaining the confidentiality of your login credentials. Aurum will never ask for your password. You must notify us immediately of any unauthorized account access.",
      "4. PROHIBITED ACTIVITIES\nUsers may not attempt to circumvent platform security, engage in market manipulation, or use the platform for any unlawful purpose including money laundering or terrorist financing.",
      "5. LIMITATION OF LIABILITY\nAurum Sovereign Capital's liability is limited to the amount of capital actively managed on your behalf. We are not liable for losses arising from market conditions beyond our control.",
      "6. AMENDMENTS\nAurum reserves the right to modify these Terms at any time. Continued use of the platform after changes constitutes acceptance of the revised Terms.",
      "7. CONTACT\nFor questions about these Terms, contact legal@aurumsc.com or your dedicated account manager.",
    ],
  },
  {
    id: "5",
    name: "Privacy Policy",
    type: "legal",
    date: "May 15, 2025",
    description: "Privacy policy and data protection.",
    filename: "privacy-policy.pdf",
    previewContent: [
      "PRIVACY POLICY",
      "Last updated: May 15, 2025. Aurum Sovereign Capital LLC (\"we,\" \"us,\" or \"our\") is committed to protecting your personal information.",
      "1. DATA WE COLLECT\nWe collect: (a) Identity data — full name, date of birth, government ID; (b) Contact data — email address, phone number; (c) Financial data — bank details, transaction history, portfolio performance; (d) Technical data — IP address, browser type, session data.",
      "2. HOW WE USE YOUR DATA\nYour data is used to: provide and manage investment services, verify your identity for KYC/AML compliance, send performance reports and platform notifications, and improve our services.",
      "3. DATA SHARING\nWe do not sell your personal data. We may share data with: regulatory authorities when required by law, payment processors for transaction facilitation, and auditors under confidentiality agreements.",
      "4. DATA SECURITY\nAll data is encrypted in transit (TLS 1.3) and at rest (AES-256). Access to personal data is restricted to authorized personnel on a need-to-know basis.",
      "5. YOUR RIGHTS\nYou have the right to access, correct, or delete your personal data. Submit requests to privacy@aurumsc.com. We will respond within 30 days.",
      "6. COOKIES\nOur portal uses essential session cookies only. No third-party tracking or advertising cookies are used.",
      "7. CONTACT\nData Protection Officer: privacy@aurumsc.com | Aurum Sovereign Capital LLC, Bole, Addis Ababa, Ethiopia.",
    ],
  },
];

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All Documents" },
  { id: "agreement", label: "Agreements" },
  { id: "contract", label: "Contracts" },
  { id: "bank", label: "Bank Details" },
  { id: "legal", label: "Legal" },
];

const TYPE_BADGE: Record<DocType, { label: string; className: string }> = {
  agreement: { label: "Agreement",   className: "bg-orange-50 text-orange-600" },
  contract:  { label: "Contract",    className: "bg-blue-50 text-blue-600" },
  bank:      { label: "Bank Detail", className: "bg-green-50 text-green-600" },
  legal:     { label: "Legal",       className: "bg-purple-50 text-purple-600" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function simulateDownload(doc: Document, addToast: (toast: Omit<ToastItem, "id">) => void) {
  const content = [doc.name, `Date: ${doc.date}`, "", ...doc.previewContent].join("\n\n");
  const blob = new Blob([content], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = doc.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  addToast({ title: "Download started", description: `${doc.name} is downloading.`, variant: "success" });
}

// ── Doc icon ───────────────────────────────────────────────────────────────────

function DocIcon({ size = "sm" }: { size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "w-12 h-12 rounded-xl" : "w-8 h-8 rounded";
  const icon = size === "lg" ? "w-6 h-6" : "w-4 h-4";
  return (
    <div className={`${cls} bg-red-50 flex items-center justify-center shrink-0`}>
      <svg className={`${icon} text-red-500`} fill="currentColor" viewBox="0 0 24 24">
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
  doc: Document;
  onClose: () => void;
  onDownload: () => void;
  downloading: boolean;
}) {
  const badge = TYPE_BADGE[doc.type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 bg-[#0C1526] shrink-0">
          <DocIcon size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{doc.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${badge.className}`}>
                {badge.label}
              </span>
              <span className="text-[11px] text-slate-400">{doc.date}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#D4AF37] text-[#0C1526] text-xs font-bold rounded-xl hover:bg-[#c9a030] transition-all active:scale-95 disabled:opacity-60"
            >
              {downloading
                ? <Loader2 className="size-3.5 animate-spin" />
                : <Download className="size-3.5" />}
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
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50/50 [scrollbar-width:thin] [scrollbar-color:#e2e8f0_transparent]">
          {/* Paper effect */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
            {/* Watermark header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aurum Sovereign Capital</p>
                <p className="text-[11px] text-slate-400">Confidential · {doc.date}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-[#0C1526] flex items-center justify-center">
                <FileText className="size-3.5 text-[#D4AF37]" />
              </div>
            </div>

            {/* Content paragraphs */}
            {doc.previewContent.map((para, i) => {
              const isTitle = i === 0;
              const isSectionHeading = !isTitle && para.match(/^\d+\./);
              return (
                <div key={i}>
                  {isTitle ? (
                    <h2 className="text-lg font-extrabold text-slate-900 text-center tracking-wide">{para}</h2>
                  ) : isSectionHeading ? (
                    <div>
                      <p className="text-[13px] font-bold text-slate-800 mb-1">{para.split("\n")[0]}</p>
                      {para.split("\n").slice(1).map((line, j) => (
                        <p key={j} className="text-[13px] text-slate-600 leading-relaxed">{line}</p>
                      ))}
                    </div>
                  ) : (
                    <div>
                      {para.split("\n").map((line, j) => (
                        <p key={j} className={`text-[13px] leading-relaxed ${line.startsWith("•") || line.startsWith("⚠") ? "text-slate-700" : "text-slate-600"}`}>
                          {line}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
              <Shield className="size-3.5 text-slate-300 shrink-0" />
              <p className="text-[10px] text-slate-400">Document ID: ASC-{doc.id.padStart(6, "0")} · Digitally signed · Aurum Sovereign Capital LLC</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function LegalPage() {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [preview, setPreview] = useState<Document | null>(null);
  const [showGuide, setShowGuide] = useState(false);
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
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f8fafc]">
      {/* Documents Guide modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowGuide(false)}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#0C1526] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 flex items-center justify-center">
                  <FileText className="size-4 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Documents Guide</p>
                  <p className="text-[10px] text-slate-400">What each document means for you</p>
                </div>
              </div>
              <button onClick={() => setShowGuide(false)} className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors">
                <X className="size-4 text-slate-400" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 [scrollbar-width:thin] [scrollbar-color:#e2e8f0_transparent]">
              {[
                {
                  type: "agreement" as DocType,
                  title: "Partnership Agreement",
                  Icon: Handshake,
                  what: "The foundational legal contract between you and Aurum Sovereign Capital.",
                  contains: ["Your investor rights and obligations", "Profit-sharing ratio (70% investor / 30% Aurum)", "Lock-up period terms", "Dispute resolution process"],
                  action: "Read carefully before your first deposit. This is the core document governing your investment relationship.",
                },
                {
                  type: "contract" as DocType,
                  title: "Investment Contract",
                  Icon: ScrollText,
                  what: "Defines exactly how your capital is invested and managed.",
                  contains: ["Strategy pool allocation details", "Risk disclosure and acknowledgements", "Fee structure", "Withdrawal terms and timelines"],
                  action: "Review the risk section thoroughly. It outlines scenarios where capital may be at risk.",
                },
                {
                  type: "bank" as DocType,
                  title: "Bank Details",
                  Icon: Landmark,
                  what: "The official bank account information for sending your deposits.",
                  contains: ["CBE local transfer details", "International wire transfer details", "Your Investor ID for transfer reference", "Security warnings"],
                  action: "Always verify this document before making a transfer. Never use banking details sent via email or chat.",
                },
                {
                  type: "legal" as DocType,
                  title: "Terms & Conditions",
                  Icon: Scale,
                  what: "The rules governing your use of the Aurum investor portal and services.",
                  contains: ["Eligibility requirements", "Account security responsibilities", "Prohibited activities", "Limitation of liability"],
                  action: "Your continued use of the platform implies acceptance. Review any updates when notified.",
                },
                {
                  type: "legal" as DocType,
                  title: "Privacy Policy",
                  Icon: Lock,
                  what: "Explains what personal data Aurum collects and how it is protected.",
                  contains: ["Types of data collected", "How data is used and shared", "Your rights (access, correction, deletion)", "Security measures in place"],
                  action: "Contact privacy@aurumsc.com to exercise your data rights or ask questions.",
                },
              ].map((item, i) => {
                const badge = TYPE_BADGE[item.type];
                return (
                  <div key={i} className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-colors">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        <item.Icon className="size-4 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-[13px] font-bold text-slate-900">{item.title}</p>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${badge.className}`}>{badge.label}</span>
                        </div>
                        <p className="text-[12px] text-slate-500">{item.what}</p>
                      </div>
                    </div>
                    <div className="ml-9 space-y-2">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Contains</p>
                      <ul className="space-y-1">
                        {item.contains.map((c) => (
                          <li key={c} className="flex items-start gap-2 text-[12px] text-slate-600">
                            <svg className="w-2.5 h-2.5 text-[#D4AF37] mt-1 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {c}
                          </li>
                        ))}
                      </ul>
                      <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-lg px-3 py-2 mt-2">
                        <p className="text-[11px] text-[#9a7c3f] font-medium">{item.action}</p>
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
          onDownload={() => handleDownload(preview)}
          downloading={downloading === preview.id}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-1">My Contract</h1>
          <p className="text-sm text-[#64748b]">View and download your agreements and important documents.</p>
        </div>
        <button
          onClick={() => setShowGuide(true)}
          className="flex w-fit items-center gap-2 px-4 py-2 border border-[#d4af37] text-[#d4af37] rounded-lg text-sm font-semibold hover:bg-[#fdf6e3] transition-colors"
        >
          <FileText className="size-4" />
          Documents Guide
        </button>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden">

        {/* Tabs — overflow-y-hidden removes the vertical scrollbar */}
        <div className="flex overflow-x-auto overflow-y-hidden border-b border-[#e2e8f0] px-4 sm:px-6 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

        {/* Document list */}
        <div className="p-4 sm:p-6">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-[#64748b] text-sm">No documents in this category.</div>
          ) : (
            <>
              {/* ── Mobile cards ── */}
              <div className="flex flex-col gap-3 md:hidden">
                {filtered.map((doc) => {
                  const badge = TYPE_BADGE[doc.type];
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setPreview(doc)}
                      className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50 cursor-pointer hover:border-[#d4af37]/30 hover:bg-[#fdf6e3]/30 transition-all"
                    >
                      <DocIcon />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-[13px] font-semibold text-slate-900 leading-tight">{doc.name}</p>
                          <span className={`shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-2">{doc.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">{doc.date}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setPreview(doc); }}
                              className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                            >
                              <Eye className="size-3" /> Preview
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                              disabled={downloading === doc.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#d4af37] text-[#d4af37] text-xs font-bold rounded-lg hover:bg-[#fdf6e3] transition-colors disabled:opacity-60"
                            >
                              {downloading === doc.id
                                ? <Loader2 className="size-3 animate-spin" />
                                : <Download className="size-3" />}
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
                  <tr className="text-[11px] uppercase tracking-wider text-[#64748b] border-b border-[#e2e8f0]">
                    <th className="pb-4 font-semibold">Document Name</th>
                    <th className="pb-4 font-semibold">Type</th>
                    <th className="pb-4 font-semibold">Date</th>
                    <th className="pb-4 font-semibold">Description</th>
                    <th className="pb-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filtered.map((doc, idx) => {
                    const badge = TYPE_BADGE[doc.type];
                    const isLast = idx === filtered.length - 1;
                    return (
                      <tr
                        key={doc.id}
                        onClick={() => setPreview(doc)}
                        className={`cursor-pointer transition-colors hover:bg-slate-50 ${!isLast ? "border-b border-slate-50" : ""}`}
                      >
                        <td className="py-5">
                          <div className="flex items-center gap-3">
                            <DocIcon />
                            <span className="font-medium text-slate-900">{doc.name}</span>
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
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setPreview(doc); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                              <Eye className="size-3.5" /> Preview
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                              disabled={downloading === doc.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#d4af37] text-[#d4af37] text-xs font-bold rounded-lg hover:bg-[#fdf6e3] transition-colors disabled:opacity-60"
                            >
                              {downloading === doc.id
                                ? <Loader2 className="size-3.5 animate-spin" />
                                : <Download className="size-3.5" />}
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
        <div className="px-4 sm:px-6 pb-6 pt-2">
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-center gap-3 text-xs text-slate-700">
            <Shield className="w-5 h-5 text-blue-600 shrink-0" />
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
