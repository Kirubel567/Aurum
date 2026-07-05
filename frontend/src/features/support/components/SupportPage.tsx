"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send, Zap, BarChart3, ShieldCheck,
  Headphones, Trash2, Download, MoreVertical, Paperclip,
  ChevronRight, Sparkles, User, X, Loader2,
} from "lucide-react";
import { ROUTES } from "@/src/lib/constants/routes";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

type Role = "assistant" | "user";

interface Message {
  id: string;
  role: Role;
  body: string;
  created_at: string;
  typing?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true,
    });
  } catch {
    return "";
  }
}

function nowIso() { return new Date().toISOString(); }

let _id = 0;
const uid = () => `tmp-${++_id}`;

const SUGGESTED = [
  "Check my deposit status",
  "View portfolio performance",
  "Withdrawal eligibility",
  "Strategy pool details",
];

const GREETING: Message = {
  id: uid(),
  role: "assistant",
  body: "Greetings! I'm Aurum Core AI, your 24/7 financial assistant. I can help with deposit status, portfolio performance, withdrawals, and more. How can I assist you today?",
  created_at: nowIso(),
};

// ── Typing indicator ───────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-end gap-3 max-w-[80%]">
      <div className="w-8 h-8 rounded-xl bg-[#0C1526] flex items-center justify-center shrink-0 mb-1 shadow-md dark:border dark:border-[#e9c349]/20">
        <Sparkles className="size-3.5 text-[#D4AF37] dark:text-[#e9c349]" />
      </div>
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3.5 dark:bg-white/5 dark:border-white/5 dark:shadow-none">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-[#D4AF37] dark:bg-[#e9c349] rounded-full animate-bounce [animation-delay:-0.32s]" />
          <span className="w-2 h-2 bg-[#D4AF37] dark:bg-[#e9c349] rounded-full animate-bounce [animation-delay:-0.16s]" />
          <span className="w-2 h-2 bg-[#D4AF37] dark:bg-[#e9c349] rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}

