"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  User, Mail, Phone, MapPin, Globe, Lock, RefreshCw, Shield,
  Smartphone, Monitor, CheckCircle2, Circle, Landmark, Plus, X,
  Save, Camera, Eye, EyeOff, Info, Loader2, CheckCheck, QrCode,
} from "lucide-react";
import { useNotificationStore } from "@/src/store/notification.store";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab = "personal" | "security" | "banks";

interface Profile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  country: string;
  address: string;
  avatarPath: string | null;
  depositStatus: string;
  twoFaEnabled: boolean;
  createdAt: string;
  role: string;
}

interface PersonalForm {
  fullName: string;
  phone: string;
  country: string;
  address: string;
}

interface PasswordForm {
  current: string;
  next: string;
  confirm: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  swiftCode: string;
  isPrimary: boolean;
}

interface RawBankAccount {
  id: string;
  bank_name: string;
  account_holder: string;
  account_number: string;
  swift_code?: string | null;
  is_primary: boolean;
}

interface ActiveSession {
  id: string;
  device_label: string;
  ip_address: string | null;
  is_current: boolean;
  revoked: boolean;
  created_at: string;
  last_active: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const COUNTRIES = [
  "Ethiopia", "United States", "United Kingdom", "Germany",
  "UAE", "Switzerland", "Canada", "Australia", "Kenya", "South Africa",
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "Active now";
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// ── Shared UI ──────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2 dark:text-white/40">
        {label}
      </label>
      <div className="relative">{children}</div>
    </div>
  );
}

function inputCls(readOnly = false) {
  return cn(
    "w-full h-11 px-4 rounded-xl border text-[13px] text-slate-900 outline-none transition-all",
    readOnly
      ? "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed dark:bg-white/5 dark:border-white/5 dark:text-white/30"
      : "bg-white border-slate-200 hover:border-slate-300 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 dark:bg-[rgba(255,255,255,0.02)] dark:border-[rgba(255,255,255,0.1)] dark:text-[#dde3eb] dark:hover:border-white/20 dark:focus:bg-white/5 dark:focus:border-[#e9c349] dark:focus:ring-[#e9c349]/15"
  );
}

