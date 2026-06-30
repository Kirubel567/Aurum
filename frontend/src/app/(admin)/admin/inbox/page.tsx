"use client";

// Stitch dark tokens:
// glass-card: rgba(255,255,255,0.03) + blur(12px) + border rgba(255,255,255,0.1)
// chat-bubble-manager dark: rgba(242,202,80,0.1) bg / rgba(242,202,80,0.2) border
// chat-bubble-client dark: rgba(255,255,255,0.05) bg+border
// bg: #050b14  surface: #0d141d  primary: #f2ca50  on-primary: #3c2f00
// on-surface: #dce3f0  on-surface-variant: #d0c5af  outline-variant: #4d4635

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, ArrowLeft, Phone, Video, MoreVertical,
         ChevronRight, CheckCircle, Terminal, ShieldCheck,
         Paperclip, Smile, Wallet, TrendingUp, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type MobilePanel = "inbox" | "chat";

interface Message {
  id: string;
  sender_role: "investor" | "admin";
  body: string;
  created_at: string;
  investor_id: string;
  investor_name: string;
}
interface Thread {
  investor_id: string;
  investor_name: string;
  last_message: string;
  last_at: string;
  unread: number;
}

// ── helpers ──────────────────────────────────────────────────────────────────
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}
function fmtDate(iso: string) {
  const d = new Date(iso), today = new Date(), yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function groupByDate(messages: Message[]) {
  const groups: { label: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const label = fmtDate(msg.created_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.messages.push(msg);
    else groups.push({ label, messages: [msg] });
  }
  return groups;
}
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

// ── date divider ─────────────────────────────────────────────────────────────
function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-slate-100 dark:bg-white/5" />
      <span className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest px-2
                       bg-slate-50 dark:bg-transparent rounded-full py-0.5">{label}</span>
      <div className="flex-1 h-px bg-slate-100 dark:bg-white/5" />
    </div>
  );
}

// ── message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg }: { msg: Message }) {
  const isAdmin = msg.sender_role === "admin";
  if (!isAdmin) {
    return (
      <div className="flex items-end gap-2.5 max-w-[80%]">
        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center shrink-0 mb-1">
          <span className="text-[9px] font-bold text-slate-600 dark:text-[#d0c5af]">{initials(msg.investor_name)}</span>
        </div>
        <div className="flex flex-col gap-1">
          {/* light: white bg / dark: rgba(255,255,255,0.05) */}
          <div className="bg-white dark:bg-[rgba(255,255,255,0.05)] border border-slate-100
                          dark:border-[rgba(255,255,255,0.05)] shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
            <p className="text-[13px] text-slate-700 dark:text-[#d0c5af] leading-relaxed">{msg.body}</p>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-white/30 ml-1">{fmtTime(msg.created_at)}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2 max-w-[80%] ml-auto flex-row-reverse">
      <div className="w-8 h-8 rounded-full bg-[#d4af37] dark:bg-[#f2ca50] flex items-center justify-center shrink-0 mb-1">
        <span className="text-[9px] font-bold text-white dark:text-[#3c2f00]">A</span>
      </div>
      <div className="flex flex-col items-end gap-1">
        {/* light: #0d141d / dark: rgba(242,202,80,0.1) + gold border */}
        <div className="bg-[#0d141d] dark:bg-[rgba(242,202,80,0.1)] border border-transparent
                        dark:border-[rgba(242,202,80,0.2)] rounded-2xl rounded-tr-sm px-4 py-3 shadow-md">
          <p className="text-[13px] text-white dark:text-[#dce3f0] leading-relaxed">{msg.body}</p>
        </div>
        <div className="flex items-center gap-1 mr-1">
          <span className="text-[10px] text-slate-400 dark:text-white/30">{fmtTime(msg.created_at)}</span>
          <span className="material-symbols-outlined text-[13px] text-[#d4af37] dark:text-[#f2ca50]" style={{ fontVariationSettings: "'FILL' 1" }}>done_all</span>
        </div>
      </div>
    </div>
  );
}

