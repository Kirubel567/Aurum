"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload, Trash2, Loader2, FileText, CheckCircle2,
  XCircle, Search, ChevronDown, RefreshCw, Eye,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type DocType = "agreement" | "contract" | "bank" | "legal";

interface Investor {
  id: string;
  full_name: string;
  email: string;
}

interface LegalDoc {
  id: string;
  title: string;
  doc_type: DocType;
  description: string;
  storage_path: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  assigned_to: string;
  assignee: { id: string; full_name: string; email: string } | null;
  uploader: { id: string; full_name: string } | null;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: "agreement", label: "Partnership Agreement" },
  { value: "contract",  label: "Investment Contract" },
  { value: "bank",      label: "Bank Details" },
  { value: "legal",     label: "Legal / Terms" },
];

const TYPE_BADGE: Record<DocType, string> = {
  agreement: "bg-orange-100 text-orange-700",
  contract:  "bg-blue-100 text-blue-700",
  bank:      "bg-green-100 text-green-700",
  legal:     "bg-purple-100 text-purple-700",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// ── Upload modal ───────────────────────────────────────────────────────────────

function UploadModal({
  investors,
  onClose,
  onSuccess,
}: {
  investors: Investor[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile]               = useState<File | null>(null);
  const [title, setTitle]             = useState("");
  const [docType, setDocType]         = useState<DocType>("agreement");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo]   = useState("");
  const [uploading, setUploading]     = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [investorSearch, setInvestorSearch] = useState("");
  const [showDropdown, setShowDropdown]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredInvestors = investors.filter((i) =>
    `${i.full_name} ${i.email}`.toLowerCase().includes(investorSearch.toLowerCase())
  );

  const selectedInvestor = investors.find((i) => i.id === assignedTo);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim() || !assignedTo) {
      setError("File, title, and investor are required.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", title.trim());
      form.append("doc_type", docType);
      form.append("description", description.trim());
      form.append("assigned_to", assignedTo);
      const res = await fetch("/api/admin/legal", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
      onSuccess();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#0C1526]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 flex items-center justify-center">
              <Upload className="size-4 text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Upload Document</p>
              <p className="text-[10px] text-slate-400">Assign a legal document to an investor</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors">
            <XCircle className="size-4 text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 [scrollbar-width:thin]">
          {/* File picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Document File *</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                file ? "border-emerald-400 bg-emerald-50" : "border-slate-200 hover:border-[#d4af37] hover:bg-amber-50/30"
              }`}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="size-5 text-emerald-500" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-800">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ) : (
                <div>
                  <FileText className="size-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Click to select PDF</p>
                  <p className="text-xs text-slate-400 mt-1">PDF, DOC, DOCX accepted</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Document Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Partnership Agreement"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-[#d4af37]"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Document Type *</label>
            <div className="relative">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocType)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-[#d4af37] appearance-none bg-white"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this document…"
              rows={2}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-[#d4af37] resize-none"
            />
          </div>

          {/* Assign to investor */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Assign to Investor *</label>
            <div
              onClick={() => setShowDropdown((v) => !v)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm cursor-pointer flex items-center justify-between hover:border-[#d4af37] transition-colors"
            >
              {selectedInvestor ? (
                <div>
                  <span className="font-medium text-slate-800">{selectedInvestor.full_name}</span>
                  <span className="text-slate-400 ml-2 text-xs">{selectedInvestor.email}</span>
                </div>
              ) : (
                <span className="text-slate-400">Select investor…</span>
              )}
              <ChevronDown className="size-4 text-slate-400" />
            </div>
            {showDropdown && (
              <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                <div className="p-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded-lg">
                    <Search className="size-3.5 text-slate-400" />
                    <input
                      autoFocus
                      value={investorSearch}
                      onChange={(e) => setInvestorSearch(e.target.value)}
                      placeholder="Search investors…"
                      className="flex-1 text-sm bg-transparent focus:outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto [scrollbar-width:thin]">
                  {filteredInvestors.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No investors found</p>
                  ) : (
                    filteredInvestors.map((inv) => (
                      <div
                        key={inv.id}
                        onClick={() => { setAssignedTo(inv.id); setShowDropdown(false); }}
                        className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${assignedTo === inv.id ? "bg-amber-50" : ""}`}
                      >
                        <p className="text-sm font-medium text-slate-800">{inv.full_name}</p>
                        <p className="text-xs text-slate-400">{inv.email}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="w-full py-3 bg-[#D4AF37] text-[#0C1526] font-bold rounded-xl hover:bg-[#c9a030] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {uploading ? <><Loader2 className="size-4 animate-spin" /> Uploading…</> : <><Upload className="size-4" /> Upload & Assign</>}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Delete confirm modal ───────────────────────────────────────────────────────

function DeleteModal({
  doc,
  onClose,
  onConfirm,
  deleting,
}: {
  doc: LegalDoc;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="size-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Delete Document</p>
            <p className="text-xs text-slate-500">This cannot be undone.</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-6">
          Delete <strong>{doc.title}</strong> assigned to <strong>{doc.assignee?.full_name ?? "unknown"}</strong>?
          The file will be permanently removed from storage.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminLegalPage() {
  const [docs, setDocs]                 = useState<LegalDoc[]>([]);
  const [investors, setInvestors]       = useState<Investor[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [filterType, setFilterType]     = useState<DocType | "all">("all");
  const [showUpload, setShowUpload]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LegalDoc | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [docsRes, usersRes] = await Promise.all([
        fetch("/api/admin/legal"),
        fetch("/api/admin/users"),
      ]);
      const docsData  = await docsRes.json()  as { documents: LegalDoc[] };
      const usersData = await usersRes.json() as { users: Investor[] };
      setDocs(docsData.documents ?? []);
      setInvestors((usersData.users ?? []).filter((u: Investor & { role?: string }) => (u as { role?: string }).role !== "admin" && (u as { role?: string }).role !== "super_admin"));
    } catch {
      // silently fail — user will see empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/legal/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
      setDocs((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      showToast("Document deleted.");
      setDeleteTarget(null);
    } catch (e) {
      showToast((e as Error).message, false);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = docs.filter((d) => {
    const matchType = filterType === "all" || d.doc_type === filterType;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      d.title.toLowerCase().includes(q) ||
      d.assignee?.full_name.toLowerCase().includes(q) ||
      d.assignee?.email.toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 animate-in slide-in-from-top-2 duration-200 ${toast.ok ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.ok ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
          {toast.msg}
        </div>
      )}

      {showUpload && (
        <UploadModal
          investors={investors}
          onClose={() => setShowUpload(false)}
          onSuccess={() => { fetchData(); showToast("Document uploaded and assigned."); }}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          doc={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-1">Legal Documents</h1>
          <p className="text-sm text-slate-500">Upload and assign contracts to investors. Files stored in private Supabase Storage.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] text-[#0C1526] font-bold rounded-xl hover:bg-[#c9a030] transition-all text-sm"
          >
            <Upload className="size-4" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or investor…"
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-[#d4af37]"
          />
        </div>
        <div className="relative">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as DocType | "all")}
            className="pl-3 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-[#d4af37] appearance-none bg-white"
          >
            <option value="all">All Types</option>
            {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {([
          { label: "Total Docs",    value: docs.length },
          { label: "Read",          value: docs.filter((d) => d.is_read).length },
          { label: "Unread",        value: docs.filter((d) => !d.is_read).length },
          { label: "Investors",     value: new Set(docs.map((d) => d.assigned_to)).size },
        ] as { label: string; value: number }[]).map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{stat.label}</p>
            <p className="text-2xl font-extrabold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <Loader2 className="size-8 text-[#d4af37] animate-spin" />
            <p className="text-sm text-slate-400">Loading documents…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-center">
            <FileText className="size-10 text-slate-200" />
            <p className="text-sm font-semibold text-slate-500">
              {docs.length === 0 ? "No documents uploaded yet." : "No documents match your search."}
            </p>
            {docs.length === 0 && (
              <button onClick={() => setShowUpload(true)} className="text-xs text-[#d4af37] underline">Upload the first document</button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="px-6 py-4 font-semibold">Document</th>
                    <th className="px-6 py-4 font-semibold">Type</th>
                    <th className="px-6 py-4 font-semibold">Assigned To</th>
                    <th className="px-6 py-4 font-semibold">Uploaded</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13,9V3.5L18.5,9H13Z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{doc.title}</p>
                            {doc.description && <p className="text-xs text-slate-400 truncate max-w-[200px]">{doc.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase ${TYPE_BADGE[doc.doc_type]}`}>
                          {doc.doc_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {doc.assignee ? (
                          <div>
                            <p className="text-sm font-medium text-slate-800">{doc.assignee.full_name}</p>
                            <p className="text-xs text-slate-400">{doc.assignee.email}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Unknown</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{fmtDate(doc.created_at)}</td>
                      <td className="px-6 py-4">
                        {doc.is_read ? (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="size-3.5 text-emerald-500" />
                            <span className="text-xs font-semibold text-emerald-600">Read</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Eye className="size-3.5 text-amber-500" />
                            <span className="text-xs font-semibold text-amber-600">Unread</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setDeleteTarget(doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map((doc) => (
                <div key={doc.id} className="p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13,9V3.5L18.5,9H13Z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">{doc.title}</p>
                      <span className={`shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-lg uppercase ${TYPE_BADGE[doc.doc_type]}`}>{doc.doc_type}</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-1">{doc.assignee?.full_name ?? "Unknown"} · {doc.assignee?.email}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{fmtDate(doc.created_at)}</span>
                        <span className={doc.is_read ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
                          {doc.is_read ? "✓ Read" : "● Unread"}
                        </span>
                      </div>
                      <button
                        onClick={() => setDeleteTarget(doc)}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Storage notice */}
      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-700">
        <FileText className="size-4 shrink-0 mt-0.5 text-blue-500" />
        <span>
          <strong>Storage:</strong> Documents are stored in the private <code className="bg-blue-100 px-1 py-0.5 rounded">legal-documents</code> Supabase bucket.
          Investors receive time-limited signed URLs (1-hour expiry) when they download. Ensure the bucket is created as <strong>private</strong> in the Supabase dashboard before uploading.
        </span>
      </div>
    </div>
  );
}
