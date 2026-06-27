"use client";

import { useRef, useState } from "react";
import { useNotificationStore } from "@/src/store/notification.store";

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

// ── Shared Input component ────────────────────────────────────────────────────

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[14px] font-semibold text-[#050B14] mb-2 tracking-[0.01em]">{label}</label>
      <div className="relative">{children}</div>
    </div>
  );
}

function TextInput({
  value,
  onChange,
  readOnly,
  type = "text",
  placeholder,
  icon,
  className = "",
}: {
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  type?: string;
  placeholder?: string;
  icon?: string;
  className?: string;
}) {
  return (
    <>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className={`w-full h-12 px-4 rounded-xl border border-slate-200 text-base text-[#050B14] outline-none transition-all focus:ring-2 focus:ring-[#e9c349] focus:border-transparent ${
          readOnly ? "bg-slate-50 text-[#64748B] cursor-not-allowed" : "bg-white hover:border-slate-300"
        } ${icon ? "pr-10" : ""} ${className}`}
      />
      {icon && (
        <span className="material-symbols-outlined absolute right-3 top-3 text-slate-400 text-[18px] pointer-events-none">
          {icon}
        </span>
      )}
    </>
  );
}

// ── Tab: Personal Profile ─────────────────────────────────────────────────────

function PersonalTab({
  form,
  setForm,
  avatarUrl,
  onAvatarChange,
  dirty,
  onSave,
  onDiscard,
  saving,
}: {
  form: PersonalForm;
  setForm: (f: PersonalForm) => void;
  avatarUrl: string;
  onAvatarChange: (url: string) => void;
  dirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
  saving: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    onAvatarChange(url);
  };

  const set = (key: keyof PersonalForm) => (val: string) =>
    setForm({ ...form, [key]: val });

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
        {/* Left: Personal Information */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-[14px] font-semibold text-[#050B14] mb-6 uppercase tracking-wider">
              Personal Information
            </h3>
            <div className="space-y-5">
              {/* Full Name + Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Full Name">
                  <TextInput value={form.fullName} onChange={set("fullName")} icon="edit" />
                </Field>
                <Field label="Email Address">
                  <TextInput
                    value="abebe.k@institutional.com"
                    readOnly
                    type="email"
                    icon="lock"
                  />
                </Field>
              </div>

              {/* Phone + Country */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Phone Number">
                  <div className="absolute left-3 flex items-center gap-2 border-r border-slate-200 pr-2 h-full top-0 z-10">
                    <span className="text-xl">🇪🇹</span>
                    <span className="text-sm font-medium text-[#050B14]">+251</span>
                  </div>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => set("phone")(e.target.value)}
                    className="w-full h-12 pl-24 pr-10 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#e9c349] outline-none text-base text-[#050B14] hover:border-slate-300 transition-all"
                  />
                  <span className="material-symbols-outlined absolute right-3 top-3 text-slate-400 text-[18px]">edit</span>
                </Field>
                <Field label="Country">
                  <select
                    value={form.country}
                    onChange={(e) => set("country")(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#e9c349] outline-none appearance-none text-base text-[#050B14] bg-white hover:border-slate-300 transition-all"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3 text-slate-400 pointer-events-none text-[18px]">
                    expand_more
                  </span>
                </Field>
              </div>

              {/* Address */}
              <Field label="Street Address">
                <TextInput value={form.address} onChange={set("address")} icon="edit" />
              </Field>
            </div>
          </div>
        </div>

        {/* Right: Photo + Status */}
        <div className="lg:col-span-4 space-y-6">
          {/* Profile Photo */}
          <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
            <div className="relative mb-6">
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-1 right-1 w-8 h-8 bg-[#e9c349] rounded-full flex items-center justify-center border-2 border-white shadow-md hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-[#050B14] text-sm">photo_camera</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleAvatarFile} />
            </div>
            <h4 className="text-[14px] font-semibold text-[#050B14] mb-2">Profile Photo</h4>
            <p className="text-[12px] text-[#64748B] mb-6 leading-relaxed">
              Recommended size: 800x800px
              <br />
              JPG or PNG, max 2MB
            </p>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full py-3 px-6 bg-[#e9c349] text-[#050B14] rounded-xl font-bold text-[14px] hover:opacity-90 transition-all active:scale-95"
            >
              Upload New Image
            </button>
          </div>

          {/* Account Status */}
          <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-[14px] font-semibold text-[#050B14] mb-6 uppercase tracking-wider">
              Account Status
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-[14px] text-[#64748B]">Verification Tier</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full font-bold text-[12px]">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified
                  </span>
                  Fully Verified
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-[14px] text-[#64748B]">Registration Date</span>
                <span className="text-[14px] font-semibold text-[#050B14]">Jan 12, 2024</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-[14px] text-[#64748B]">Tier Limits</span>
                <span className="text-[14px] text-[#c0c7d4] font-bold">No Limit (Platinum)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Row */}
      <div className="mt-12 flex items-center justify-end gap-6 pt-8 border-t border-slate-200">
        <button
          onClick={onDiscard}
          disabled={!dirty}
          className="text-[14px] text-[#64748B] hover:text-[#050B14] transition-colors font-semibold disabled:opacity-40"
        >
          Discard Changes
        </button>
        <button
          onClick={onSave}
          disabled={!dirty || saving}
          className="px-10 py-4 bg-[#050B14] text-white rounded-xl font-bold text-[14px] shadow-xl hover:shadow-2xl transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Saving…
            </>
          ) : (
            <>
              Save Changes
              <span className="material-symbols-outlined text-sm">check_circle</span>
            </>
          )}
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
      <div className="lg:col-span-6 space-y-6">
        {/* Change Password */}
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-[#050B14] rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-[#e9c349] text-[18px]">lock_reset</span>
            </div>
            <h3 className="text-[14px] font-semibold text-[#050B14] uppercase tracking-wider">Change Password</h3>
          </div>
          <div className="space-y-4">
            {(["current", "next", "confirm"] as const).map((key) => {
              const labels: Record<typeof key, string> = {
                current: "Current Password",
                next: "New Password",
                confirm: "Confirm New Password",
              };
              return (
                <div key={key}>
                  <label className="block text-[14px] font-semibold text-[#050B14] mb-2">{labels[key]}</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={pw[key]}
                      onChange={(e) => setPw({ ...pw, [key]: e.target.value })}
                      placeholder="••••••••"
                      className="w-full h-12 px-4 pr-10 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#e9c349] outline-none text-base text-[#050B14] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      <span className="material-symbols-outlined text-[18px]">{showPw ? "visibility_off" : "visibility"}</span>
                    </button>
                  </div>
                  {key === "next" && pw.next.length > 0 && (
                    <div className="mt-2 flex gap-1">
                      {[8, 12, 16].map((n) => (
                        <div
                          key={n}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            pw.next.length >= n ? "bg-[#e9c349]" : "bg-slate-200"
                          }`}
                        />
                      ))}
                      <span className="text-[10px] text-[#64748B] ml-2 self-center">
                        {pw.next.length < 8 ? "Weak" : pw.next.length < 12 ? "Good" : "Strong"}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
            <button
              onClick={handleChangePw}
              disabled={savingPw}
              className="w-full py-3 bg-[#050B14] text-white rounded-xl font-bold text-[14px] hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
            >
              {savingPw ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <span className="material-symbols-outlined text-sm">lock_reset</span>
              )}
              {savingPw ? "Updating…" : "Update Password"}
            </button>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-[#050B14] rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-[#e9c349] text-[18px]">devices</span>
            </div>
            <h3 className="text-[14px] font-semibold text-[#050B14] uppercase tracking-wider">Active Sessions</h3>
          </div>
          <div className="space-y-4">
            {sessions.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-500 text-[18px]">
                      {s.device.includes("iPhone") ? "smartphone" : "computer"}
                    </span>
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#050B14]">{s.device}</p>
                    <p className="text-[12px] text-[#64748B]">{s.location} · {s.time}</p>
                  </div>
                </div>
                {s.current ? (
                  <span className="text-[12px] px-2.5 py-1 bg-green-100 text-green-700 rounded-full font-bold">Current</span>
                ) : (
                  <button
                    onClick={() => addToast({ title: "Session revoked", description: `${s.device} has been signed out.`, variant: "success" })}
                    className="text-[12px] text-red-500 hover:text-red-700 font-semibold transition-colors"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: 2FA */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-[#050B14] rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-[#e9c349] text-[18px]">security</span>
            </div>
            <h3 className="text-[14px] font-semibold text-[#050B14] uppercase tracking-wider">Two-Factor Auth</h3>
          </div>
          <p className="text-[14px] text-[#64748B] mb-6 leading-relaxed">
            Add an extra layer of security to your account. When enabled, you'll be prompted for a verification code on each login.
          </p>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6">
            <div>
              <p className="text-[14px] font-semibold text-[#050B14]">Authenticator App</p>
              <p className="text-[12px] text-[#64748B]">Google Authenticator or Authy</p>
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
              className={`relative w-12 h-6 rounded-full transition-colors ${twoFA ? "bg-[#e9c349]" : "bg-slate-300"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${twoFA ? "translate-x-6" : ""}`}
              />
            </button>
          </div>
          {twoFA && (
            <div className="bg-[#e9c349]/10 border border-[#e9c349]/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[#e9c349] text-[18px]">check_circle</span>
                <p className="text-[14px] font-bold text-[#050B14]">2FA Active</p>
              </div>
              <p className="text-[12px] text-[#64748B]">Your account is protected with two-factor authentication.</p>
            </div>
          )}
        </div>

        {/* Security Score */}
        <div className="bg-[#050B14] p-8 rounded-xl border border-slate-800 shadow-sm">
          <h3 className="text-[14px] font-semibold text-white mb-4 uppercase tracking-wider">Security Score</h3>
          <div className="flex items-end gap-3 mb-4">
            <span className="text-5xl font-extrabold text-[#e9c349]">{twoFA ? 92 : 74}</span>
            <span className="text-[#64748B] text-sm mb-2">/ 100</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 mb-4">
            <div
              className="bg-[#e9c349] h-2 rounded-full transition-all duration-700"
              style={{ width: `${twoFA ? 92 : 74}%` }}
            />
          </div>
          <ul className="space-y-2 text-[12px]">
            {[
              { label: "Strong password", done: true },
              { label: "Email verified", done: true },
              { label: "Two-factor authentication", done: twoFA },
              { label: "Recovery email set", done: false },
            ].map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-[14px] ${item.done ? "text-[#e9c349]" : "text-slate-600"}`}>
                  {item.done ? "check_circle" : "radio_button_unchecked"}
                </span>
                <span className={item.done ? "text-slate-300" : "text-slate-500"}>{item.label}</span>
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
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-[14px] font-semibold text-[#050B14] uppercase tracking-wider">Withdrawal Bank Accounts</h3>
          <p className="text-[12px] text-[#64748B] mt-0.5">Bank accounts used to receive your withdrawal payouts.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#050B14] text-white rounded-xl text-[14px] font-bold hover:bg-slate-800 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">{showForm ? "close" : "add"}</span>
          {showForm ? "Cancel" : "Add Account"}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-[#e9c349]/40 shadow-sm space-y-4">
          <h4 className="text-[14px] font-bold text-[#050B14]">New Bank Account</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: "bankName", label: "Bank Name", placeholder: "e.g. Commercial Bank of Ethiopia" },
              { key: "accountHolder", label: "Account Holder Name", placeholder: "Full legal name" },
              { key: "accountNumber", label: "Account Number", placeholder: "e.g. 1000 5497 1250 2" },
              { key: "swiftCode", label: "SWIFT / BIC Code (optional)", placeholder: "e.g. CBETETAA" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-[12px] font-semibold text-[#050B14] mb-1.5">{label}</label>
                <input
                  type="text"
                  value={(newBank as Record<string, string>)[key]}
                  onChange={(e) => setNewBank({ ...newBank, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#e9c349] outline-none text-sm text-[#050B14] transition-all"
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleAdd}
            disabled={saving}
            className="w-full py-3 bg-[#e9c349] text-[#050B14] rounded-xl font-bold text-[14px] hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <span className="material-symbols-outlined text-sm">save</span>
            )}
            {saving ? "Saving…" : "Save Bank Account"}
          </button>
        </div>
      )}

      {/* Bank list */}
      <div className="space-y-4">
        {banks.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-[#64748B] text-sm">
            No bank accounts added yet.
          </div>
        ) : (
          banks.map((bank) => (
            <div
              key={bank.id}
              className={`bg-white p-6 rounded-xl border shadow-sm flex items-start justify-between gap-4 ${
                bank.isPrimary ? "border-[#e9c349]/60 ring-1 ring-[#e9c349]/30" : "border-slate-200"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#050B14] rounded-lg flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#e9c349] text-[18px]">account_balance</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[14px] font-bold text-[#050B14]">{bank.bankName}</p>
                    {bank.isPrimary && (
                      <span className="text-[10px] bg-[#e9c349]/20 text-[#050B14] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#64748B]">{bank.accountHolder}</p>
                  <p className="text-[14px] font-semibold text-[#050B14] mt-1">{bank.accountNumber}</p>
                  {bank.swiftCode && (
                    <p className="text-[12px] text-[#64748B]">SWIFT: {bank.swiftCode}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {!bank.isPrimary && (
                  <button
                    onClick={() => handleSetPrimary(bank.id)}
                    className="text-[12px] text-[#050B14] hover:text-[#e9c349] font-semibold transition-colors whitespace-nowrap"
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
        <span className="material-symbols-outlined text-blue-500 text-[18px] mt-0.5 shrink-0">info</span>
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

  const handleDiscard = () => {
    setForm(saved);
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "personal", label: "Personal Profile" },
    { id: "security", label: "Security & 2FA" },
    { id: "banks", label: "Bank Accounts" },
  ];

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-[24px] font-bold text-[#050B14] mb-1">Profile Settings</h1>
          <p className="text-base text-[#64748B]">
            Manage your personal credentials, secure authentication states, and withdrawal bank configurations.
          </p>
        </div>

        {/* Tab Nav */}
        <div className="flex gap-8 border-b border-slate-200 mb-8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-[14px] font-semibold py-3 relative transition-colors ${
                activeTab === tab.id
                  ? "text-[#050B14] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#e9c349]"
                  : "text-[#64748B] hover:text-[#050B14]"
              }`}
            >
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
            onDiscard={handleDiscard}
            saving={saving}
          />
        )}
        {activeTab === "security" && <SecurityTab />}
        {activeTab === "banks" && <BankAccountsTab />}

        {/* Footer */}
        <footer className="mt-12 py-8 text-center">
          <p className="text-[12px] text-[#94A3B8]">
            © 2024 Aurum Sovereign Capital. All data encrypted via 256-bit Institutional Security Protocols.
          </p>
        </footer>
      </div>
    </div>
  );
}
