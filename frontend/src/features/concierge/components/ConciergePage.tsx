"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Phone, Mail, MessageSquare, Clock, Send, CheckCheck,
  Loader2, ChevronDown, UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Stitch dark: gold #c29b40, glass rgba(255,255,255,0.03)+blur+border rgba(255,255,255,0.08)

// ── Types ──────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  sender_role: "investor" | "admin";
  body: string;
  created_at: string;
  read_by_investor: boolean;
}

interface Manager {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
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

// ── Date divider ───────────────────────────────────────────────────────────────

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-slate-100 dark:bg-white/10" />
      <span className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-slate-100 dark:bg-white/10" />
    </div>
  );
}

// ── Bubble ─────────────────────────────────────────────────────────────────────

function Bubble({ msg, managerInitial, isLast }: { msg: Message; managerInitial: string; isLast: boolean }) {
  const isManager = msg.sender_role === "admin";

  if (isManager) {
    return (
      <div className="flex items-end gap-2.5 max-w-[78%]">
        <div className="w-6 h-6 rounded-full bg-[#0C1526] border border-[#D4AF37]/30 flex items-center justify-center shrink-0 mb-1">
          <span className="text-[9px] font-bold text-[#D4AF37]">{managerInitial}</span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-sm px-3.5 py-2.5 dark:bg-white/5 dark:border-white/5">
            <p className="text-[13px] text-slate-800 leading-relaxed dark:text-white/90">{msg.body}</p>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-white/30 ml-1">{fmtTime(msg.created_at)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 max-w-[78%] ml-auto flex-row-reverse">
      <div className="flex flex-col items-end gap-1">
        <div className="bg-[#0C1526] rounded-2xl rounded-tr-sm px-3.5 py-2.5 shadow-md shadow-slate-900/10">
          <p className="text-[13px] text-white/90 leading-relaxed">{msg.body}</p>
        </div>
        <div className="flex items-center gap-1 mr-0.5">
          <span className="text-[10px] text-slate-400 dark:text-white/30">{fmtTime(msg.created_at)}</span>
          {isLast && <CheckCheck className="size-3 text-[#D4AF37]" />}
        </div>
      </div>
    </div>
  );
}

// ── Chat panel ────────────────────────────────────────────────────────────────

function ChatPanel({ onClose, managerName }: { onClose: () => void; managerName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const managerInitial = managerName.charAt(0).toUpperCase() || "M";

  const fetchMessages = useCallback(async (silent = false) => {
    try {
      const res = await fetch("/api/messages");
      if (!res.ok) return;
      const json = await res.json();
      setMessages(json.messages ?? []);
      if (!silent) setLoading(false);
    } catch {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    setTimeout(() => inputRef.current?.focus(), 300);
    pollRef.current = setInterval(() => fetchMessages(true), 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      await fetchMessages(true);
    } finally {
      setSending(false);
    }
  };

  const groups = groupByDate(messages);
  const investorMessages = messages.filter((m) => m.sender_role === "investor");
  const lastInvestorMsg = investorMessages[investorMessages.length - 1];

  return (
    <div className="border-t border-slate-100 dark:border-white/10 animate-in slide-in-from-top-2 duration-300">
      {/* Chat subheader */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50/80 border-b border-slate-100 dark:bg-white/5 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <p className="text-[11px] font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider">Direct Messages</p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 transition-colors dark:text-white/40 dark:hover:text-white/70"
        >
          <ChevronDown className="size-3.5" />
          Collapse
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="h-[320px] overflow-y-auto px-5 py-4 space-y-3 bg-slate-50/30 dark:bg-transparent [scrollbar-width:thin] [scrollbar-color:#e2e8f0_transparent]"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="size-5 text-slate-300 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center">
              <MessageSquare className="size-4 text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-white/80">No messages yet</p>
              <p className="text-xs text-slate-400 dark:text-white/40 mt-0.5">{managerName} typically replies within 1 hour</p>
            </div>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <DateDivider label={group.label} />
              <div className="space-y-2">
                {group.messages.map((msg, i) => (
                  <Bubble
                    key={msg.id}
                    msg={msg}
                    managerInitial={managerInitial}
                    isLast={msg.id === lastInvestorMsg?.id && i === group.messages.length - 1}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-slate-100 dark:bg-transparent dark:border-white/10">
        <div className={cn(
          "flex items-center gap-3 bg-slate-50 border rounded-xl px-4 py-2.5 transition-all",
          "focus-within:border-[#D4AF37]/50 focus-within:ring-2 focus-within:ring-[#D4AF37]/10 border-slate-200",
          "dark:bg-white/5 dark:border-[rgba(255,255,255,0.08)]"
        )}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={`Message ${managerName}…`}
            className="flex-1 bg-transparent text-[13px] text-slate-800 placeholder:text-slate-400 outline-none dark:text-white dark:placeholder:text-white/30"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0",
              input.trim()
                ? "bg-[#D4AF37] text-[#0C1526] hover:bg-[#c9a030] active:scale-95"
                : "bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-white/10 dark:text-white/30"
            )}
          >
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-white/30 mt-1.5 text-center">
          Mon–Sat 08:00–18:00 EAT · Replies arrive here
        </p>
      </div>
    </div>
  );
}

// ── Assistance tags ────────────────────────────────────────────────────────────

const ASSISTANCE_ITEMS = [
  "Account performance",
  "Withdrawals & deposits",
  "Account inquiries",
  "Strategy guidance",
];

// ── Page ───────────────────────────────────────────────────────────────────────

export function ConciergePage() {
  const [chatOpen, setChatOpen] = useState(false);
  const [manager, setManager] = useState<Manager | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    fetch("/api/concierge/manager")
      .then((r) => r.json())
      .then((json) => setManager(json.manager ?? null))
      .catch(() => setManager(null));
  }, []);

  const managerName = manager?.name ?? "Your Account Manager";
  const managerInitial = managerName.charAt(0).toUpperCase();
  const isLoading = manager === undefined;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-1">My Account Manager</h1>
        <p className="text-slate-500 dark:text-white/40 text-sm">Your dedicated manager is here to assist you.</p>
      </div>

      {/* ── Main card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden dark:bg-[rgba(255,255,255,0.03)] dark:[backdrop-filter:blur(12px)] dark:border-[rgba(255,255,255,0.08)] dark:shadow-none">

        {/* Profile section */}
        <div className="p-6 sm:p-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="size-6 text-slate-300 animate-spin" />
            </div>
          ) : manager === null ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <UserCircle className="size-12 text-slate-200 dark:text-white/10" />
              <div>
                <p className="text-sm font-semibold text-slate-600 dark:text-white/70">No manager assigned yet</p>
                <p className="text-xs text-slate-400 dark:text-white/40 mt-1">An account manager will be assigned to your account shortly.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-5 items-center">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#0C1526] border border-[#D4AF37]/30 flex items-center justify-center shadow-md">
                    <span className="text-2xl sm:text-3xl font-bold text-[#D4AF37]">{managerInitial}</span>
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-[#050b14]" />
                </div>

                {/* Name + quick info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{manager.name}</h3>
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg dark:bg-[rgba(34,197,94,0.1)] dark:border-[rgba(34,197,94,0.2)]">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Online</span>
                    </span>
                  </div>
                  <p className="text-[13px] text-slate-500 dark:text-white/60 mb-3">Senior Account Manager</p>

                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {manager.phone && (
                      <a href={`tel:${manager.phone}`} className="flex items-center gap-1.5 group">
                        <Phone className="size-3 text-slate-400 group-hover:text-[#c29b40] transition-colors" />
                        <span className="text-[12px] text-slate-500 dark:text-white/60 group-hover:text-slate-800 dark:group-hover:text-white transition-colors">{manager.phone}</span>
                      </a>
                    )}
                    {manager.email && (
                      <a href={`mailto:${manager.email}`} className="flex items-center gap-1.5 group">
                        <Mail className="size-3 text-slate-400 group-hover:text-[#c29b40] transition-colors" />
                        <span className="text-[12px] text-slate-500 dark:text-white/60 group-hover:text-slate-800 dark:group-hover:text-white transition-colors">{manager.email}</span>
                      </a>
                    )}
                    {manager.phone && (
                      <a href={`https://wa.me/${manager.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 group">
                        <svg className="size-3 text-slate-400 group-hover:text-emerald-500 transition-colors" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        <span className="text-[12px] text-slate-500 dark:text-white/60 group-hover:text-slate-800 dark:group-hover:text-white transition-colors">WhatsApp</span>
                      </a>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3 text-slate-400" />
                      <span className="text-[12px] text-slate-500 dark:text-white/60">Mon–Sat · 08:00–18:00 EAT</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="mt-5 flex flex-wrap gap-2">
                {ASSISTANCE_ITEMS.map((item) => (
                  <span
                    key={item}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full dark:text-white/60 dark:bg-white/5 dark:border-white/10"
                  >
                    <svg className="w-2 h-2 text-[#c29b40] shrink-0" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {item}
                  </span>
                ))}
              </div>

              {/* CTA */}
              {!chatOpen && (
                <div className="mt-5 flex justify-center">
                  <button
                    onClick={() => setChatOpen(true)}
                    className="flex items-center gap-2.5 bg-[#0C1526] hover:bg-[#111d35] text-white font-semibold text-sm px-7 py-3 rounded-2xl transition-all active:scale-[0.97] shadow-md shadow-slate-900/10 hover:shadow-lg hover:shadow-slate-900/15 dark:bg-[#1c2a45] dark:border dark:border-white/10 dark:hover:bg-[#243450]"
                  >
                    <MessageSquare className="size-4 text-[#D4AF37]" />
                    Message {manager.name.split(" ")[0]}
                    <span className="text-[10px] font-normal text-slate-400 bg-white/10 px-2 py-0.5 rounded-lg ml-1">
                      ~1h
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {chatOpen && manager && <ChatPanel onClose={() => setChatOpen(false)} managerName={manager.name} />}
      </div>

      {/* Guarantee note */}
      <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-white border border-slate-100 rounded-xl shadow-sm dark:bg-white/5 dark:border-white/10 dark:shadow-none">
        <span className="w-1.5 h-1.5 bg-[#c29b40] rounded-full animate-pulse shrink-0" />
        <p className="text-[12px] text-slate-500 dark:text-white/40 leading-relaxed">
          Messages go directly to {manager?.name?.split(" ")[0] ?? "your manager"}. Guaranteed response within{" "}
          <span className="font-semibold text-slate-700 dark:text-white/70">1 business hour</span> during working hours.
        </p>
      </div>
    </div>
  );
}