// ── Chat bubble ────────────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: Message }) {
  if (msg.typing) return <TypingDots />;

  if (msg.role === "assistant") {
    return (
      <div className="flex items-end gap-3 max-w-[82%]">
        <div className="w-8 h-8 rounded-xl bg-[#0C1526] flex items-center justify-center shrink-0 mb-1 shadow-md dark:border dark:border-[#e9c349]/20">
          <Sparkles className="size-3.5 text-[#D4AF37] dark:text-[#e9c349]" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 dark:bg-white/5 dark:border-white/5 dark:shadow-none">
            <p className="text-[13px] text-slate-800 leading-relaxed dark:text-white/90 whitespace-pre-wrap">
              {msg.body}
            </p>
          </div>
          <span className="text-[10px] text-slate-400 ml-1 dark:text-white/30">
            {formatTime(msg.created_at)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-3 max-w-[82%] ml-auto flex-row-reverse">
      <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center shrink-0 mb-1 dark:bg-white/10">
        <User className="size-3.5 text-slate-500 dark:text-white/60" />
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="bg-[#0C1526] rounded-2xl rounded-tr-sm px-4 py-3 shadow-md shadow-slate-900/10">
          <p className="text-[13px] text-white/90 leading-relaxed whitespace-pre-wrap">{msg.body}</p>
        </div>
        <span className="text-[10px] text-slate-400 mr-1 dark:text-white/30">
          {formatTime(msg.created_at)}
        </span>
      </div>
    </div>
  );
}

// ── Quick action card ──────────────────────────────────────────────────────────

function QuickCard({
  icon, label, desc, onClick, dark = false,
}: {
  icon: React.ReactNode; label: string; desc: string; onClick: () => void; dark?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-4 rounded-2xl border transition-all group flex items-center gap-4",
        dark
          ? "bg-[#0C1526] border-[#0C1526] hover:bg-[#111d35] shadow-lg dark:bg-[#1c2a45] dark:border-white/10 dark:hover:bg-[#243450]"
          : "bg-white border-slate-100 shadow-sm hover:border-[#D4AF37]/30 hover:shadow-md hover:bg-[#D4AF37]/3 dark:bg-white/5 dark:border-white/5 dark:shadow-none dark:hover:bg-white/[0.07]"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
        dark
          ? "bg-[#D4AF37]/15 dark:bg-[#e9c349]/15"
          : "bg-slate-100 group-hover:bg-[#D4AF37]/10 dark:bg-white/10 dark:group-hover:bg-[#e9c349]/10"
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-[13px] font-bold leading-tight", dark ? "text-white" : "text-slate-800 dark:text-white")}>
          {label}
        </p>
        <p className={cn("text-[11px] mt-0.5 leading-tight", dark ? "text-slate-400" : "text-slate-400 dark:text-white/40")}>
          {desc}
        </p>
      </div>
      <ChevronRight className={cn(
        "size-4 shrink-0 transition-transform group-hover:translate-x-0.5",
        dark
          ? "text-[#D4AF37] dark:text-[#e9c349]"
          : "text-slate-300 group-hover:text-slate-500 dark:text-white/20 dark:group-hover:text-white/40"
      )} />
    </button>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function SupportPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSuggested, setShowSuggested] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load existing session + history on mount
  const loadSession = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const sessionRes = await fetch("/api/support/session", { method: "POST" });
      const sessionJson = await sessionRes.json() as { sessionId?: string; error?: string };
      if (!sessionRes.ok || !sessionJson.sessionId) {
        setLoadingHistory(false);
        return;
      }
      const sid = sessionJson.sessionId;
      setSessionId(sid);

      const histRes = await fetch(`/api/support/session/${sid}/messages`);
      const histJson = await histRes.json() as { messages?: Message[] };
      const hist = histJson.messages ?? [];

      if (hist.length > 0) {
        setMessages([GREETING, ...hist]);
        setShowSuggested(false);
      }
    } catch {
      // Non-fatal — just start fresh
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => { loadSession(); }, [loadSession]);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setInput("");
    setShowSuggested(false);

    const userMsg: Message = {
      id: uid(),
      role: "user",
      body: attachedFile ? `${content}\n[Attached: ${attachedFile}]` : content,
      created_at: nowIso(),
    };
    const typingMsg: Message = { id: uid(), role: "assistant", body: "", created_at: nowIso(), typing: true };

    setMessages((prev) => [...prev, userMsg, typingMsg]);
    setBusy(true);
    setAttachedFile(null);

    try {
      const res = await fetch("/api/support/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: userMsg.body }),
      });
      const json = await res.json() as {
        sessionId?: string;
        reply?: Message;
        error?: string;
      };

      if (!res.ok) {
        const errorBody = json.error ?? "Something went wrong. Please try again.";
        setMessages((prev) => [
          ...prev.filter((m) => !m.typing),
          { id: uid(), role: "assistant", body: errorBody, created_at: nowIso() },
        ]);
        return;
      }

      if (json.sessionId && !sessionId) setSessionId(json.sessionId);

      setMessages((prev) => [
        ...prev.filter((m) => !m.typing),
        json.reply ?? { id: uid(), role: "assistant", body: "I couldn't generate a response. Please try again.", created_at: nowIso() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => !m.typing),
        {
          id: uid(),
          role: "assistant",
          body: "Connection error. Please check your connection and try again.",
          created_at: nowIso(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const clearHistory = async () => {
    setMenuOpen(false);
    // Start a new session — the old session stays in DB for audit
    try {
      const res = await fetch("/api/support/session", { method: "POST" });
      const json = await res.json() as { sessionId?: string };
      if (json.sessionId) setSessionId(json.sessionId);
    } catch { /* non-fatal */ }

    setMessages([{ ...GREETING, id: uid(), created_at: nowIso() }]);
    setShowSuggested(true);
    setAttachedFile(null);
    showToast("Chat history cleared");
  };

  const exportChat = () => {
    const lines = messages
      .filter((m) => !m.typing)
      .map((m) => `[${formatTime(m.created_at)}] ${m.role === "assistant" ? "Aurum Core AI" : "You"}: ${m.body}`)
      .join("\n\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aurum-support-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
    showToast("Chat exported");
  };

  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedFile(file.name);
    e.target.value = "";
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 relative">
      <div className="max-w-7xl mx-auto">

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#0C1526] text-white text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-xl animate-in slide-in-from-bottom-3 duration-200">
            <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full" />
            {toast}
          </div>
        )}

        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-lg bg-[#0C1526] flex items-center justify-center">
              <Sparkles className="size-3.5 text-[#D4AF37]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">AI Support</h2>
            <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full dark:bg-emerald-500/10 dark:border-emerald-500/20">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">24 / 7</span>
            </span>
          </div>
          <p className="text-slate-500 text-sm dark:text-white/40">
            Instant answers on deposits, performance, and portfolio strategy.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-5">

          {/* ── Chat panel (9 cols) ── */}
          <div className="col-span-12 lg:col-span-9 flex flex-col">
            <div
              className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden dark:bg-[rgba(255,255,255,0.03)] dark:[backdrop-filter:blur(12px)] dark:border-[rgba(255,255,255,0.05)] dark:shadow-none"
              style={{ height: "clamp(500px, 70vh, 700px)" }}
            >
              {/* Chat header */}
              <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 bg-[#0C1526] shrink-0 dark:border-white/5 dark:bg-white/[0.02]">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/20 flex items-center justify-center shrink-0 dark:bg-[#e9c349]/15 dark:border-[#e9c349]/20">
                  <Sparkles className="size-4 text-[#D4AF37] dark:text-[#e9c349]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white leading-none">Aurum Core AI</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[10px] font-semibold text-emerald-400">Powered by Gemini · Always active</span>
                  </div>
                </div>
                {/* Menu */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen((o) => !o)}
                    className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
                  >
                    <MoreVertical className="size-4 text-slate-400" />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-10 bg-white border border-slate-100 rounded-xl shadow-xl z-20 w-40 py-1.5 text-sm overflow-hidden dark:bg-[#1f2937] dark:border-white/10 dark:shadow-2xl">
                      <button
                        onClick={clearHistory}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2.5 transition-colors dark:hover:bg-white/5 dark:text-white/80"
                      >
                        <Trash2 className="size-3.5 text-slate-400 dark:text-white/40" />
                        Clear chat
                      </button>
                      <button
                        onClick={exportChat}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2.5 transition-colors dark:hover:bg-white/5 dark:text-white/80"
                      >
                        <Download className="size-3.5 text-slate-400 dark:text-white/40" />
                        Export chat
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-5 py-5 space-y-4 bg-slate-50/40 [scrollbar-width:thin] [scrollbar-color:#e2e8f0_transparent] dark:bg-black/10"
              >
                {loadingHistory ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="size-6 animate-spin text-slate-300 dark:text-white/20" />
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => <ChatBubble key={msg.id} msg={msg} />)}

                    {/* Suggested prompts — shown until first user message */}
                    {showSuggested && !busy && (
                      <div className="pl-11 flex flex-wrap gap-2 pt-1">
                        {SUGGESTED.map((s) => (
                          <button
                            key={s}
                            onClick={() => sendMessage(s)}
                            className="text-[12px] font-medium text-slate-600 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full hover:border-[#D4AF37]/50 hover:text-[#9a7c3f] hover:bg-[#D4AF37]/5 transition-all dark:bg-white/5 dark:border-white/10 dark:text-white/70 dark:hover:border-[#e9c349]/50 dark:hover:text-[#e9c349] dark:hover:bg-[#e9c349]/10"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Input */}
              <div className="shrink-0 px-4 py-3.5 bg-white border-t border-slate-100 dark:bg-white/[0.02] dark:border-white/5">
                {/* Attached file pill */}
                {attachedFile && (
                  <div className="flex items-center gap-2 mb-2 bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-3 py-1.5 rounded-lg w-fit max-w-full dark:bg-[#e9c349]/10 dark:border-[#e9c349]/20">
                    <Paperclip className="size-3 text-[#9a7c3f] shrink-0 dark:text-[#e9c349]" />
                    <span className="text-[11px] font-medium text-[#9a7c3f] truncate max-w-[200px] dark:text-[#e9c349]">
                      {attachedFile}
                    </span>
                    <button onClick={() => setAttachedFile(null)} className="ml-1 shrink-0">
                      <X className="size-3 text-[#9a7c3f] hover:text-[#6b5520] transition-colors dark:text-[#e9c349] dark:hover:text-white" />
                    </button>
                  </div>
                )}
                <div className={cn(
                  "flex items-center gap-3 bg-slate-50 border rounded-xl px-4 py-2.5 transition-all",
                  "focus-within:border-[#D4AF37]/50 focus-within:ring-2 focus-within:ring-[#D4AF37]/10 border-slate-200",
                  "dark:bg-[#050b14] dark:border-white/10 dark:focus-within:border-[#e9c349]/50 dark:focus-within:ring-[#e9c349]/10"
                )}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleAttach}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach file"
                    className="shrink-0 hover:text-[#D4AF37] transition-colors dark:text-white/40 dark:hover:text-[#e9c349]"
                  >
                    <Paperclip className="size-4 text-slate-400" />
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) sendMessage(); }}
                    disabled={busy || loadingHistory}
                    placeholder="Ask about your portfolio, deposits, or strategy…"
                    className="flex-1 bg-transparent text-[13px] text-slate-800 placeholder:text-slate-400 outline-none disabled:opacity-50 dark:text-white dark:placeholder:text-white/30"
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={busy || !input.trim() || loadingHistory}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0",
                      input.trim() && !busy && !loadingHistory
                        ? "bg-[#D4AF37] text-[#0C1526] hover:bg-[#c9a030] active:scale-95 dark:bg-[#e9c349] dark:hover:bg-[#f0d275]"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-white/10 dark:text-white/30"
                    )}
                  >
                    {busy
                      ? <Loader2 className="size-3.5 animate-spin" />
                      : <Send className="size-3.5" />}
                    {busy ? "…" : "Send"}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 text-center mt-1.5 dark:text-white/30">
                  AI responses are informational only · Not financial advice
                </p>
              </div>
            </div>
          </div>

          {/* ── Sidebar (3 cols) ── */}
          <div className="col-span-12 lg:col-span-3 space-y-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-0.5 dark:text-white/40">
              Quick Actions
            </p>

            <QuickCard
              icon={<ShieldCheck className="size-4 text-slate-500 group-hover:text-[#D4AF37] transition-colors" />}
              label="Deposit Verification"
              desc="Check status of CBE or wire transfers"
              onClick={() => sendMessage("What is the processing status of my deposit?")}
            />
            <QuickCard
              icon={<BarChart3 className="size-4 text-slate-500 group-hover:text-[#D4AF37] transition-colors" />}
              label="Yield Report"
              desc="Month-to-date earnings breakdown"
              onClick={() => sendMessage("Generate my active yield report for this month.")}
            />
            <QuickCard
              icon={<Zap className="size-4 text-slate-500 group-hover:text-[#D4AF37] transition-colors" />}
              label="Strategy Info"
              desc="Apex Gold, Silver Shield & more"
              onClick={() => sendMessage("Tell me about the available strategy pools.")}
            />
            <QuickCard
              icon={<Headphones className="size-4 text-[#D4AF37]" />}
              label="Live Account Manager"
              desc="Talk to your account manager directly"
              onClick={() => router.push(ROUTES.CONCIERGE)}
              dark
            />

            {/* Status widget */}
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl px-4 py-4 mt-1 dark:bg-white/5 dark:border-white/5 dark:shadow-none">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 dark:text-white/40">
                Support Status
              </p>
              <div className="space-y-2.5">
                {[
                  { label: "AI Response", value: "Instant", ok: true },
                  { label: "Powered by", value: "Gemini", ok: null },
                  { label: "Avg. manager reply", value: "~1 hour", ok: null },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-500 dark:text-white/40">{item.label}</span>
                    <div className="flex items-center gap-1.5">
                      {item.ok !== null && (
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          item.ok ? "bg-emerald-500 animate-pulse" : "bg-slate-300 dark:bg-white/20"
                        )} />
                      )}
                      <span className={cn(
                        "text-[12px] font-semibold",
                        item.ok ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-white/60"
                      )}>
                        {item.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
