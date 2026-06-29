"use client";

import { useRef, useState } from "react";
import {
  User, Mail, Phone, MapPin, Globe, Lock, RefreshCw, Shield,
  Smartphone, Monitor, CheckCircle2, Circle, Landmark, Plus, X,
  Save, Camera, Eye, EyeOff, Info, Loader2, CheckCheck,
} from "lucide-react";
import { useNotificationStore } from "@/src/store/notification.store";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab = "personal" | "security" | "banks";

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

// ── Helpers ────────────────────────────────────────────────────────────────────

const COUNTRIES = ["Ethiopia", "United States", "United Kingdom", "Germany", "UAE", "Switzerland", "Canada", "Australia"];

const INITIAL_PERSONAL: PersonalForm = {
  fullName: "Abebe Kebede",
  phone: "912 345 678",
  country: "Ethiopia",
  address: "Bole Sub City, Road 04, House 112",
};

const INITIAL_BANKS: BankAccount[] = [
  {
    id: "1",
    bankName: "Commercial Bank of Ethiopia",
    accountHolder: "Abebe Kebede",
    accountNumber: "1000 5497 1250 2",
    swiftCode: "CBETETAA",
    isPrimary: true,
  },
];

// ── Shared field wrapper ───────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</label>
      <div className="relative">{children}</div>
    </div>
  );
}

function inputCls(readOnly = false) {
  return cn(
    "w-full h-11 px-4 rounded-xl border text-[13px] text-slate-900 outline-none transition-all",
    readOnly
      ? "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
      : "bg-white border-slate-200 hover:border-slate-300 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15"
  );
}