function SectionCard({
  icon, title, children,
}: {
  icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden dark:bg-[rgba(255,255,255,0.03)] dark:[backdrop-filter:blur(12px)] dark:border-[rgba(255,255,255,0.05)] dark:shadow-none">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-white/5">
        <div className="w-8 h-8 rounded-xl bg-[#0C1526] flex items-center justify-center shrink-0 dark:bg-white/10 dark:border dark:border-white/10">
          {icon}
        </div>
        <h3 className="text-[13px] font-bold text-slate-900 uppercase tracking-wider dark:text-white">
          {title}
        </h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ── Tab: Personal Profile ─────────────────────────────────────────────────────

function PersonalTab({
  profile, form, setForm, dirty, onSave, onDiscard, saving, onAvatarUpload,
}: {
  profile: Profile;
  form: PersonalForm;
  setForm: (f: PersonalForm) => void;
  dirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
  saving: boolean;
  onAvatarUpload: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    onAvatarUpload(file);
  };

  const set = (key: keyof PersonalForm) => (val: string) =>
    setForm({ ...form, [key]: val });

  const avatarSrc = avatarPreview;
  const showInitials = !avatarSrc;

  const registrationDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      })
    : "—";

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-5 items-start">
        {/* Left: Personal Information */}
        <div className="lg:col-span-6">
          <SectionCard icon={<User className="size-4 text-[#D4AF37]" />} title="Personal Information">
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Full Name">
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => set("fullName")(e.target.value)}
                    className={inputCls()}
                  />
                </Field>
                <Field label="Email Address">
                  <input
                    type="email"
                    value={profile.email}
                    readOnly
                    className={cn(inputCls(true), "pr-10")}
                  />
                  <Lock className="absolute right-3 top-3 size-4 text-slate-300 pointer-events-none dark:text-white/20" />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Phone Number">
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => set("phone")(e.target.value)}
                    placeholder="+251 912 345 678"
                    className={inputCls()}
                  />
                </Field>
                <Field label="Country">
                  <select
                    value={form.country}
                    onChange={(e) => set("country")(e.target.value)}
                    className={cn(inputCls(), "appearance-none pr-10 dark:[color-scheme:dark]")}
                  >
                    <option value="">Select country…</option>
                    {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <Globe className="absolute right-3 top-3 size-4 text-slate-400 pointer-events-none dark:text-white/30" />
                </Field>
              </div>

              <Field label="Street Address">
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => set("address")(e.target.value)}
                  placeholder="Street, district, city"
                  className={inputCls()}
                />
              </Field>
            </div>
          </SectionCard>
        </div>

        {/* Right: Photo + Status */}
        <div className="lg:col-span-4 space-y-5">
          {/* Profile Photo */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center text-center dark:bg-[rgba(255,255,255,0.03)] dark:[backdrop-filter:blur(12px)] dark:border-[rgba(255,255,255,0.05)] dark:shadow-none">
            <div className="relative mb-4">
              {showInitials ? (
                <div className="w-24 h-24 rounded-2xl border-2 border-white shadow-lg ring-1 ring-slate-200 bg-[#0C1526] flex items-center justify-center dark:border-[#0e141a] dark:ring-white/10">
                  <span className="text-[#D4AF37] text-2xl font-bold">
                    {initials(profile.fullName || profile.email)}
                  </span>
                </div>
              ) : (
                <img
                  src={avatarSrc!}
                  alt="Profile"
                  className="w-24 h-24 rounded-2xl border-2 border-white shadow-lg object-cover ring-1 ring-slate-200 dark:border-[#0e141a] dark:ring-white/10"
                />
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-[#D4AF37] rounded-xl flex items-center justify-center border-2 border-white shadow-md hover:bg-[#c9a030] transition-colors dark:bg-[#e9c349] dark:border-[#0e141a] dark:hover:bg-[#f0d275]"
              >
                <Camera className="size-3.5 text-[#0C1526]" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
              />
            </div>
            <p className="text-[13px] font-bold text-slate-900 mb-0.5 dark:text-white">Profile Photo</p>
            <p className="text-[11px] text-slate-400 mb-4 leading-relaxed dark:text-white/40">
              800×800px · JPG or PNG · max 2MB
            </p>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full py-2.5 px-5 bg-[#0C1526] text-white text-[13px] font-bold rounded-xl hover:bg-[#111d35] transition-all active:scale-95 dark:bg-[#e9c349] dark:text-[#3c2f00] dark:hover:bg-[#f0d275]"
            >
              Upload New Image
            </button>
          </div>

          {/* Account Status */}
          <SectionCard icon={<Shield className="size-4 text-[#D4AF37]" />} title="Account Status">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2.5 border-b border-slate-50 dark:border-white/5">
                <span className="text-[12px] text-slate-500 dark:text-white/40">Verification Status</span>
                <span className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold",
                  profile.depositStatus === "approved"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                )}>
                  {profile.depositStatus === "approved" && <CheckCircle2 className="size-3" />}
                  {profile.depositStatus === "approved" ? "Approved" : profile.depositStatus}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-slate-50 dark:border-white/5">
                <span className="text-[12px] text-slate-500 dark:text-white/40">Registration Date</span>
                <span className="text-[12px] font-semibold text-slate-700 dark:text-white/80">
                  {registrationDate}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-[12px] text-slate-500 dark:text-white/40">Account Role</span>
                <span className="text-[12px] font-semibold text-slate-700 capitalize dark:text-white/80">
                  {profile.role}
                </span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Action Row */}
      <div className="mt-8 flex items-center justify-end gap-4 pt-6 border-t border-slate-100 dark:border-white/5">
        <button
          onClick={onDiscard}
          disabled={!dirty}
          className="text-[13px] text-slate-500 hover:text-slate-900 font-semibold transition-colors disabled:opacity-40 dark:text-white/40 dark:hover:text-white"
        >
          Discard Changes
        </button>
        <button
          onClick={onSave}
          disabled={!dirty || saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#0C1526] text-white rounded-xl text-[13px] font-bold hover:bg-[#111d35] transition-all active:scale-95 disabled:opacity-50 shadow-md dark:bg-[#e9c349] dark:text-[#3c2f00] dark:hover:bg-[#f0d275] dark:shadow-none"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </>
  );
}

// ── 2FA Setup Flow ─────────────────────────────────────────────────────────────

type TwoFAStep = "idle" | "loading" | "setup" | "verifying" | "done";

function TwoFACard({
  enabled, onToggle,
}: {
  enabled: boolean;
  onToggle: (newState: boolean) => void;
}) {
  const addToast = useNotificationStore((s) => s.addToast);
  const [step, setStep] = useState<TwoFAStep>("idle");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [token, setToken] = useState("");
  const [disableToken, setDisableToken] = useState("");
  const [showDisable, setShowDisable] = useState(false);

  const handleEnable = async () => {
    setStep("loading");
    const res = await fetch("/api/profile/2fa/enable", { method: "POST" });
    const json = await res.json() as { secret?: string; qrDataUrl?: string; error?: string };
    if (!res.ok) {
      addToast({ title: "Error", description: json.error ?? "Failed to start 2FA setup", variant: "error" });
      setStep("idle");
      return;
    }
    setSecret(json.secret!);
    setQrDataUrl(json.qrDataUrl!);
    setStep("setup");
  };

  const handleVerify = async () => {
    if (token.length !== 6) {
      addToast({ title: "Error", description: "Enter the 6-digit code from your authenticator.", variant: "error" });
      return;
    }
    setStep("verifying");
    const res = await fetch("/api/profile/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, token }),
    });
    const json = await res.json() as { ok?: boolean; error?: string };
    if (!res.ok) {
      addToast({ title: "Invalid code", description: json.error ?? "Verification failed.", variant: "error" });
      setStep("setup");
      return;
    }
    setStep("done");
    onToggle(true);
    addToast({ title: "2FA Enabled", description: "Two-factor authentication is now active.", variant: "success" });
  };

  const handleDisable = async () => {
    const res = await fetch("/api/profile/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: disableToken }),
    });
    const json = await res.json() as { ok?: boolean; error?: string };
    if (!res.ok) {
      addToast({ title: "Invalid code", description: json.error ?? "Failed to disable 2FA.", variant: "error" });
      return;
    }
    setShowDisable(false);
    setDisableToken("");
    onToggle(false);
    addToast({ title: "2FA Disabled", description: "Two-factor authentication has been turned off.", variant: "error" });
  };

  const twoFaActive = enabled || step === "done";

  return (
    <SectionCard icon={<Shield className="size-4 text-[#D4AF37]" />} title="Two-Factor Auth">
      <p className="text-[12px] text-slate-500 mb-5 leading-relaxed dark:text-white/40">
        Add an extra layer of security. When enabled, you'll be prompted for a verification code on each login.
      </p>

      <div className={cn(
        "flex items-center justify-between p-4 rounded-xl border mb-4 transition-colors",
        twoFaActive
          ? "border-[#D4AF37]/30 bg-[#D4AF37]/5 dark:border-[#e9c349]/30 dark:bg-[#e9c349]/5"
          : "border-slate-100 bg-slate-50 dark:border-white/5 dark:bg-white/5"
      )}>
        <div>
          <p className="text-[13px] font-semibold text-slate-900 dark:text-white">Authenticator App</p>
          <p className="text-[11px] text-slate-400 dark:text-white/40">Google Authenticator or Authy</p>
        </div>
        {!twoFaActive ? (
          <button
            onClick={handleEnable}
            disabled={step === "loading"}
            className="px-3 py-1.5 bg-[#0C1526] text-white text-[12px] font-bold rounded-lg hover:bg-[#111d35] transition-all disabled:opacity-60 dark:bg-[#e9c349] dark:text-[#3c2f00] dark:hover:bg-[#f0d275]"
          >
            {step === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : "Enable"}
          </button>
        ) : (
          <button
            onClick={() => setShowDisable(!showDisable)}
            className="px-3 py-1.5 bg-red-50 text-red-600 text-[12px] font-bold rounded-lg hover:bg-red-100 transition-all dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
          >
            Disable
          </button>
        )}
      </div>

      {/* Setup: QR code + token entry */}
      {(step === "setup" || step === "verifying") && (
        <div className="border border-[#D4AF37]/30 rounded-xl p-4 space-y-4 bg-[#D4AF37]/3 dark:border-[#e9c349]/20 dark:bg-[#e9c349]/3">
          <div className="flex items-start gap-3">
            <QrCode className="size-4 text-[#D4AF37] shrink-0 mt-0.5 dark:text-[#e9c349]" />
            <p className="text-[12px] text-slate-600 leading-relaxed dark:text-white/60">
              Scan this QR code with <strong>Google Authenticator</strong> or <strong>Authy</strong>, then enter the 6-digit code below.
            </p>
          </div>
          {qrDataUrl && (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="2FA QR Code" className="w-40 h-40 rounded-xl border border-slate-200 dark:border-white/10" />
            </div>
          )}
          <div className="bg-slate-50 rounded-lg p-3 dark:bg-white/5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 dark:text-white/30">Manual entry key</p>
            <p className="text-[12px] font-mono text-slate-700 break-all dark:text-white/70 select-all">{secret}</p>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2 dark:text-white/40">
              Verification Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className={cn(inputCls(), "text-center tracking-[0.4em] text-lg font-bold")}
            />
          </div>
          <button
            onClick={handleVerify}
            disabled={step === "verifying" || token.length !== 6}
            className="w-full py-2.5 bg-[#0C1526] text-white rounded-xl text-[13px] font-bold hover:bg-[#111d35] transition-all flex items-center justify-center gap-2 disabled:opacity-60 dark:bg-[#e9c349] dark:text-[#3c2f00] dark:hover:bg-[#f0d275]"
          >
            {step === "verifying" ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-3.5" />}
            {step === "verifying" ? "Verifying…" : "Activate 2FA"}
          </button>
        </div>
      )}

      {/* Disable flow */}
      {showDisable && twoFaActive && (
        <div className="border border-red-200 rounded-xl p-4 space-y-3 bg-red-50 dark:border-red-500/20 dark:bg-red-500/5">
          <p className="text-[12px] text-slate-600 leading-relaxed dark:text-white/60">
            Enter your current 6-digit authenticator code to confirm disabling 2FA.
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={disableToken}
            onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className={cn(inputCls(), "text-center tracking-[0.4em] text-lg font-bold")}
          />
          <button
            onClick={handleDisable}
            disabled={disableToken.length !== 6}
            className="w-full py-2.5 bg-red-500 text-white rounded-xl text-[13px] font-bold hover:bg-red-600 transition-all disabled:opacity-60"
          >
            Confirm Disable 2FA
          </button>
        </div>
      )}

      {twoFaActive && !showDisable && (
        <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 dark:bg-emerald-500/10 dark:border-emerald-500/20">
          <CheckCheck className="size-4 text-emerald-600 shrink-0 dark:text-emerald-400" />
          <p className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-300">
            2FA is active — your account is protected.
          </p>
        </div>
      )}
    </SectionCard>
  );
}