// ── glass helper ──────────────────────────────────────────────────────────────
const gc = "bg-white dark:bg-[rgba(255,255,255,0.03)] dark:[backdrop-filter:blur(12px)] border border-slate-200 dark:border-[rgba(255,255,255,0.1)]";

// ── mock seed data (shown immediately, real API data overlays when available) ──
const MOCK_THREADS: Thread[] = [
  { investor_id: "mock-bekele",  investor_name: "Bekele",         last_message: "Thanks Abebe, saw the EUR/USD trade win update!", last_at: new Date().toISOString(),                             unread: 1 },
  { investor_id: "mock-chala",   investor_name: "Chala",          last_message: "Can you review my account drawdown limit?",        last_at: new Date(Date.now()-3300000).toISOString(),            unread: 0 },
  { investor_id: "mock-invesco", investor_name: "Invesco Cap Fund",last_message: "KYC verification documents attached.",            last_at: new Date(Date.now()-86400000).toISOString(),           unread: 2 },
  { investor_id: "mock-sahle",   investor_name: "Sahle-Work Z.",  last_message: "Withdrawal request status update needed.",         last_at: new Date(Date.now()-86400000*6).toISOString(),         unread: 0 },
];

const now = new Date();
const t = (minusMin: number) => new Date(now.getTime() - minusMin * 60000).toISOString();

const MOCK_MESSAGES: Record<string, Message[]> = {
  "mock-bekele": [
    { id: "m1", sender_role: "investor", body: "Hello Abebe, I noticed the live MT5 trade entries are syncing on my user dashboard. Quick question about the leverage used for the EUR/USD position?", created_at: t(3), investor_id: "mock-bekele", investor_name: "Bekele" },
    { id: "m2", sender_role: "admin",    body: "Hi Bekele! Yes, we safely executed that entry at 1:100 leverage to maximize the tight spread entry. It's performing perfectly within our risk management parameters.", created_at: t(1), investor_id: "mock-bekele", investor_name: "Bekele" },
    { id: "m3", sender_role: "investor", body: "Thanks Abebe, saw the EUR/USD trade win update!", created_at: t(0), investor_id: "mock-bekele", investor_name: "Bekele" },
  ],
  "mock-chala": [
    { id: "c1", sender_role: "investor", body: "Can you review my account drawdown limit? I want to increase it from 10% to 15% for the next quarter.", created_at: t(90), investor_id: "mock-chala", investor_name: "Chala" },
    { id: "c2", sender_role: "admin",    body: "Hi Chala, I will review the risk parameters with the team and get back to you within 24 hours.", created_at: t(75), investor_id: "mock-chala", investor_name: "Chala" },
  ],
  "mock-invesco": [
    { id: "i1", sender_role: "investor", body: "KYC verification documents attached. Please review at your earliest convenience.", created_at: t(60*24), investor_id: "mock-invesco", investor_name: "Invesco Cap Fund" },
  ],
  "mock-sahle": [
    { id: "s1", sender_role: "investor", body: "Withdrawal request status update needed. Submitted 6 days ago, reference #WD-20241024.", created_at: t(60*24*6), investor_id: "mock-sahle", investor_name: "Sahle-Work Z." },
  ],
};