// ── Section card ───────────────────────────────────────────────────────────────

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-xl bg-[#0C1526] flex items-center justify-center shrink-0">
          {icon}
        </div>
        <h3 className="text-[13px] font-bold text-slate-900 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ── Tab: Personal Profile ─────────────────────────────────────────────────────

function PersonalTab({
  form, setForm, avatarUrl, onAvatarChange, dirty, onSave, onDiscard, saving,
}: {
  form: PersonalForm; setForm: (f: PersonalForm) => void;
  avatarUrl: string; onAvatarChange: (url: string) => void;
  dirty: boolean; onSave: () => void; onDiscard: () => void; saving: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    onAvatarChange(URL.createObjectURL(f));
  };

  const set = (key: keyof PersonalForm) => (val: string) => setForm({ ...form, [key]: val });

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
                    value="abebe.k@institutional.com"
                    readOnly
                    className={cn(inputCls(true), "pr-10")}
                  />
                  <Lock className="absolute right-3 top-3 size-4 text-slate-300 pointer-events-none" />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Phone Number">
                  <div className="absolute left-3 flex items-center gap-2 border-r border-slate-200 pr-3 h-full top-0 z-10">
                    <span className="text-base">🇪🇹</span>
                    <span className="text-[12px] font-semibold text-slate-700">+251</span>
                  </div>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => set("phone")(e.target.value)}
                    className={cn(inputCls(), "pl-24")}
                  />
                </Field>
                <Field label="Country">
                  <select
                    value={form.country}
                    onChange={(e) => set("country")(e.target.value)}
                    className={cn(inputCls(), "appearance-none pr-10")}
                  >
                    {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <Globe className="absolute right-3 top-3 size-4 text-slate-400 pointer-events-none" />
                </Field>
              </div>

              <Field label="Street Address">
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => set("address")(e.target.value)}
                  className={inputCls()}
                />
              </Field>
            </div>
          </SectionCard>
        </div>

        {/* Right: Photo + Status */}
        <div className="lg:col-span-4 space-y-5">
          {/* Profile Photo */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center text-center">
            <div className="relative mb-4">
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-24 h-24 rounded-2xl border-2 border-white shadow-lg object-cover ring-1 ring-slate-200"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-[#D4AF37] rounded-xl flex items-center justify-center border-2 border-white shadow-md hover:bg-[#c9a030] transition-colors"
              >
                <Camera className="size-3.5 text-[#0C1526]" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleAvatarFile} />
            </div>
            <p className="text-[13px] font-bold text-slate-900 mb-0.5">Profile Photo</p>
            <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">800×800px · JPG or PNG · max 2MB</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full py-2.5 px-5 bg-[#0C1526] text-white text-[13px] font-bold rounded-xl hover:bg-[#111d35] transition-all active:scale-95"
            >
              Upload New Image
            </button>
          </div>

          {/* Account Status */}
          <SectionCard icon={<Shield className="size-4 text-[#D4AF37]" />} title="Account Status">
            <div className="space-y-3">
              {[
                { label: "Verification Tier", value: null, badge: { text: "Fully Verified", color: "bg-emerald-50 text-emerald-700" } },
                { label: "Registration Date", value: "Jan 12, 2024", badge: null },
                { label: "Tier Limits", value: "No Limit (Platinum)", badge: null },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                  <span className="text-[12px] text-slate-500">{row.label}</span>
                  {row.badge ? (
                    <span className={cn("flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold", row.badge.color)}>
                      <CheckCircle2 className="size-3" />
                      {row.badge.text}
                    </span>
                  ) : (
                    <span className="text-[12px] font-semibold text-slate-700">{row.value}</span>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Action Row */}
      <div className="mt-8 flex items-center justify-end gap-4 pt-6 border-t border-slate-100">
        <button
          onClick={onDiscard}
          disabled={!dirty}
          className="text-[13px] text-slate-500 hover:text-slate-900 font-semibold transition-colors disabled:opacity-40"
        >
          Discard Changes
        </button>
        <button
          onClick={onSave}
          disabled={!dirty || saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#0C1526] text-white rounded-xl text-[13px] font-bold hover:bg-[#111d35] transition-all active:scale-95 disabled:opacity-50 shadow-md"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </>
  );
}

// ── Tab: Security & 2FA ────────────────────────────────────────────────────────

function SecurityTab() {
  const addToast = useNotificationStore((s) => s.addToast);
  const [pw, setPw] = useState<PasswordForm>({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const sessions = [
    { device: "Chrome on Windows", location: "Addis Ababa, ET", time: "Active now", current: true },
    { device: "Safari on iPhone", location: "Addis Ababa, ET", time: "2 hours ago", current: false },
    { device: "Firefox on MacOS", location: "Addis Ababa, ET", time: "3 days ago", current: false },
  ];

  const handleChangePw = () => {
    if (!pw.current) { addToast({ title: "Error", description: "Enter your current password.", variant: "error" }); return; }
    if (pw.next.length < 8) { addToast({ title: "Error", description: "New password must be at least 8 characters.", variant: "error" }); return; }
    if (pw.next !== pw.confirm) { addToast({ title: "Error", description: "Passwords do not match.", variant: "error" }); return; }
    setSavingPw(true);
    setTimeout(() => {
      setSavingPw(false);
      setPw({ current: "", next: "", confirm: "" });
      addToast({ title: "Password updated", description: "Your password has been changed successfully.", variant: "success" });
    }, 1200);
  };

  const strength = pw.next.length === 0 ? null : pw.next.length < 8 ? "Weak" : pw.next.length < 12 ? "Good" : "Strong";
  const strengthColor = strength === "Weak" ? "bg-red-400" : strength === "Good" ? "bg-amber-400" : "bg-emerald-500";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-5 items-start">
      <div className="lg:col-span-6 space-y-5">
        {/* Change Password */}
        <SectionCard icon={<RefreshCw className="size-4 text-[#D4AF37]" />} title="Change Password">
          <div className="space-y-4">
            {(["current", "next", "confirm"] as const).map((key) => {
              const labels = { current: "Current Password", next: "New Password", confirm: "Confirm New Password" };
              return (
                <div key={key}>
                  <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">{labels[key]}</label>
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
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {key === "next" && strength && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 flex gap-1">
                        {[8, 12, 16].map((n) => (
                          <div key={n} className={cn("h-1 flex-1 rounded-full transition-colors", pw.next.length >= n ? strengthColor : "bg-slate-200")} />
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{strength}</span>
                    </div>
                  )}
                </div>
              );
            })}
            <button
              onClick={handleChangePw}
              disabled={savingPw}
              className="w-full py-2.5 bg-[#0C1526] text-white rounded-xl text-[13px] font-bold hover:bg-[#111d35] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 mt-1"
            >
              {savingPw ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-3.5" />}
              {savingPw ? "Updating…" : "Update Password"}
            </button>
          </div>
        </SectionCard>

        {/* Active Sessions */}
        <SectionCard icon={<Monitor className="size-4 text-[#D4AF37]" />} title="Active Sessions">
          <div className="space-y-1">
            {sessions.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
                    {s.device.includes("iPhone")
                      ? <Smartphone className="size-4 text-slate-500" />
                      : <Monitor className="size-4 text-slate-500" />}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">{s.device}</p>
                    <p className="text-[11px] text-slate-400">{s.location} · {s.time}</p>
                  </div>
                </div>
                {s.current ? (
                  <span className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-bold">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Current
                  </span>
                ) : (
                  <button
                    onClick={() => addToast({ title: "Session revoked", description: `${s.device} has been signed out.`, variant: "success" })}
                    className="text-[12px] text-red-400 hover:text-red-600 font-semibold transition-colors"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Right: 2FA + Security Score */}
      <div className="lg:col-span-4 space-y-5">
        {/* 2FA */}
        <SectionCard icon={<Shield className="size-4 text-[#D4AF37]" />} title="Two-Factor Auth">
          <p className="text-[12px] text-slate-500 mb-5 leading-relaxed">
            Add an extra layer of security. When enabled, you'll be prompted for a verification code on each login.
          </p>
          <div className={cn(
            "flex items-center justify-between p-4 rounded-xl border mb-4 transition-colors",
            twoFA ? "border-[#D4AF37]/30 bg-[#D4AF37]/5" : "border-slate-100 bg-slate-50"
          )}>
            <div>
              <p className="text-[13px] font-semibold text-slate-900">Authenticator App</p>
              <p className="text-[11px] text-slate-400">Google Authenticator or Authy</p>
            </div>
            <button
              onClick={() => {
                setTwoFA(!twoFA);
                addToast({
                  title: !twoFA ? "2FA Enabled" : "2FA Disabled",
                  description: !twoFA ? "Two-factor authentication is now active." : "Two-factor authentication has been turned off.",
                  variant: !twoFA ? "success" : "error",
                });
              }}
              className={cn("relative w-11 h-6 rounded-full transition-colors", twoFA ? "bg-[#D4AF37]" : "bg-slate-300")}
            >
              <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", twoFA ? "translate-x-5" : "")} />
            </button>
          </div>
          {twoFA && (
            <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-100 rounded-xl p-3.5">
              <CheckCheck className="size-4 text-emerald-600 shrink-0" />
              <p className="text-[12px] font-semibold text-emerald-700">2FA is active — your account is protected.</p>
            </div>
          )}
        </SectionCard>

        {/* Security Score */}
        <div className="bg-[#0C1526] rounded-2xl border border-slate-800 p-6">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Security Score</p>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-4xl font-extrabold text-[#D4AF37]">{twoFA ? 92 : 74}</span>
            <span className="text-slate-500 text-sm mb-1">/ 100</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mb-5">
            <div
              className="bg-[#D4AF37] h-1.5 rounded-full transition-all duration-700"
              style={{ width: `${twoFA ? 92 : 74}%` }}
            />
          </div>
          <ul className="space-y-2.5">
            {[
              { label: "Strong password", done: true },
              { label: "Email verified", done: true },
              { label: "Two-factor authentication", done: twoFA },
              { label: "Recovery email set", done: false },
            ].map((item) => (
              <li key={item.label} className="flex items-center gap-2.5">
                {item.done
                  ? <CheckCircle2 className="size-3.5 text-[#D4AF37] shrink-0" />
                  : <Circle className="size-3.5 text-slate-700 shrink-0" />}
                <span className={cn("text-[12px]", item.done ? "text-slate-300" : "text-slate-600")}>{item.label}</span>
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
  const [banks, setBanks] = useState<BankAccount[]>(INITIAL_BANKS);
  const [showForm, setShowForm] = useState(false);
  const [newBank, setNewBank] = useState({ bankName: "", accountHolder: "", accountNumber: "", swiftCode: "" });
  const [saving, setSaving] = useState(false);

  const handleAdd = () => {
    if (!newBank.bankName || !newBank.accountNumber || !newBank.accountHolder) {
      addToast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "error" });
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setBanks((prev) => [...prev, { id: String(Date.now()), ...newBank, isPrimary: false }]);
      setNewBank({ bankName: "", accountHolder: "", accountNumber: "", swiftCode: "" });
      setShowForm(false);
      setSaving(false);
      addToast({ title: "Bank account added", description: "Your withdrawal bank account has been saved.", variant: "success" });
    }, 1000);
  };

  const handleSetPrimary = (id: string) => {
    setBanks((prev) => prev.map((b) => ({ ...b, isPrimary: b.id === id })));
    addToast({ title: "Primary account updated", description: "Withdrawals will now use this account.", variant: "success" });
  };

  const handleRemove = (id: string) => {
    setBanks((prev) => prev.filter((b) => b.id !== id));
    addToast({ title: "Bank account removed", description: "The account has been deleted.", variant: "success" });
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-bold text-slate-900 uppercase tracking-wider">Withdrawal Bank Accounts</h3>
          <p className="text-[12px] text-slate-400 mt-0.5">Accounts used to receive your withdrawal payouts.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0C1526] text-white rounded-xl text-[13px] font-bold hover:bg-[#111d35] transition-all active:scale-95"
        >
          {showForm ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
          {showForm ? "Cancel" : "Add Account"}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-[#D4AF37]/30 shadow-sm p-6 space-y-4">
          <p className="text-[13px] font-bold text-slate-900">New Bank Account</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: "bankName", label: "Bank Name", placeholder: "e.g. Commercial Bank of Ethiopia" },
              { key: "accountHolder", label: "Account Holder Name", placeholder: "Full legal name" },
              { key: "accountNumber", label: "Account Number", placeholder: "e.g. 1000 5497 1250 2" },
              { key: "swiftCode", label: "SWIFT / BIC Code (optional)", placeholder: "e.g. CBETETAA" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</label>
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
            className="w-full py-2.5 bg-[#D4AF37] text-[#0C1526] rounded-xl text-[13px] font-bold hover:bg-[#c9a030] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-3.5" />}
            {saving ? "Saving…" : "Save Bank Account"}
          </button>
        </div>
      )}

      {/* Bank list */}
      <div className="space-y-3">
        {banks.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">
            No bank accounts added yet.
          </div>
        ) : (
          banks.map((bank) => (
            <div
              key={bank.id}
              className={cn(
                "bg-white rounded-2xl border shadow-sm flex items-start justify-between gap-4 p-5",
                bank.isPrimary ? "border-[#D4AF37]/40 ring-1 ring-[#D4AF37]/20" : "border-slate-200"
              )}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#0C1526] rounded-xl flex items-center justify-center shrink-0">
                  <Landmark className="size-4 text-[#D4AF37]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[13px] font-bold text-slate-900">{bank.bankName}</p>
                    {bank.isPrimary && (
                      <span className="text-[10px] bg-[#D4AF37]/15 text-[#9a7c3f] px-2 py-0.5 rounded-lg font-bold uppercase tracking-wide">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">{bank.accountHolder}</p>
                  <p className="text-[13px] font-semibold text-slate-800 mt-1">{bank.accountNumber}</p>
                  {bank.swiftCode && <p className="text-[11px] text-slate-400">SWIFT: {bank.swiftCode}</p>}
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0 items-end">
                {!bank.isPrimary && (
                  <button
                    onClick={() => handleSetPrimary(bank.id)}
                    className="text-[12px] text-slate-500 hover:text-[#9a7c3f] font-semibold transition-colors whitespace-nowrap"
                  >
                    Set Primary
                  </button>
                )}
                <button
                  onClick={() => handleRemove(bank.id)}
                  className="text-[12px] text-red-400 hover:text-red-600 font-semibold transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Notice */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <Info className="size-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-[12px] text-slate-700 leading-relaxed">
          Bank account changes are subject to a <strong>48-hour security hold</strong> before becoming active for withdrawals. Contact your account manager if you need expedited processing.
        </p>
      </div>
    </div>
  );
}

// ── Root Page ──────────────────────────────────────────────────────────────────

const PROFILE_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB-Q0K9GPv_3i-CPnUwOXzgbjJf54-tRHNitcn28pyXGLEl6lhqRqZZm3nojVnMQ-pcutzZbx4m2kEPeDWSJpxliLT09MO9Mj1WgSXNgl2mFMvvorm8_SDGlq2UzdUwVWHyFPdUsBp7GmechptR8YXgTQX3mK3FhAQHc9dw4eav8DaCH9uYG9YQIU14o5QKUakPubRhWiRB4PbQn3lfrQX58uAvUcsJWAdtrinMtJ8wXwPNeaXTOQhCV-cnKMDnCTqhZHE9GhKusdY";

const PAGE_TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "personal", label: "Personal Profile", icon: <User className="size-3.5" /> },
  { id: "security", label: "Security & 2FA", icon: <Shield className="size-3.5" /> },
  { id: "banks", label: "Bank Accounts", icon: <Landmark className="size-3.5" /> },
];

export function ProfilePage() {
  const addToast = useNotificationStore((s) => s.addToast);
  const [activeTab, setActiveTab] = useState<Tab>("personal");
  const [form, setForm] = useState<PersonalForm>(INITIAL_PERSONAL);
  const [saved, setSaved] = useState<PersonalForm>(INITIAL_PERSONAL);
  const [avatarUrl, setAvatarUrl] = useState(PROFILE_AVATAR);
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaved(form);
      setSaving(false);
      addToast({ title: "Profile saved", description: "Your personal information has been updated.", variant: "success" });
    }, 1000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">Profile Settings</h1>
          <p className="text-sm text-slate-500">
            Manage your personal credentials, authentication, and withdrawal bank accounts.
          </p>
        </div>

        {/* Tab Nav */}
        <div className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-slate-200 mb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PAGE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 shrink-0 whitespace-nowrap text-[13px] font-semibold px-4 py-3 border-b-2 transition-all",
                activeTab === tab.id
                  ? "border-[#D4AF37] text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
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
            form={form}
            setForm={setForm}
            avatarUrl={avatarUrl}
            onAvatarChange={setAvatarUrl}
            dirty={dirty}
            onSave={handleSave}
            onDiscard={() => setForm(saved)}
            saving={saving}
          />
        )}
        {activeTab === "security" && <SecurityTab />}
        {activeTab === "banks" && <BankAccountsTab />}

        {/* Footer */}
        <footer className="mt-10 py-6 text-center border-t border-slate-100">
          <p className="text-[11px] text-slate-400">
            © 2024 Aurum Sovereign Capital · All data encrypted via 256-bit Institutional Security Protocols.
          </p>
        </footer>
      </div>
    </div>
  );
}
