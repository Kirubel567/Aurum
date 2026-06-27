"use client";

import { useState } from "react";
import { useNotificationStore } from "@/src/store/notification.store";

// ── Icons (inline SVGs matching Lucide shapes from stitch) ────────────────────

function PhoneIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.01 1.22 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M22 6l-10 7L2 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function MessageSquareIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

// ── Message modal ──────────────────────────────────────────────────────────────

function MessageModal({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const addToast = useNotificationStore((s) => s.addToast);

  const handleSend = () => {
    if (!message.trim()) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      addToast({
        title: "Message sent",
        description: "Daniel Tesfaye will respond within 1 business hour.",
        variant: "success",
      });
      setTimeout(onClose, 1800);
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-lg font-bold">D</div>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Daniel Tesfaye</p>
              <p className="text-[10px] text-[#64748b]">Senior Account Manager</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XIcon />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {sent ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                </svg>
              </div>
              <p className="font-bold text-slate-800">Message Sent!</p>
              <p className="text-xs text-[#64748b] mt-1">Daniel will respond within 1 business hour.</p>
            </div>
          ) : (
            <>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Your Message</label>
              <textarea
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message to Daniel…"
                className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-800 resize-none focus:outline-none focus:border-[#c29b40] transition-colors"
              />
              <p className="text-[10px] text-[#64748b] mt-1.5">
                Typical response time: within 1 business hour during working hours.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        {!sent && (
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="flex-1 py-2.5 bg-[#050b14] hover:bg-slate-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              {sending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Sending…
                </>
              ) : (
                <>
                  <SendIcon />
                  Send Message
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Assistance checklist ───────────────────────────────────────────────────────

const ASSISTANCE_ITEMS = [
  "Account performance updates",
  "Withdrawal & deposit assistance",
  "General account inquiries",
  "Strategy & partnership guidance",
  "Any other support you need",
];

// ── Page ───────────────────────────────────────────────────────────────────────

export function ConciergePage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto bg-[#f8f9fa] min-h-screen">
      {showModal && <MessageModal onClose={() => setShowModal(false)} />}

      {/* Page Title */}
      <div className="mb-6 sm:mb-10">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">My Account Manager</h1>
        <p className="text-[#64748b] text-sm">Your personal account manager is here to assist you.</p>
      </div>

      {/* Profile Card */}
      <div
        className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-8 flex flex-col md:flex-row gap-8 sm:gap-12 items-center md:items-start"
        style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}
      >
        {/* Left: Manager Info */}
        <div className="flex flex-col gap-6 items-center flex-grow md:flex-row md:items-start md:gap-8">
          {/* Profile picture */}
          <div className="relative flex flex-col items-center">
            <div className="w-44 h-44 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-sm ring-1 ring-slate-200">
              {/* Placeholder avatar — replace src with real image when available */}
                <img
                alt="Daniel Tesfaye"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDLDmSm3Nf3bgJeAhhs1zBrsdD-b5IBjwhX0KJzEmm_py0eRKVsJxBrfwF5l0_utSVm613EX8Uq1JKEmMbhp_vct0V2clsmmCIU55gEiAlt6-Ak6tnj_UTiVoHF2cRm2AVYFtCmysBTPvZfJMaRPNlsykTmf_cV8ywNMaJI8u-cWbR8pxnxeqxF19f5zb7PB3QB6d9jmVuxTJupKXLdEGITKaYQZS_K34JdfPeoF2N4Jr9j6x-ChqGHwmhi2R3Iug0MLUH0LNFZ3WQ"
              />
            </div>

            {/* Online badge */}
            <div className="mt-4">
              <span className="px-4 py-1 rounded-lg text-xs font-semibold flex items-center gap-2 bg-[#e6f9f1] text-green-600">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Online
              </span>
            </div>
          </div>

          {/* Contact details */}
          <div className="flex-grow w-full">
            <h3 className="text-2xl font-bold text-slate-900 mb-1 text-center md:text-left">Daniel Tesfaye</h3>
            <p className="text-[#64748b] text-sm font-medium mb-8 text-center md:text-left">Senior Account Manager</p>

            <div className="space-y-4">
              {/* Phone */}
              <a
                href="tel:+251912345678"
                className="flex items-center justify-center md:justify-start gap-4 group"
              >
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-[#c29b40] transition-colors">
                  <PhoneIcon />
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-[#c29b40] transition-colors">
                  +251 912 345 678
                </span>
              </a>

              {/* Email */}
              <a
                href="mailto:daniel.tesfaye@aurumsc.com"
                className="flex items-center justify-center md:justify-start gap-4 group"
              >
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-[#c29b40] transition-colors">
                  <MailIcon />
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-[#c29b40] transition-colors">
                  daniel.tesfaye@aurumsc.com
                </span>
              </a>

              {/* WhatsApp / message */}
              <a
                href="https://wa.me/251912345678"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center md:justify-start gap-4 group"
              >
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-[#c29b40] transition-colors">
                  <MessageSquareIcon />
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-[#c29b40] transition-colors">
                  +251 912 345 678
                </span>
              </a>

              {/* Working hours */}
              <div className="flex items-center justify-center md:justify-start gap-4 group">
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                  <ClockIcon />
                </div>
                <span className="text-sm font-medium text-slate-700 leading-tight">
                  Mon – Sat: 08:00 AM – 06:00 PM
                  <br />
                  <span className="text-xs text-[#64748b]">EAT</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Assistance card */}
        <div className="w-full md:w-96 bg-slate-50/50 rounded-2xl p-6 border border-slate-100 shrink-0">
          <h4 className="text-sm font-bold text-slate-900 mb-6">How your account manager can help</h4>

          <ul className="space-y-4 mb-8">
            {ASSISTANCE_ITEMS.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full border border-[#c29b40] flex items-center justify-center shrink-0 mt-0.5 text-[#c29b40]">
                  <CheckIcon />
                </div>
                <span className="text-sm text-slate-600">{item}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => setShowModal(true)}
            className="w-full bg-[#050b14] hover:bg-slate-800 text-white py-3.5 px-6 rounded-xl font-bold flex items-center justify-center gap-3 transition-all"
            style={{ boxShadow: "0 8px 24px rgba(5,11,20,0.2)" }}
          >
            <SendIcon />
            Message Manager
          </button>
        </div>
      </div>
    </div>
  );
}
