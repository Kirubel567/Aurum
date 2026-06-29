"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Loader2, CheckCheck, Check, MessageSquare, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

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

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
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

// ── Date divider ───────────────────────────────────────────────────────────────

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-slate-100" />
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: Message }) {
  const isAdmin = msg.sender_role === "admin";

  if (!isAdmin) {
    return (
      <div className="flex items-end gap-2.5 max-w-[72%]">
        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mb-1">
          <span className="text-[9px] font-bold text-slate-600">{initials(msg.investor_name)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
            <p className="text-[13px] text-slate-800 leading-relaxed">{msg.body}</p>
          </div>
          <span className="text-[10px] text-slate-400 ml-1">{fmtTime(msg.created_at)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 max-w-[72%] ml-auto flex-row-reverse">
      <div className="w-7 h-7 rounded-full bg-[#0C1526] border border-[#D4AF37]/30 flex items-center justify-center shrink-0 mb-1">
        <span className="text-[9px] font-bold text-[#D4AF37]">D</span>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="bg-[#0C1526] rounded-2xl rounded-tr-sm px-4 py-3 shadow-md">
          <p className="text-[13px] text-white/90 leading-relaxed">{msg.body}</p>
        </div>
        <div className="flex items-center gap-1 mr-0.5">
          <span className="text-[10px] text-slate-400">{fmtTime(msg.created_at)}</span>
          <CheckCheck className="size-3 text-[#D4AF37]" />
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminInboxPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("inbox");
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      if (!res.ok) return;
      const json = await res.json();
      setThreads(json.threads ?? []);
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  const fetchMessages = useCallback(async (id: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await fetch(`/api/messages?investor_id=${id}`);
      if (!res.ok) return;
      const json = await res.json();
      setMessages(json.messages ?? []);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    if (!activeId) return;
    fetchMessages(activeId);
    pollRef.current = setInterval(() => {
      fetchMessages(activeId, true);
      fetchThreads();
    }, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeId, fetchMessages, fetchThreads]);

  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const selectThread = (id: string) => {
    setActiveId(id);
    setMobilePanel("chat");
    // Mark as read locally
    setThreads((prev) => prev.map((t) => t.investor_id === id ? { ...t, unread: 0 } : t));
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !activeId) return;
    setInput("");
    setSending(true);
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, investor_id: activeId }),
      });
      await fetchMessages(activeId, true);
    } finally {
      setSending(false);
    }
  };

  const activeThread = threads.find((t) => t.investor_id === activeId);
  const groups = groupByDate(messages);
  const totalUnread = threads.reduce((acc, t) => acc + t.unread, 0);

  return (
    <div className="flex flex-col h-full bg-[#F8F9FA] text-slate-900 overflow-hidden">

      {/* Page header */}
      <div className="shrink-0 px-5 sm:px-7 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Client Communications</h2>
            <p className="text-sm text-slate-500 mt-0.5 hidden sm:block">Direct messaging with investors</p>
          </div>
          {totalUnread > 0 && (
            <div className="flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-3 py-1.5 rounded-xl">
              <span className="w-2 h-2 bg-[#D4AF37] rounded-full animate-pulse" />
              <span className="text-xs font-bold text-[#9a7c3f]">{totalUnread} unread</span>
            </div>
          )}
        </div>

        {/* Mobile tab */}
        <div className="flex gap-1 mt-3 bg-slate-200 p-0.5 rounded-lg sm:hidden">
          {(["inbox", "chat"] as MobilePanel[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setMobilePanel(tab)}
              className={cn(
                "flex-1 py-1.5 rounded-md text-xs font-bold capitalize transition-all",
                mobilePanel === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              )}
            >
              {tab === "inbox" ? "Inbox" : "Chat"}
            </button>
          ))}
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex-1 min-h-0 flex gap-4 px-5 sm:px-7 pb-5 overflow-hidden">

        {/* Thread list */}
        <aside className={cn(
          "min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden",
          mobilePanel === "inbox" ? "flex" : "hidden",
          "w-full sm:flex sm:w-72 shrink-0"
        )}>
          <div className="px-4 py-3.5 border-b border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Conversations ({threads.length})
            </p>
          </div>

          <div className="flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#e2e8f0_transparent]">
            {loadingThreads ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="size-5 text-slate-300 animate-spin" />
              </div>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-4">
                <MessageSquare className="size-6 text-slate-300" />
                <p className="text-xs text-slate-400">No messages yet</p>
              </div>
            ) : (
              threads.map((t) => (
                <button
                  key={t.investor_id}
                  onClick={() => selectThread(t.investor_id)}
                  className={cn(
                    "w-full px-4 py-3.5 text-left transition-colors border-b border-slate-50 last:border-0",
                    activeId === t.investor_id
                      ? "bg-[#D4AF37]/8 border-l-2 border-l-[#D4AF37]"
                      : "hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-xs font-bold text-slate-600">
                      {initials(t.investor_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("text-[13px] truncate", activeId === t.investor_id ? "font-bold text-slate-900" : "font-semibold text-slate-800")}>
                          {t.investor_name || "Investor"}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0">{fmtTime(t.last_at)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-[11px] text-slate-400 truncate">{t.last_message}</p>
                        {t.unread > 0 && (
                          <span className="w-4 h-4 rounded-full bg-[#D4AF37] text-[#0C1526] text-[9px] font-bold flex items-center justify-center shrink-0">
                            {t.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Chat panel */}
        <div className={cn(
          "min-h-0 flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden",
          mobilePanel === "chat" ? "flex" : "hidden",
          "sm:flex"
        )}>
          {!activeId ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                <MessageSquare className="size-6 text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">Select a conversation</p>
                <p className="text-xs text-slate-400 mt-1">Choose an investor from the list to start messaging</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-[#0C1526] shrink-0">
                <button
                  onClick={() => setMobilePanel("inbox")}
                  className="sm:hidden text-slate-400 hover:text-white transition-colors mr-1"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {initials(activeThread?.investor_name ?? "")}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{activeThread?.investor_name || "Investor"}</p>
                  <p className="text-[10px] text-slate-400">Investor</p>
                </div>
              </div>

              {/* Messages */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-slate-50/40 [scrollbar-width:thin] [scrollbar-color:#e2e8f0_transparent]">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="size-5 text-slate-300 animate-spin" />
                  </div>
                ) : (
                  groups.map((group) => (
                    <div key={group.label}>
                      <DateDivider label={group.label} />
                      <div className="space-y-2">
                        {group.messages.map((msg) => <Bubble key={msg.id} msg={msg} />)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="shrink-0 px-4 py-3 bg-white border-t border-slate-100">
                <div className={cn(
                  "flex items-center gap-3 bg-slate-50 border rounded-xl px-4 py-2.5 transition-all",
                  "focus-within:border-[#D4AF37]/50 focus-within:ring-2 focus-within:ring-[#D4AF37]/10 border-slate-200"
                )}>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={`Reply to ${activeThread?.investor_name || "investor"}…`}
                    className="flex-1 bg-transparent text-[13px] text-slate-800 placeholder:text-slate-400 outline-none"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                      input.trim()
                        ? "bg-[#D4AF37] text-[#0C1526] hover:bg-[#c9a030] active:scale-95"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    )}
                  >
                    {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                    Reply
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
