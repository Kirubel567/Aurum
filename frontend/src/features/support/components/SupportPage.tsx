"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/src/lib/constants/routes";

// ── Types ──────────────────────────────────────────────────────────────────────

type Role = "ai" | "user";

interface Message {
  id: string;
  role: Role;
  text: string;
  time: string;
  typing?: boolean;
}

// ── AI response logic ──────────────────────────────────────────────────────────

const AI_RESPONSES: { keywords: string[]; reply: string }[] = [
  {
    keywords: ["deposit", "cbe", "bank", "transfer", "payment", "proof"],
    reply:
      "Your $1,200 CBE deposit has been received and is currently under verification by our compliance team. Expected processing time is 1–3 business hours. You will receive an email confirmation once activated.",
  },
  {
    keywords: ["withdraw", "withdrawal", "payout", "cash out"],
    reply:
      "Withdrawal requests are processed within 24–48 business hours. Your account must complete the minimum 30-day lock-up period. Current eligible balance: $0.00. Please contact your account manager for expedited requests.",
  },
  {
    keywords: ["balance", "portfolio", "performance", "return", "yield", "earnings"],
    reply:
      "Your current portfolio value is $12,450 with a month-to-date return of +8.3%. Your active strategy pool allocation is 60% Apex Gold, 25% Silver Shield, and 15% Obsidian Core. Would you like a full earnings report?",
  },
  {
    keywords: ["strategy", "pool", "fund", "invest", "allocation"],
    reply:
      "Aurum currently operates three strategy pools: Apex Gold (60% allocation, avg. 12.4% annual), Silver Shield (25%, avg. 9.1%), and Obsidian Core (15%, avg. 7.8%). Strategy rebalancing happens quarterly. Would you like details on any specific pool?",
  },
  {
    keywords: ["account", "manager", "concierge", "human", "contact", "daniel"],
    reply:
      "Connecting you to your dedicated account manager Daniel Tesfaye. You can also reach him directly at daniel.tesfaye@aurumsc.com or +251 912 345 678 (Mon–Sat, 08:00–18:00 EAT).",
  },
  {
    keywords: ["contract", "legal", "agreement", "document", "terms"],
    reply:
      "Your legal documents are available in the My Contract section of the portal. This includes your Partnership Agreement, Investment Contract, Bank Details, Terms & Conditions, and Privacy Policy — all downloadable as PDFs.",
  },
  {
    keywords: ["hello", "hi", "hey", "greetings", "good morning", "good afternoon"],
    reply:
      "Hello! I'm Aurum Core AI, your 24/7 financial assistant. I can help you with deposit status, portfolio performance, withdrawal requests, strategy details, and more. How can I assist you today?",
  },
];

function getAIReply(userText: string): string {
  const lower = userText.toLowerCase();
  for (const entry of AI_RESPONSES) {
    if (entry.keywords.some((k) => lower.includes(k))) {
      return entry.reply;
    }
  }
  return "I'm reviewing your request. For complex account inquiries, I recommend connecting with your dedicated account manager Daniel Tesfaye for personalized assistance. Is there anything else I can help you with?";
}