// ── page ──────────────────────────────────────────────────────────────────────
export default function AdminInboxPage() {
  const [threads, setThreads]           = useState<Thread[]>(MOCK_THREADS);
  const [activeId, setActiveId]         = useState<string | null>("mock-bekele");
  const [messages, setMessages]         = useState<Message[]>(MOCK_MESSAGES["mock-bekele"]);
  const [input, setInput]               = useState("");
  const [sending, setSending]           = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingMsgs, setLoadingMsgs]   = useState(false);
  const [mobilePanel, setMobilePanel]   = useState<MobilePanel>("inbox");
  const [assignedOnly, setAssignedOnly] = useState(true);
  const [rightOpen, setRightOpen]       = useState(true);
  const [resolved, setResolved]         = useState<Set<string>>(new Set());
  const [toastMsg, setToastMsg]         = useState<string | null>(null);
  const [allPositionsOpen, setAllPositionsOpen] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // ── API calls ──
  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      if (!res.ok) return;
      const json = await res.json();
      const real: Thread[] = json.threads ?? [];
      if (real.length > 0) {
        // Merge: real threads first, then mock threads that aren't duplicates
        setThreads([...real, ...MOCK_THREADS.filter((m) => !real.find((r) => r.investor_id === m.investor_id))]);
      }
    } finally { setLoadingThreads(false); }
  }, []);

  const fetchMessages = useCallback(async (id: string, silent = false) => {
    // Mock IDs — serve from local data, no API call needed
    if (id.startsWith("mock-")) {
      setMessages(MOCK_MESSAGES[id] ?? []);
      return;
    }
    if (!silent) setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/messages?investor_id=${id}`);
      if (!res.ok) return;
      const json = await res.json();
      setMessages(json.messages ?? []);
    } finally { setLoadingMsgs(false); }
  }, []);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  useEffect(() => {
    if (!activeId) return;
    fetchMessages(activeId);
    pollRef.current = setInterval(() => { fetchMessages(activeId, true); fetchThreads(); }, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeId, fetchMessages, fetchThreads]);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [messages]);

  const selectThread = (id: string) => {
    setActiveId(id);
    setMobilePanel("chat");
    setThreads((prev) => prev.map((t) => t.investor_id === id ? { ...t, unread: 0 } : t));
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !activeId) return;
    setInput(""); setSending(true);
    try {
      if (activeId.startsWith("mock-")) {
        // Append locally for mock threads
        const newMsg: Message = {
          id: `local-${Date.now()}`, sender_role: "admin", body: text,
          created_at: new Date().toISOString(), investor_id: activeId,
          investor_name: threads.find((t) => t.investor_id === activeId)?.investor_name ?? "",
        };
        setMessages((prev) => [...prev, newMsg]);
        setThreads((prev) => prev.map((t) => t.investor_id === activeId ? { ...t, last_message: text, last_at: new Date().toISOString() } : t));
      } else {
        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: text, investor_id: activeId }),
        });
        await fetchMessages(activeId, true);
      }
    } finally { setSending(false); }
  };

  const toast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const markResolved = () => {
    if (!activeId) return;
    setResolved((prev) => new Set([...prev, activeId]));
    toast("Ticket marked as resolved.");
  };

  const activeThread = threads.find((t) => t.investor_id === activeId);
  const isResolved   = activeId ? resolved.has(activeId) : false;
  const visibleThreads = threads; // assignedOnly filter — all threads from API are already "assigned"
  const totalUnread = threads.reduce((a, t) => a + t.unread, 0);
  const groups = groupByDate(messages);

  return (
    <div className="flex flex-col h-full bg-[#F8F9FA] dark:bg-[#050b14] text-slate-900 dark:text-[#dce3f0] overflow-hidden relative">

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] bg-[#0d141d] dark:bg-[rgba(242,202,80,0.15)] dark:border dark:border-[rgba(242,202,80,0.3)] text-white dark:text-[#f2ca50] text-sm font-bold px-5 py-2.5 rounded-xl shadow-2xl">
          {toastMsg}
        </div>
      )}

      {/* Page header */}
      <div className="shrink-0 px-5 sm:px-6 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline-md text-headline-md font-bold text-slate-900 dark:text-white">
              Client Communications &amp; Ticket Router
            </h2>
            <p className="text-body-sm text-slate-500 dark:text-[#d0c5af] mt-0.5 hidden sm:block max-w-2xl">
              Live multi-tenant investor messaging queue. Securely route tickets, handle direct client inquiries, and manage active support chats.
            </p>
          </div>
          {totalUnread > 0 && (
            <div className="flex items-center gap-2 bg-[#d4af37]/10 dark:bg-[#f2ca50]/10 border border-[#d4af37]/20 dark:border-[#f2ca50]/20 px-3 py-1.5 rounded-xl">
              <span className="w-2 h-2 bg-[#d4af37] dark:bg-[#f2ca50] rounded-full animate-pulse" />
              <span className="text-xs font-bold text-[#9a7c3f] dark:text-[#f2ca50]">{totalUnread} unread</span>
            </div>
          )}
        </div>

        {/* Mobile tab */}
        <div className="flex gap-1 mt-3 bg-slate-200 dark:bg-white/5 p-0.5 rounded-lg sm:hidden">
          {(["inbox", "chat"] as MobilePanel[]).map((tab) => (
            <button key={tab} onClick={() => setMobilePanel(tab)}
              className={cn("flex-1 py-1.5 rounded-md text-xs font-bold capitalize transition-all",
                mobilePanel === tab ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-[#d0c5af]")}>
              {tab === "inbox" ? "Inbox" : "Chat"}
            </button>
          ))}
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 min-h-0 flex gap-3 px-5 sm:px-6 pb-5 overflow-hidden">

        {/* ── Panel 1: Thread List ──────────────────────────────────────── */}
        <aside className={cn(
          "min-h-0 rounded-xl flex flex-col overflow-hidden shadow-sm",
          gc,
          mobilePanel === "inbox" ? "flex" : "hidden",
          "w-full sm:flex sm:w-64 shrink-0"
        )}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-[#d0c5af] uppercase tracking-wider">
              Inbox ({visibleThreads.length})
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 dark:text-[#d0c5af] uppercase tracking-tight font-semibold hidden md:block">Assigned</span>
              <button onClick={() => setAssignedOnly((v) => !v)}
                className={cn("w-8 h-4 rounded-full relative transition-colors",
                  assignedOnly ? "bg-[#d4af37]/30 dark:bg-[#f2ca50]/20" : "bg-slate-200 dark:bg-white/10")}>
                <div className={cn("absolute top-0.5 w-3 h-3 rounded-full shadow-sm transition-all",
                  assignedOnly ? "left-4 bg-[#d4af37] dark:bg-[#f2ca50]" : "left-0.5 bg-slate-400 dark:bg-white/30")} />
              </button>
            </div>
          </div>

          {/* Thread items */}
          <div className="flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(212,175,55,0.2)_transparent]">
            {loadingThreads ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="size-5 text-slate-300 dark:text-white/20 animate-spin" />
              </div>
            ) : visibleThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-4">
                <MessageSquare className="size-6 text-slate-300 dark:text-white/20" />
                <p className="text-xs text-slate-400 dark:text-[#d0c5af]">No messages yet</p>
              </div>
            ) : (
              visibleThreads.map((t) => {
                const isActive = activeId === t.investor_id;
                const isRes = resolved.has(t.investor_id);
                return (
                  <button key={t.investor_id} onClick={() => selectThread(t.investor_id)}
                    className={cn("w-full px-4 py-3.5 text-left transition-all border-b last:border-0",
                      "border-slate-50 dark:border-white/5",
                      isActive
                        ? "bg-[#d4af37]/8 dark:bg-[rgba(255,255,255,0.05)] border-l-2 border-l-[#d4af37] dark:border-l-[#f2ca50]"
                        : "hover:bg-slate-50 dark:hover:bg-white/5")}>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                        isActive ? "bg-[#d4af37] dark:bg-[#f2ca50] text-white dark:text-[#3c2f00]"
                                 : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-[#d0c5af]")}>
                        {initials(t.investor_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("text-[13px] truncate", isActive ? "font-bold text-slate-900 dark:text-white" : "font-semibold text-slate-700 dark:text-[#dce3f0]")}>
                            {t.investor_name || "Investor"}
                            {isRes && <span className="ml-1 text-[10px] text-emerald-500 font-normal">(Resolved)</span>}
                          </p>
                          <span className="text-[10px] text-slate-400 dark:text-white/30 shrink-0">{fmtTime(t.last_at)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className="text-[11px] text-slate-400 dark:text-[#d0c5af]/60 truncate">{t.last_message}</p>
                          {t.unread > 0 && (
                            <span className="w-4 h-4 rounded-full bg-[#d4af37] dark:bg-[#f2ca50] text-white dark:text-[#3c2f00] text-[9px] font-bold flex items-center justify-center shrink-0">
                              {t.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Panel 2: Active Chat ──────────────────────────────────────── */}
        <div className={cn(
          "min-h-0 flex-1 flex flex-col rounded-xl overflow-hidden shadow-sm",
          gc,
          mobilePanel === "chat" ? "flex" : "hidden",
          "sm:flex"
        )}>
          {!activeId ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                <MessageSquare className="size-6 text-slate-300 dark:text-white/20" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600 dark:text-[#d0c5af]">Select a conversation</p>
                <p className="text-xs text-slate-400 dark:text-[#d0c5af]/60 mt-1">Choose an investor from the list to start messaging</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-white/5 shrink-0">
                <button onClick={() => setMobilePanel("inbox")}
                  className="sm:hidden text-slate-400 dark:text-[#d0c5af] hover:text-slate-900 dark:hover:text-white transition-colors mr-1">
                  <ArrowLeft className="size-4" />
                </button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-[#d0c5af]">
                    {initials(activeThread?.investor_name ?? "")}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-[#0d141d] rounded-full" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-body-lg font-bold text-slate-900 dark:text-white leading-none">{activeThread?.investor_name || "Investor"}</p>
                    <span className="bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-[#d0c5af] text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Live Online
                    </span>
                    {isResolved && <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Resolved</span>}
                  </div>
                  <p className="text-body-sm text-slate-400 dark:text-[#d0c5af]/60 mt-0.5">Investor</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toast("Voice call feature coming soon.")}
                    className="p-2 text-slate-400 dark:text-[#d0c5af] hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all">
                    <Phone className="size-4" />
                  </button>
                  <button onClick={() => toast("Video call feature coming soon.")}
                    className="p-2 text-slate-400 dark:text-[#d0c5af] hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all">
                    <Video className="size-4" />
                  </button>
                  <button onClick={() => toast("More options coming soon.")}
                    className="p-2 text-slate-400 dark:text-[#d0c5af] hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all">
                    <MoreVertical className="size-4" />
                  </button>
                  {/* Toggle right panel */}
                  <button onClick={() => setRightOpen((v) => !v)} title={rightOpen ? "Collapse overview" : "Expand overview"}
                    className="hidden lg:flex p-2 text-slate-400 dark:text-[#d0c5af] hover:text-[#d4af37] dark:hover:text-[#f2ca50] hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all items-center gap-1 text-[11px] font-bold">
                    {rightOpen ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div ref={chatScrollRef}
                className="flex-1 overflow-y-auto px-5 py-4 space-y-2 bg-slate-50/40 dark:bg-black/10 [scrollbar-width:thin] [scrollbar-color:rgba(212,175,55,0.2)_transparent]">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="size-5 text-slate-300 dark:text-white/20 animate-spin" />
                  </div>
                ) : groups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                    <p className="text-sm text-slate-400 dark:text-[#d0c5af]/60">No messages yet. Send the first one.</p>
                  </div>
                ) : (
                  groups.map((group) => (
                    <div key={group.label}>
                      <DateDivider label={group.label} />
                      <div className="space-y-3">
                        {group.messages.map((msg) => <Bubble key={msg.id} msg={msg} />)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input bar */}
              <div className="shrink-0 px-4 py-3 bg-white dark:bg-white/5 border-t border-slate-100 dark:border-white/5">
                <div className={cn(
                  "flex items-center gap-3 bg-slate-50 dark:bg-white/5 border rounded-xl px-4 py-2.5 transition-all",
                  "border-slate-200 dark:border-white/10 focus-within:border-[#d4af37]/50 dark:focus-within:border-[#f2ca50]/30",
                  "focus-within:ring-2 focus-within:ring-[#d4af37]/10 dark:focus-within:ring-[#f2ca50]/10"
                )}>
                  <button onClick={() => toast("File attachment coming soon.")}
                    className="text-slate-400 dark:text-[#d0c5af] hover:text-[#d4af37] dark:hover:text-[#f2ca50] transition-colors">
                    <Paperclip className="size-4" />
                  </button>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={`Type your message to ${activeThread?.investor_name || "investor"}…`}
                    className="flex-1 bg-transparent text-[13px] text-slate-800 dark:text-[#dce3f0] placeholder:text-slate-400 dark:placeholder:text-white/30 outline-none"
                  />
                  <button onClick={() => toast("Emoji picker coming soon.")}
                    className="text-slate-400 dark:text-[#d0c5af] hover:text-[#d4af37] dark:hover:text-[#f2ca50] transition-colors">
                    <Smile className="size-4" />
                  </button>
                  <button onClick={handleSend} disabled={!input.trim() || sending}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                      input.trim()
                        ? "bg-[#d4af37] dark:bg-[#f2ca50] text-white dark:text-[#3c2f00] hover:opacity-90 active:scale-95 shadow-sm dark:shadow-[#f2ca50]/20"
                        : "bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-white/30 cursor-not-allowed"
                    )}>
                    {sending ? <Loader2 className="size-3.5 animate-spin" /> : (
                      <span className="material-symbols-outlined text-[14px]">send</span>
                    )}
                    Send
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Panel 3: Contextual Investor Overview ─────────────────────── */}
        {/* Collapse: hidden when rightOpen=false on large screens */}
        <aside className={cn(
          "hidden lg:flex flex-col gap-3 overflow-y-auto shrink-0 transition-all duration-300",
          "[scrollbar-width:thin] [scrollbar-color:rgba(212,175,55,0.2)_transparent]",
          rightOpen ? "w-64 opacity-100" : "w-0 opacity-0 pointer-events-none overflow-hidden"
        )}>
          {activeId ? (
            <>
              {/* Wallet Summary */}
              <div className={cn("rounded-xl p-5 shadow-sm", gc)}>
                <h4 className="text-[11px] font-bold text-slate-400 dark:text-[#d0c5af] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Wallet className="size-4" /> Investor Wallet Summary
                </h4>
                <div className="space-y-4">
                  <div>
                    <p className="text-body-sm text-slate-500 dark:text-[#d0c5af]">Total Capital</p>
                    <p className="text-headline-md font-bold text-slate-900 dark:text-white font-data-mono">$450,000.00</p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                    <p className="text-body-sm text-slate-500 dark:text-[#d0c5af] mb-2">Managed Allocation Pool</p>
                    <div className="flex items-center gap-2">
                      <span className="bg-[#d4af37]/10 dark:bg-[#f2ca50]/10 text-[#d4af37] dark:text-[#f2ca50] px-2 py-1 rounded text-[10px] font-bold border border-[#d4af37]/20 dark:border-[#f2ca50]/20">Forex Alpha</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-body-sm">+12.4% YTD</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Open Positions */}
              <div className={cn("rounded-xl p-5 shadow-sm", gc)}>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[11px] font-bold text-slate-400 dark:text-[#d0c5af] uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="size-4" /> Open Positions
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded font-data-mono">LIVE</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/5">
                    <div>
                      <p className="font-bold text-body-sm text-slate-900 dark:text-white">EUR/USD</p>
                      <p className="text-[10px] text-slate-400 dark:text-[#d0c5af]">Buy @ 1.0845</p>
                    </div>
                    <div className="text-right">
                      <p className="font-data-mono font-bold text-emerald-600 dark:text-emerald-400">+$2,450.00</p>
                      <p className="text-[10px] text-slate-400 dark:text-[#d0c5af]">Lot: 2.50</p>
                    </div>
                  </div>
                  {allPositionsOpen && (
                    <>
                      {[
                        { pair: "GBP/JPY", type: "Sell @ 186.20", pnl: "+$1,120.00", lot: "1.00" },
                        { pair: "XAU/USD", type: "Buy @ 1928.4",  pnl: "+$3,800.00", lot: "0.50" },
                        { pair: "BTC/USD", type: "Buy @ 42,100",  pnl: "-$290.00",    lot: "0.10" },
                      ].map((p) => (
                        <div key={p.pair} className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/5">
                          <div>
                            <p className="font-bold text-body-sm text-slate-900 dark:text-white">{p.pair}</p>
                            <p className="text-[10px] text-slate-400 dark:text-[#d0c5af]">{p.type}</p>
                          </div>
                          <div className="text-right">
                            <p className={cn("font-data-mono font-bold text-[13px]", p.pnl.startsWith("-") ? "text-red-500 dark:text-[#ffb4ab]" : "text-emerald-600 dark:text-emerald-400")}>{p.pnl}</p>
                            <p className="text-[10px] text-slate-400 dark:text-[#d0c5af]">Lot: {p.lot}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  <div className="p-2 rounded-lg border border-dashed border-slate-200 dark:border-white/10 text-center">
                    <button onClick={() => setAllPositionsOpen((v) => !v)}
                      className="text-[#d4af37] dark:text-[#f2ca50] text-[11px] font-bold hover:underline">
                      {allPositionsOpen ? "Collapse Positions" : "View All Positions (4)"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                <Link href="/admin/console">
                  <div className={cn("w-full flex items-center justify-between p-4 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-all group", gc)}>
                    <div className="flex items-center gap-3">
                      <Terminal className="size-4 text-slate-400 dark:text-[#d0c5af] group-hover:text-[#d4af37] dark:group-hover:text-[#f2ca50] transition-colors" />
                      <span className="text-body-sm font-semibold text-slate-700 dark:text-[#d0c5af]">Open Terminal Logs</span>
                    </div>
                    <ChevronRight className="size-4 text-slate-300 dark:text-white/20" />
                  </div>
                </Link>
                <Link href="/admin/deposits">
                  <div className={cn("w-full flex items-center justify-between p-4 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-all group mt-2", gc)}>
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="size-4 text-slate-400 dark:text-[#d0c5af] group-hover:text-[#d4af37] dark:group-hover:text-[#f2ca50] transition-colors" />
                      <span className="text-body-sm font-semibold text-slate-700 dark:text-[#d0c5af]">Route to Compliance</span>
                    </div>
                    <ChevronRight className="size-4 text-slate-300 dark:text-white/20" />
                  </div>
                </Link>
                <button onClick={markResolved} disabled={isResolved}
                  className={cn(
                    "w-full p-4 rounded-xl font-bold text-body-sm flex items-center justify-center gap-2 transition-all mt-2",
                    isResolved
                      ? "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/30 cursor-not-allowed"
                      : "bg-emerald-500 dark:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 dark:shadow-emerald-900/20 hover:opacity-90 active:scale-95"
                  )}>
                  <CheckCircle className="size-4" />
                  {isResolved ? "Ticket Resolved" : "Mark Ticket as Resolved"}
                </button>
              </div>
            </>
          ) : (
            <div className={cn("rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-center min-h-[200px]", gc)}>
              <MessageSquare className="size-6 text-slate-300 dark:text-white/20" />
              <p className="text-xs text-slate-400 dark:text-[#d0c5af]/60">Select a conversation to see investor details</p>
            </div>
          )}

          {/* Re-open toggle at the bottom when panel is visible */}
          <button onClick={() => setRightOpen(false)}
            className="text-[11px] text-slate-400 dark:text-[#d0c5af]/50 hover:text-slate-600 dark:hover:text-[#d0c5af] flex items-center gap-1 self-end pr-1 transition-colors">
            <ChevronRight className="size-3.5" /> Collapse
          </button>
        </aside>

        {/* Re-open tab when right panel is collapsed */}
        {!rightOpen && (
          <button onClick={() => setRightOpen(true)}
            className="hidden lg:flex items-center justify-center w-7 shrink-0 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-[#d4af37]/40 dark:hover:border-[#f2ca50]/30 text-slate-400 dark:text-[#d0c5af] hover:text-[#d4af37] dark:hover:text-[#f2ca50] transition-all shadow-sm"
            title="Expand investor overview">
            <ChevronLeft className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