// ── Tab: Security & 2FA ────────────────────────────────────────────────────────

function SecurityTab({ twoFaEnabled }: { twoFaEnabled: boolean }) {
  const addToast = useNotificationStore((s) => s.addToast);
  const [pw, setPw] = useState<PasswordForm>({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [twoFaActive, setTwoFaActive] = useState(twoFaEnabled);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    fetch("/api/profile/sessions")
      .then((r) => r.json())
      .then((j: { sessions?: ActiveSession[] }) => {
        setSessions(j.sessions ?? []);
      })
      .catch(() => setSessions([]))
      .finally(() => setLoadingSessions(false));
  }, []);

  const handleChangePw = async () => {
    if (!pw.current) {
      addToast({ title: "Error", description: "Enter your current password.", variant: "error" });
      return;
    }
    if (pw.next.length < 8) {
      addToast({ title: "Error", description: "New password must be at least 8 characters.", variant: "error" });
      return;
    }
    if (pw.next !== pw.confirm) {
      addToast({ title: "Error", description: "Passwords do not match.", variant: "error" });
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        addToast({ title: "Error", description: json.error ?? "Failed to update password.", variant: "error" });
      } else {
        setPw({ current: "", next: "", confirm: "" });
        addToast({ title: "Password updated", description: "Your password has been changed successfully.", variant: "success" });
      }
    } finally {
      setSavingPw(false);
    }
  };

  const handleRevoke = async (id: string) => {
    const res = await fetch(`/api/profile/sessions/${id}/revoke`, { method: "PATCH" });
    if (res.ok) {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      addToast({ title: "Session revoked", description: "That device has been signed out.", variant: "success" });
    } else {
      const j = await res.json() as { error?: string };
      addToast({ title: "Error", description: j.error ?? "Failed to revoke session.", variant: "error" });
    }
  };

  const strength =
    pw.next.length === 0 ? null
      : pw.next.length < 8 ? "Weak"
      : pw.next.length < 12 ? "Good"
      : "Strong";
  const strengthColor =
    strength === "Weak" ? "bg-red-400"
      : strength === "Good" ? "bg-amber-400"
      : "bg-emerald-500";

  const score = 50 + (twoFaActive ? 25 : 0) + 12 + 5;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-5 items-start">
      <div className="lg:col-span-6 space-y-5">
        {/* Change Password */}
        <SectionCard icon={<RefreshCw className="size-4 text-[#D4AF37]" />} title="Change Password">
          <div className="space-y-4">
            {(["current", "next", "confirm"] as const).map((key) => {
              const labels = {
                current: "Current Password",
                next: "New Password",
                confirm: "Confirm New Password",
              };
              return (
                <div key={key}>
                  <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2 dark:text-white/40">
                    {labels[key]}
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={pw[key]}
                      onChange={(e) => setPw({ ...pw, [key]: e.target.value })}
                      placeholder="••••••••"
                      className={cn(inputCls(), "pr-10")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors dark:text-white/30 dark:hover:text-white/60"
                    >
                      {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {key === "next" && strength && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 flex gap-1">
                        {[8, 12, 16].map((n) => (
                          <div
                            key={n}
                            className={cn(
                              "h-1 flex-1 rounded-full transition-colors",
                              pw.next.length >= n ? strengthColor : "bg-slate-200 dark:bg-white/10"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-white/30">{strength}</span>
                    </div>
                  )}
                </div>
              );
            })}
            <button
              onClick={handleChangePw}
              disabled={savingPw}
              className="w-full py-2.5 bg-[#0C1526] text-white rounded-xl text-[13px] font-bold hover:bg-[#111d35] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 mt-1 dark:bg-[#e9c349] dark:text-[#3c2f00] dark:hover:bg-[#f0d275]"
            >
              {savingPw ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-3.5" />}
              {savingPw ? "Updating…" : "Update Password"}
            </button>
          </div>
        </SectionCard>

        {/* Active Sessions */}
        <SectionCard icon={<Monitor className="size-4 text-[#D4AF37]" />} title="Active Sessions">
          {loadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-slate-300 dark:text-white/20" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-[13px] text-slate-400 text-center py-6 dark:text-white/30">
              No active sessions recorded yet.
            </p>
          ) : (
            <div className="space-y-1">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0 dark:border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center dark:bg-white/10">
                      {s.device_label.includes("iPhone") || s.device_label.includes("Android")
                        ? <Smartphone className="size-4 text-slate-500 dark:text-white/50" />
                        : <Monitor className="size-4 text-slate-500 dark:text-white/50" />}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-slate-900 dark:text-white">
                        {s.device_label}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-white/40">
                        {s.ip_address ? `${s.ip_address} · ` : ""}{timeAgo(s.last_active)}
                      </p>
                    </div>
                  </div>
                  {s.is_current ? (
                    <span className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-bold dark:bg-emerald-500/15 dark:text-emerald-300">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      Current
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRevoke(s.id)}
                      className="text-[12px] text-red-400 hover:text-red-600 font-semibold transition-colors dark:text-red-400/70 dark:hover:text-red-300"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Right: 2FA + Security Score */}
      <div className="lg:col-span-4 space-y-5">
        <TwoFACard enabled={twoFaActive} onToggle={setTwoFaActive} />

        {/* Security Score */}
        <div className="bg-[#0C1526] rounded-2xl border border-slate-800 p-6 dark:bg-[rgba(255,255,255,0.03)] dark:[backdrop-filter:blur(12px)] dark:border-[rgba(255,255,255,0.05)]">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 dark:text-white/40">
            Security Score
          </p>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-4xl font-extrabold text-[#D4AF37] dark:text-[#e9c349]">{score}</span>
            <span className="text-slate-500 text-sm mb-1 dark:text-white/30">/ 100</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mb-5 dark:bg-white/10">
            <div
              className="bg-[#D4AF37] h-1.5 rounded-full transition-all duration-700 dark:bg-[#e9c349]"
              style={{ width: `${score}%` }}
            />
          </div>
          <ul className="space-y-2.5">
            {[
              { label: "Strong password", done: true },
              { label: "Email verified", done: true },
              { label: "Two-factor authentication", done: twoFaActive },
              { label: "Recovery email set", done: false },
            ].map((item) => (
              <li key={item.label} className="flex items-center gap-2.5">
                {item.done
                  ? <CheckCircle2 className="size-3.5 text-[#D4AF37] shrink-0 dark:text-[#e9c349]" />
                  : <Circle className="size-3.5 text-slate-700 shrink-0 dark:text-white/20" />}
                <span className={cn("text-[12px]", item.done ? "text-slate-300 dark:text-white/70" : "text-slate-600 dark:text-white/30")}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Bank Accounts ─────────────────────────────────────────────────────────

function BankAccountsTab() {
  const addToast = useNotificationStore((s) => s.addToast);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newBank, setNewBank] = useState({
    bankName: "", accountHolder: "", accountNumber: "", swiftCode: "",
  });
  const [saving, setSaving] = useState(false);

  const loadBanks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/withdraw/banks");
      const json = await res.json() as { banks?: RawBankAccount[] };
      setBanks((json.banks ?? []).map((b) => ({
        id: b.id,
        bankName: b.bank_name,
        accountHolder: b.account_holder,
        accountNumber: b.account_number,
        swiftCode: b.swift_code ?? "",
        isPrimary: b.is_primary,
      })));
    } catch {
      setBanks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBanks(); }, [loadBanks]);

  const handleAdd = async () => {
    if (!newBank.bankName || !newBank.accountNumber || !newBank.accountHolder) {
      addToast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "error" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/withdraw/banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_name: newBank.bankName,
          account_holder: newBank.accountHolder,
          account_number: newBank.accountNumber,
          swift_code: newBank.swiftCode,
        }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        addToast({ title: "Error", description: json.error ?? "Failed to save bank account.", variant: "error" });
      } else {
        setNewBank({ bankName: "", accountHolder: "", accountNumber: "", swiftCode: "" });
        setShowForm(false);
        await loadBanks();
        addToast({ title: "Bank account added", description: "Your withdrawal bank account has been saved.", variant: "success" });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimary = async (id: string) => {
    const res = await fetch(`/api/withdraw/banks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_primary: true }),
    });
    if (res.ok) {
      await loadBanks();
      addToast({ title: "Primary account updated", description: "Withdrawals will now use this account.", variant: "success" });
    }
  };

  const handleRemove = async (id: string) => {
    const res = await fetch(`/api/withdraw/banks/${id}`, { method: "DELETE" });
    if (res.ok) {
      setBanks((prev) => prev.filter((b) => b.id !== id));
      addToast({ title: "Bank account removed", description: "The account has been deleted.", variant: "success" });
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-bold text-slate-900 uppercase tracking-wider dark:text-white">
            Withdrawal Bank Accounts
          </h3>
          <p className="text-[12px] text-slate-400 mt-0.5 dark:text-white/40">
            Accounts used to receive your withdrawal payouts.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0C1526] text-white rounded-xl text-[13px] font-bold hover:bg-[#111d35] transition-all active:scale-95 dark:bg-[#e9c349] dark:text-[#3c2f00] dark:hover:bg-[#f0d275]"
        >
          {showForm ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
          {showForm ? "Cancel" : "Add Account"}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-[#D4AF37]/30 shadow-sm p-6 space-y-4 dark:bg-[rgba(255,255,255,0.03)] dark:[backdrop-filter:blur(12px)] dark:border-[#e9c349]/30 dark:shadow-none">
          <p className="text-[13px] font-bold text-slate-900 dark:text-white">New Bank Account</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: "bankName", label: "Bank Name", placeholder: "e.g. Commercial Bank of Ethiopia" },
              { key: "accountHolder", label: "Account Holder Name", placeholder: "Full legal name" },
              { key: "accountNumber", label: "Account Number", placeholder: "e.g. 1000 5497 1250 2" },
              { key: "swiftCode", label: "SWIFT / BIC Code (optional)", placeholder: "e.g. CBETETAA" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2 dark:text-white/40">
                  {label}
                </label>
                <input
                  type="text"
                  value={(newBank as Record<string, string>)[key]}
                  onChange={(e) => setNewBank({ ...newBank, [key]: e.target.value })}
                  placeholder={placeholder}
                  className={inputCls()}
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleAdd}
            disabled={saving}
            className="w-full py-2.5 bg-[#D4AF37] text-[#0C1526] rounded-xl text-[13px] font-bold hover:bg-[#c9a030] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 dark:bg-[#e9c349] dark:hover:bg-[#f0d275]"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-3.5" />}
            {saving ? "Saving…" : "Save Bank Account"}
          </button>
        </div>
      )}

      {/* Bank list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-slate-300 dark:text-white/20" />
        </div>
      ) : (
        <div className="space-y-3">
          {banks.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm dark:bg-[rgba(255,255,255,0.03)] dark:border-[rgba(255,255,255,0.05)] dark:text-white/40">
              No bank accounts added yet.
            </div>
          ) : (
            banks.map((bank) => (
              <div
                key={bank.id}
                className={cn(
                  "bg-white rounded-2xl border shadow-sm flex items-start justify-between gap-4 p-5 dark:bg-[rgba(255,255,255,0.03)] dark:[backdrop-filter:blur(12px)] dark:shadow-none",
                  bank.isPrimary
                    ? "border-[#D4AF37]/40 ring-1 ring-[#D4AF37]/20 dark:border-[#e9c349]/40 dark:ring-[#e9c349]/20"
                    : "border-slate-200 dark:border-[rgba(255,255,255,0.05)]"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#0C1526] rounded-xl flex items-center justify-center shrink-0 dark:bg-white/10 dark:border dark:border-white/10">
                    <Landmark className="size-4 text-[#D4AF37] dark:text-[#e9c349]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[13px] font-bold text-slate-900 dark:text-white">{bank.bankName}</p>
                      {bank.isPrimary && (
                        <span className="text-[10px] bg-[#D4AF37]/15 text-[#9a7c3f] px-2 py-0.5 rounded-lg font-bold uppercase tracking-wide dark:bg-[#e9c349]/15 dark:text-[#e9c349]">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-white/40">{bank.accountHolder}</p>
                    <p className="text-[13px] font-semibold text-slate-800 mt-1 dark:text-white/80">
                      {bank.accountNumber}
                    </p>
                    {bank.swiftCode && (
                      <p className="text-[11px] text-slate-400 dark:text-white/40">SWIFT: {bank.swiftCode}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0 items-end">
                  {!bank.isPrimary && (
                    <button
                      onClick={() => handleSetPrimary(bank.id)}
                      className="text-[12px] text-slate-500 hover:text-[#9a7c3f] font-semibold transition-colors whitespace-nowrap dark:text-white/40 dark:hover:text-[#e9c349]"
                    >
                      Set Primary
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(bank.id)}
                    className="text-[12px] text-red-400 hover:text-red-600 font-semibold transition-colors dark:text-red-400/70 dark:hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 dark:bg-blue-500/10 dark:border-blue-500/20">
        <Info className="size-4 text-blue-500 mt-0.5 shrink-0 dark:text-blue-400" />
        <p className="text-[12px] text-slate-700 leading-relaxed dark:text-blue-200/80">
          Bank account changes are subject to a <strong>48-hour security hold</strong> before becoming active for withdrawals. Contact your account manager if you need expedited processing.
        </p>
      </div>
    </div>
  );
}

// ── Root Page ──────────────────────────────────────────────────────────────────

const PAGE_TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "personal", label: "Personal Profile", icon: <User className="size-3.5" /> },
  { id: "security", label: "Security & 2FA", icon: <Shield className="size-3.5" /> },
  { id: "banks", label: "Bank Accounts", icon: <Landmark className="size-3.5" /> },
];

export function ProfilePage() {
  const addToast = useNotificationStore((s) => s.addToast);
  const [activeTab, setActiveTab] = useState<Tab>("personal");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [form, setForm] = useState<PersonalForm>({
    fullName: "", phone: "", country: "", address: "",
  });
  const [saved, setSaved] = useState<PersonalForm>({
    fullName: "", phone: "", country: "", address: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((j: { profile?: Profile }) => {
        if (j.profile) {
          setProfile(j.profile);
          const initial: PersonalForm = {
            fullName: j.profile.fullName,
            phone: j.profile.phone,
            country: j.profile.country,
            address: j.profile.address,
          };
          setForm(initial);
          setSaved(initial);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, []);

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) {
        addToast({ title: "Error", description: json.error ?? "Failed to save profile.", variant: "error" });
      } else {
        setSaved(form);
        if (profile) setProfile({ ...profile, ...form });
        addToast({ title: "Profile saved", description: "Your personal information has been updated.", variant: "success" });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
    const json = await res.json() as { avatarPath?: string; error?: string };
    if (!res.ok) {
      addToast({ title: "Upload failed", description: json.error ?? "Could not upload image.", variant: "error" });
    } else {
      if (profile) setProfile({ ...profile, avatarPath: json.avatarPath ?? null });
      addToast({ title: "Photo updated", description: "Your profile photo has been saved.", variant: "success" });
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-slate-300 dark:text-white/20" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-slate-400 dark:text-white/30">Could not load profile.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 dark:bg-transparent">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1 dark:text-white">
            Profile Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-white/40">
            Manage your personal credentials, authentication, and withdrawal bank accounts.
          </p>
        </div>

        {/* Tab Nav */}
        <div className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-slate-200 mb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:border-white/10">
          {PAGE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 shrink-0 whitespace-nowrap text-[13px] font-semibold px-4 py-3 border-b-2 transition-all",
                activeTab === tab.id
                  ? "border-[#D4AF37] text-slate-900 dark:border-[#e9c349] dark:text-[#e9c349]"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-white/40 dark:hover:text-white/70"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "personal" && (
          <PersonalTab
            profile={profile}
            form={form}
            setForm={setForm}
            dirty={dirty}
            onSave={handleSave}
            onDiscard={() => setForm(saved)}
            saving={saving}
            onAvatarUpload={handleAvatarUpload}
          />
        )}
        {activeTab === "security" && <SecurityTab twoFaEnabled={profile.twoFaEnabled} />}
        {activeTab === "banks" && <BankAccountsTab />}

        {/* Footer */}
        <footer className="mt-10 py-6 text-center border-t border-slate-100 dark:border-white/5">
          <p className="text-[11px] text-slate-400 dark:text-white/30">
            © 2024 Aurum Sovereign Capital · All data encrypted via 256-bit Institutional Security Protocols.
          </p>
        </footer>
      </div>
    </div>
  );
}