function nowTime(): string {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

let _id = 0;
const uid = () => String(++_id);

// ── Initial messages (from stitch) ────────────────────────────────────────────

const INITIAL_MESSAGES: Message[] = [
  {
    id: uid(),
    role: "ai",
    text: "Greetings Abebe, how can I assist with your portfolio today? I can provide instant asset stats or resolve transaction queries.",
    time: "10:42 AM",
  },
  {
    id: uid(),
    role: "user",
    text: "What is the processing status of my $1,200 Commercial Bank of Ethiopia deposit?",
    time: "10:43 AM",
  },
  {
    id: uid(),
    role: "ai",
    text: "Your $1,200 CBE deposit has been received and is currently under verification by our compliance team. Expected processing time is 1–3 business hours. You will receive an email confirmation once activated.",
    time: "10:44 AM",
  },
];

// ── Avatars ────────────────────────────────────────────────────────────────────

function AIAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-[#050b14] flex items-center justify-center shrink-0">
      <span className="material-symbols-outlined text-[#e9c349] text-sm">smart_toy</span>
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-[#e9c349] flex items-center justify-center shrink-0">
      <span className="material-symbols-outlined text-[#050b14] text-sm">person</span>
    </div>
  );
}

// ── Typing indicator ───────────────────────────────────────────────────────────

function TypingIndicator({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-4 max-w-[80%]">
      <AIAvatar />
      <div
        className="bg-white p-4 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl border border-[#45474b]/20 italic text-[#737a86]"
        style={{ boxShadow: "0 4px 24px -2px rgba(5,11,20,0.04)" }}
      >
        <div className="flex gap-1 items-center">
          <span className="w-1.5 h-1.5 bg-[#e9c349] rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 bg-[#e9c349] rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 bg-[#e9c349] rounded-full animate-bounce" />
          <span className="ml-2 text-xs">{text}</span>
        </div>
      </div>
    </div>
  );
}

// ── Chat message bubble ────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: Message }) {
  if (msg.typing) return <TypingIndicator text={msg.text} />;

  if (msg.role === "ai") {
    return (
      <div className="flex items-start gap-4 max-w-[80%]">
        <AIAvatar />
        <div
          className="bg-white p-4 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl border border-[#45474b]/20"
          style={{ boxShadow: "0 4px 24px -2px rgba(5,11,20,0.04)" }}
        >
          <p className="text-base text-[#050b14] leading-6">{msg.text}</p>
          <span className="text-[10px] text-[#737a86] mt-2 block font-medium opacity-60">{msg.time}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4 max-w-[80%] ml-auto flex-row-reverse">
      <UserAvatar />
      <div
        className="bg-[#050b14] p-4 rounded-tl-2xl rounded-bl-2xl rounded-br-2xl"
        style={{ boxShadow: "0 4px 24px -2px rgba(5,11,20,0.04)" }}
      >
        <p className="text-base text-[#dde3eb] leading-6">{msg.text}</p>
        <span className="text-[10px] text-[#737a86] mt-2 block font-medium opacity-80 text-right">{msg.time}</span>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function SupportPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setInput("");

    const userMsg: Message = { id: uid(), role: "user", text: content, time: nowTime() };
    const typingMsg: Message = { id: uid(), role: "ai", text: "Core AI is processing your request…", time: "", typing: true };

    setMessages((prev) => [...prev, userMsg, typingMsg]);
    setBusy(true);

    setTimeout(() => {
      const reply = getAIReply(content);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== typingMsg.id),
        { id: uid(), role: "ai", text: reply, time: nowTime() },
      ]);
      setBusy(false);
    }, 1400);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") sendMessage();
  };

  const injectPrompt = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const clearHistory = () => {
    setMessages([{
      id: uid(),
      role: "ai",
      text: "Chat cleared. How can I assist you today?",
      time: nowTime(),
    }]);
    setShowHistory(false);
  };

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-10">
          <h2 className="text-[48px] font-extrabold text-[#050b14] leading-tight tracking-tight mb-2">
            AI Financial Support
          </h2>
          <p className="text-base text-[#737a86] max-w-2xl leading-6">
            Interact with our 24/7 intelligent automated system for rapid portfolio inquiries,
            transaction guidance, and platform support.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* ── Left: Chat (9 cols) ── */}
          <div className="col-span-9 flex flex-col">
            <div
              className="rounded-2xl flex flex-col"
              style={{
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(10px)",
                border: "1px solid #E2E8F0",
                boxShadow: "0 4px 24px -2px rgba(5,11,20,0.04)",
                height: "716px",
              }}
            >
              {/* Chat Header */}
              <div className="p-6 border-b border-[#45474b]/20 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#050b14] rounded-xl flex items-center justify-center shadow-lg">
                    <span className="material-symbols-outlined text-[#e9c349] text-3xl">bolt</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[#050b14]">Aurum Core AI</h3>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse" />
                      <span className="text-xs font-semibold text-[#10B981] uppercase tracking-wider">
                        Online &amp; Active
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 relative">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="p-2 text-[#737a86] hover:bg-[#1a2026]/10 transition-colors rounded-lg"
                    title="Chat history"
                  >
                    <span className="material-symbols-outlined">history</span>
                  </button>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="p-2 text-[#737a86] hover:bg-[#1a2026]/10 transition-colors rounded-lg"
                    title="More options"
                  >
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                  {showHistory && (
                    <div className="absolute right-0 top-10 bg-white border border-[#e2e8f0] rounded-xl shadow-xl z-20 w-44 py-2 text-sm">
                      <button
                        onClick={clearHistory}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-[#050b14] font-medium flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-base">delete_sweep</span>
                        Clear chat
                      </button>
                      <button
                        onClick={() => setShowHistory(false)}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-[#050b14] font-medium flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-base">download</span>
                        Export chat
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white/40">
                {messages.map((msg) => (
                  <ChatBubble key={msg.id} msg={msg} />
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="p-6 bg-white border-t border-[#45474b]/20 shrink-0">
                <div
                  className="flex items-center gap-4 bg-[#F8FAFC] border border-[#45474b]/30 rounded-xl p-2 pl-4 transition-all focus-within:border-[#e9c349]"
                  style={{ boxShadow: "0 4px 24px -2px rgba(5,11,20,0.04)" }}
                >
                  <button className="text-[#737a86] hover:text-[#050b14] transition-colors" title="Attach file">
                    <span className="material-symbols-outlined">attach_file</span>
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    disabled={busy}
                    placeholder="Type your support request or ask about active trading pools..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-base text-[#050b14] py-2 placeholder:text-[#737a86] disabled:opacity-60"
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={busy || !input.trim()}
                    className="bg-[#e9c349] text-[#050b14] px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-md disabled:opacity-50"
                  >
                    <span>Send</span>
                    <span className="material-symbols-outlined text-sm">send</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Quick Actions (3 cols) ── */}
          <div className="col-span-3 space-y-6">
            <h4 className="text-sm font-semibold text-[#050b14] uppercase tracking-widest px-1">
              Quick Actions
            </h4>
            <div className="space-y-4">
              {/* Deposit Verification */}
              <button
                onClick={() => injectPrompt("What is the processing status of my deposit?")}
                className="w-full text-left p-5 bg-white border border-[#45474b]/20 rounded-2xl hover:bg-[#e9c349]/5 transition-all group"
                style={{ boxShadow: "0 4px 24px -2px rgba(5,11,20,0.04)" }}
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 bg-[#1a2026] rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#e9c349] group-hover:text-[#050b14] text-[#dde3eb] transition-colors">
                    <span className="material-symbols-outlined">verified</span>
                  </div>
                  <span className="material-symbols-outlined text-[#737a86] opacity-40 group-hover:translate-x-1 group-hover:opacity-100 transition-all">
                    chevron_right
                  </span>
                </div>
                <h5 className="font-bold text-[#050b14] mb-1">Deposit Verification</h5>
                <p className="text-xs text-[#737a86]">Check status of CBE or international wire transfers.</p>
              </button>

              {/* Active Yield Report */}
              <button
                onClick={() => injectPrompt("Generate my active yield report for this month.")}
                className="w-full text-left p-5 bg-white border border-[#45474b]/20 rounded-2xl hover:bg-[#e9c349]/5 transition-all group"
                style={{ boxShadow: "0 4px 24px -2px rgba(5,11,20,0.04)" }}
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 bg-[#1a2026] rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#e9c349] group-hover:text-[#050b14] text-[#dde3eb] transition-colors">
                    <span className="material-symbols-outlined">analytics</span>
                  </div>
                  <span className="material-symbols-outlined text-[#737a86] opacity-40 group-hover:translate-x-1 group-hover:opacity-100 transition-all">
                    chevron_right
                  </span>
                </div>
                <h5 className="font-bold text-[#050b14] mb-1">Active Yield Report</h5>
                <p className="text-xs text-[#737a86]">Generate instant PDF of your month-to-date earnings.</p>
              </button>

              {/* Live Account Manager — dark card, navigates to /concierge */}
              <button
                onClick={() => router.push(ROUTES.CONCIERGE)}
                className="w-full text-left p-5 bg-[#050b14] border border-[#050b14] rounded-2xl shadow-xl hover:shadow-2xl transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 bg-[#e9c349]/20 text-[#e9c349] rounded-lg flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined">support_agent</span>
                  </div>
                  <span className="material-symbols-outlined text-[#e9c349] group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </div>
                <h5 className="font-bold text-white mb-1">Live Account Manager</h5>
                <p className="text-xs text-[#737a86]">Connect to your dedicated human representative.</p>
              </button>
            </div>

            {/* Priority Support Status widget */}
            <div
              className="p-6 rounded-2xl border-dashed border-2 border-[#e9c349]/30 relative overflow-hidden group"
              style={{
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(10px)",
                border: "1px solid #E2E8F0",
              }}
            >
              <div className="relative z-10">
                <h5 className="text-sm font-semibold text-[#050b14] mb-2">Priority Support Status</h5>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="w-6 h-6 rounded-full border-2 border-white bg-[#e9c349] flex items-center justify-center text-[8px] font-bold text-[#050b14]">
                      JD
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 border-white bg-[#050b14] flex items-center justify-center text-[8px] font-bold text-white">
                      MK
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-[#050b14]">Tier-1 Access Active</span>
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-7xl text-[#050b14]">security</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
