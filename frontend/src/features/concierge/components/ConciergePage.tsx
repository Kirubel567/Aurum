"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Phone, Mail, MessageSquare, Clock, Send, CheckCheck,
  Loader2, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  sender_role: "investor" | "admin";
  body: string;
  created_at: string;
  read_by_investor: boolean;
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
      <div className="flex-1 h-px bg-slate-100" />
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

// ── Bubble ─────────────────────────────────────────────────────────────────────

function Bubble({ msg, isLast }: { msg: Message; isLast: boolean }) {
  const isManager = msg.sender_role === "admin";

  if (isManager) {
    return (
      <div className="flex items-end gap-2.5 max-w-[78%]">
        <div className="w-6 h-6 rounded-full bg-[#0C1526] border border-[#D4AF37]/30 flex items-center justify-center shrink-0 mb-1">
          <span className="text-[9px] font-bold text-[#D4AF37]">D</span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-sm px-3.5 py-2.5">
            <p className="text-[13px] text-slate-800 leading-relaxed">{msg.body}</p>
          </div>
          <span className="text-[10px] text-slate-400 ml-1">{fmtTime(msg.created_at)}</span>
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
          <span className="text-[10px] text-slate-400">{fmtTime(msg.created_at)}</span>
          {isLast && <CheckCheck className="size-3 text-[#D4AF37]" />}
        </div>
      </div>
    </div>
  );
}

// ── Chat panel (expandable) ────────────────────────────────────────────────────

function ChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

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

  return (
    <div className="border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
      {/* Chat subheader */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50/80 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Direct Messages</p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ChevronDown className="size-3.5" />
          Collapse
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="h-[320px] overflow-y-auto px-5 py-4 space-y-3 bg-slate-50/30 [scrollbar-width:thin] [scrollbar-color:#e2e8f0_transparent]"
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
              <p className="text-sm font-semibold text-slate-700">No messages yet</p>
              <p className="text-xs text-slate-400 mt-0.5">Daniel typically replies within 1 hour</p>
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
                    isLast={i === group.messages.length - 1 && msg.sender_role === "investor"}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-slate-100">
        <div className={cn(
          "flex items-center gap-3 bg-slate-50 border rounded-xl px-4 py-2.5 transition-all",
          "focus-within:border-[#D4AF37]/50 focus-within:ring-2 focus-within:ring-[#D4AF37]/10 border-slate-200"
        )}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Message Daniel…"
            className="flex-1 bg-transparent text-[13px] text-slate-800 placeholder:text-slate-400 outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0",
              input.trim()
                ? "bg-[#D4AF37] text-[#0C1526] hover:bg-[#c9a030] active:scale-95"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            )}
          >
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 text-center">
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">My Account Manager</h1>
        <p className="text-slate-500 text-sm">Your dedicated manager is here to assist you.</p>
      </div>

      {/* ── Main card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Profile section */}
        <div className="p-6 sm:p-8">
          <div className="flex gap-5 items-center">

            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white shadow-md ring-1 ring-slate-200">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDLDmSm3Nf3bgJeAhhs1zBrsdD-b5IBjwhX0KJzEmm_py0eRKVsJxBrfwF5l0_utSVm613EX8Uq1JKEmMbhp_vct0V2clsmmCIU55gEiAlt6-Ak6tnj_UTiVoHF2cRm2AVYFtCmysBTPvZfJMaRPNlsykTmf_cV8ywNMaJI8u-cWbR8pxnxeqxF19f5zb7PB3QB6d9jmVuxTJupKXLdEGITKaYQZS_K34JdfPeoF2N4Jr9j6x-ChqGHwmhi2R3Iug0MLUH0LNFZ3WQ"
                  alt="Daniel Tesfaye"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
            </div>

            {/* Name + quick info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <h3 className="text-lg font-bold text-slate-900">Daniel Tesfaye</h3>
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-700">Online</span>
                </span>
              </div>
              <p className="text-[13px] text-slate-500 mb-3">Senior Account Manager</p>

              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <a href="tel:+251912345678" className="flex items-center gap-1.5 group">
                  <Phone className="size-3 text-slate-400 group-hover:text-[#D4AF37] transition-colors" />
                  <span className="text-[12px] text-slate-500 group-hover:text-slate-800 transition-colors">+251 912 345 678</span>
                </a>
                <a href="mailto:daniel.tesfaye@aurumsc.com" className="flex items-center gap-1.5 group">
                  <Mail className="size-3 text-slate-400 group-hover:text-[#D4AF37] transition-colors" />
                  <span className="text-[12px] text-slate-500 group-hover:text-slate-800 transition-colors">daniel.tesfaye@aurumsc.com</span>
                </a>
                <a href="https://wa.me/251912345678" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 group">
                  {/* WhatsApp icon */}
                  <svg className="size-3 text-slate-400 group-hover:text-emerald-500 transition-colors" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span className="text-[12px] text-slate-500 group-hover:text-slate-800 transition-colors">WhatsApp</span>
                </a>
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3 text-slate-400" />
                  <span className="text-[12px] text-slate-500">Mon–Sat · 08:00–18:00 EAT</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="mt-5 flex flex-wrap gap-2">
            {ASSISTANCE_ITEMS.map((item) => (
              <span
                key={item}
                className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full"
              >
                <svg className="w-2 h-2 text-[#D4AF37] shrink-0" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {item}
              </span>
            ))}
          </div>

          {/* CTA — only shown when chat is collapsed */}
          {!chatOpen && (
            <div className="mt-5 flex justify-center">
              <button
                onClick={() => setChatOpen(true)}
                className="flex items-center gap-2.5 bg-[#0C1526] hover:bg-[#111d35] text-white font-semibold text-sm px-7 py-3 rounded-2xl transition-all active:scale-[0.97] shadow-md shadow-slate-900/10 hover:shadow-lg hover:shadow-slate-900/15"
              >
                <MessageSquare className="size-4 text-[#D4AF37]" />
                Message Daniel
                <span className="text-[10px] font-normal text-slate-400 bg-white/10 px-2 py-0.5 rounded-lg ml-1">
                  ~1h
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Expandable chat panel — rendered below the profile, inside the same card */}
        {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
      </div>

      {/* Guarantee note */}
      <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-white border border-slate-100 rounded-xl shadow-sm">
        <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-pulse shrink-0" />
        <p className="text-[12px] text-slate-500 leading-relaxed">
          Messages go directly to Daniel. Guaranteed response within <span className="font-semibold text-slate-700">1 business hour</span> during working hours.
        </p>
      </div>
    </div>
  );
}
