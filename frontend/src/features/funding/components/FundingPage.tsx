"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronDown } from "lucide-react";

import { ROUTES } from "@/src/lib/constants/routes";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type PaymentTab = "bank" | "ewallet" | "crypto" | "other";

// ── Currency data ─────────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: "USD", symbol: "$",    name: "US Dollar",        flag: "🇺🇸" },
  { code: "ETB", symbol: "Br",   name: "Ethiopian Birr",   flag: "🇪🇹" },
  { code: "EUR", symbol: "€",    name: "Euro",             flag: "🇪🇺" },
  { code: "GBP", symbol: "£",    name: "British Pound",    flag: "🇬🇧" },
  { code: "AED", symbol: "د.إ",  name: "UAE Dirham",       flag: "🇦🇪" },
  { code: "SAR", symbol: "﷼",    name: "Saudi Riyal",      flag: "🇸🇦" },
  { code: "CAD", symbol: "CA$",  name: "Canadian Dollar",  flag: "🇨🇦" },
  { code: "AUD", symbol: "A$",   name: "Australian Dollar", flag: "🇦🇺" },
];

// ── Payment option data ───────────────────────────────────────────────────────

const BANKS = [
  {
    id: "cbe",
    name: "Commercial Bank of Ethiopia",
    description: "Deposit via Commercial Bank of Ethiopia",
    accountHolder: "Nathaniel Elias Misgane",
    accountNumber: "1000549712502",
    logoText: "CBE",
    logoColor: "text-[#C5A059] dark:text-[#c4a24d]",
    recommended: true,
  },
  {
    id: "boa",
    name: "Bank of Abyssinia",
    description: "Deposit via Bank of Abyssinia",
    accountHolder: "Nathaniel Elias Misgane",
    accountNumber: "162435388",
    logoText: "BOA",
    logoColor: "text-blue-900 dark:text-blue-400",
  },
  {
    id: "awash",
    name: "Awash Bank",
    description: "Deposit via Awash Bank",
    accountHolder: "Nathaniel Elias Misgane",
    accountNumber: "01320151831901",
    logoText: "AB",
    logoColor: "text-orange-600 dark:text-orange-400",
  },
  {
    id: "coop",
    name: "Cooperative Bank of Oromia",
    description: "Deposit via Cooperative Bank of Oromia",
    accountHolder: "Nathaniel Elias Misgane",
    accountNumber: "1026100366733",
    logoText: "CBO",
    logoColor: "text-green-700 dark:text-green-400",
  },
];

const EWALLETS = [
  {
    id: "telebirr",
    name: "TeleBirr",
    description: "Deposit via TeleBirr Wallet",
    accountHolder: "Nathaniel Elias Misgane",
    accountNumber: "0901090348",
    logoText: "telebirr",
    logoColor: "text-blue-500 dark:text-blue-400",
  },
  {
    id: "cbebirr",
    name: "CBE Birr",
    description: "Deposit via CBE Birr Wallet",
    accountHolder: "Nathaniel Elias Misgane",
    accountNumber: "1000549712502",
    logoText: "CBE Birr",
    logoColor: "text-green-600 dark:text-green-400",
  },
];

const CRYPTOS = [
  {
    id: "usdt",
    name: "USDT (TRC-20)",
    description: "Deposit via Tether on TRON network",
    address: "TQnGF3KsVQKYqNxgwm8fNWdmT7sJxzRkqP",
    network: "TRON (TRC-20)",
    logoText: "₮",
    logoColor: "text-green-600 dark:text-green-400",
    logoBg: "bg-green-50 dark:bg-green-500/10",
  },
  {
    id: "btc",
    name: "Bitcoin (BTC)",
    description: "Deposit via Bitcoin network",
    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    network: "Bitcoin Mainnet",
    logoText: "₿",
    logoColor: "text-orange-500 dark:text-orange-400",
    logoBg: "bg-orange-50 dark:bg-orange-500/10",
  },
  {
    id: "eth",
    name: "Ethereum (ETH)",
    description: "Deposit via Ethereum network",
    address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    network: "Ethereum Mainnet (ERC-20)",
    logoText: "Ξ",
    logoColor: "text-purple-600 dark:text-purple-400",
    logoBg: "bg-purple-50 dark:bg-purple-500/10",
  },
];

const OTHERS = [
  {
    id: "wire",
    name: "International Wire Transfer",
    description: "SWIFT/IBAN wire transfer for international investors",
    note: "Processing time: 3–5 business days",
    logoText: "SWIFT",
    logoColor: "text-blue-700 dark:text-blue-400",
    logoBg: "bg-blue-50 dark:bg-blue-500/10",
  },
  {
    id: "westernunion",
    name: "Western Union",
    description: "Send funds via Western Union Money Transfer",
    note: "Contact support for receiver details",
    logoText: "WU",
    logoColor: "text-yellow-700 dark:text-yellow-400",
    logoBg: "bg-yellow-50 dark:bg-yellow-500/10",
  },
  {
    id: "moneygram",
    name: "MoneyGram",
    description: "International money transfer via MoneyGram",
    note: "Contact support for receiver details",
    logoText: "MG",
    logoColor: "text-red-600 dark:text-red-400",
    logoBg: "bg-red-50 dark:bg-red-500/10",
  },
];

// ── Small icon components ─────────────────────────────────────────────────────

function ChevRight() {
  return (
    <svg className="w-5 h-5 text-slate-400 dark:text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
    </svg>
  );
}

// ── "How Deposits Work" modal ─────────────────────────────────────────────────

function HowDepositsModal({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      num: "01",
      title: "Choose Payment Method",
      body: "Select your preferred payment method from Bank Transfer, E-Wallet, Cryptocurrency, or Other Methods. Choose the specific bank or provider you wish to use.",
    },
    {
      num: "02",
      title: "Enter Deposit Amount",
      body: "Enter the amount you wish to deposit. The minimum deposit is $1,350 USD or the equivalent in your local currency. You will see a live calculation with zero processing fees.",
    },
    {
      num: "03",
      title: "Transfer the Funds",
      body: "After clicking 'Continue to Payment', you will be shown the exact account details to send your money to. Transfer the funds from your bank or wallet to the provided account.",
    },
    {
      num: "04",
      title: "Upload Your Proof",
      body: "Once you have made the transfer, upload a clear screenshot or photo of the payment receipt. This is required for our compliance team to verify your deposit.",
    },
    {
      num: "05",
      title: "Verification & Activation",
      body: "Our team will review your proof within 1–3 hours. Once approved, your trading account will be activated and you will receive a confirmation email.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden dark:bg-[rgba(15,23,42,0.6)] dark:[backdrop-filter:blur(12px)] dark:border dark:border-[rgba(255,255,255,0.1)]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/10">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">How Deposits Work</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors dark:text-white/40 dark:hover:bg-white/10">
            <X className="size-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {steps.map((s) => (
            <div key={s.num} className="flex gap-4">
              <span className="text-[11px] font-black text-[#C5A059] bg-amber-50 rounded-lg px-2 py-1 h-fit shrink-0 border border-amber-100 dark:text-[#c4a24d] dark:bg-[#c4a24d]/10 dark:border-[#c4a24d]/20">
                {s.num}
              </span>
              <div>
                <p className="text-sm font-bold text-gray-800 mb-0.5 dark:text-white">{s.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed dark:text-white/40">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Currency selector ─────────────────────────────────────────────────────────

function CurrencySelector({
  selected,
  onSelect,
}: {
  selected: (typeof CURRENCIES)[0];
  onSelect: (c: (typeof CURRENCIES)[0]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 flex items-center justify-between hover:border-slate-300 transition-colors bg-white dark:bg-white/5 dark:border-white/10 dark:hover:border-white/20"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg leading-none">{selected.flag}</span>
          <span className="text-sm font-semibold text-slate-800 dark:text-white">
            {selected.code} — {selected.name}
          </span>
        </div>
        <ChevronDown className={cn("size-4 text-slate-400 transition-transform dark:text-white/40", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1.5 bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden dark:bg-[#0e141a] dark:border-white/10">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => { onSelect(c); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors",
                c.code === selected.code ? "bg-amber-50/50 font-bold dark:bg-[#c4a24d]/10" : "font-medium"
              )}
            >
              <span className="text-base leading-none">{c.flag}</span>
              <span className="text-slate-800 dark:text-white">{c.code}</span>
              <span className="text-slate-400 text-xs dark:text-white/40">{c.name}</span>
              {c.code === selected.code && (
                <span className="ml-auto w-4 h-4 bg-[#C5A059] text-white rounded-full flex items-center justify-center dark:bg-[#c4a24d]">
                  <CheckIcon />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Payment method tab contents ───────────────────────────────────────────────

function OptionRow({
  logoText,
  logoColor,
  logoBg,
  name,
  description,
  extra,
  selected,
  recommended,
  onClick,
}: {
  logoText: string;
  logoColor: string;
  logoBg?: string;
  name: string;
  description: string;
  extra?: string;
  selected: boolean;
  recommended?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors",
        selected
          ? "border border-[#C5A059] bg-amber-50/20 dark:border-[#c4a24d] dark:bg-[#c4a24d]/10"
          : "border border-[#E2E8F0] hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20"
      )}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className={cn("w-11 h-11 rounded-xl border border-[#E2E8F0] flex items-center justify-center p-2 shrink-0 dark:border-white/10", logoBg ?? "bg-white dark:bg-white/5")}>
          <span className={cn("font-bold text-sm", logoColor)}>{logoText}</span>
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{name}</h4>
          <p className="text-[11px] text-slate-500 dark:text-white/40">{description}</p>
          {extra && <p className="text-[10px] text-amber-600 font-medium mt-0.5 dark:text-[#e9c349]">{extra}</p>}
        </div>
      </div>
      {selected ? (
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {recommended && (
            <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase hidden sm:inline-flex dark:bg-emerald-500/15 dark:text-emerald-300">
              Recommended
            </span>
          )}
          <div className="w-5 h-5 bg-[#C5A059] text-white rounded-full flex items-center justify-center dark:bg-[#c4a24d]">
            <CheckIcon />
          </div>
        </div>
      ) : (
        <div className="shrink-0 ml-2"><ChevRight /></div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PRESET_AMOUNTS = ["$1,350", "$2,500", "$5,000", "$10,000"];

export function FundingPage() {
  const router = useRouter();

  const [showHowModal, setShowHowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<PaymentTab>("bank");
  const [selectedBank, setSelectedBank] = useState("cbe");
  const [selectedEWallet, setSelectedEWallet] = useState("telebirr");
  const [selectedCrypto, setSelectedCrypto] = useState("usdt");
  const [selectedOther, setSelectedOther] = useState("wire");
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");
  const [currency, setCurrency] = useState(CURRENCIES[0]);

  const numericAmount = parseFloat(amount.replace(/[^0-9.]/g, "")) || 0;
  const displayTotal =
    numericAmount > 0
      ? `${currency.symbol}${numericAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      : `${currency.symbol}0.00`;

  const handlePreset = (preset: string) => {
    setAmount(preset.replace("$", "").replace(",", ""));
    setAmountError("");
  };

  const handleContinue = () => {
    if (numericAmount < 1350) {
      setAmountError(
        currency.code === "USD"
          ? "Minimum deposit is $1,350. Please enter a valid amount."
          : "Minimum deposit equivalent is $1,350 USD. Please enter a valid amount."
      );
      return;
    }
    const params = new URLSearchParams({ amount: String(numericAmount), method: activeTab, currency: currency.code });
    if (activeTab === "bank") params.set("bankId", selectedBank);
    if (activeTab === "ewallet") params.set("walletId", selectedEWallet);
    if (activeTab === "crypto") params.set("cryptoId", selectedCrypto);
    if (activeTab === "other") params.set("otherId", selectedOther);
    router.push(`${ROUTES.FUNDING_UPLOAD}?${params.toString()}`);
  };

  const tabs: { id: PaymentTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "bank",
      label: "Bank Transfer",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      ),
    },
    {
      id: "ewallet",
      label: "E-Wallets",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      ),
    },
    {
      id: "crypto",
      label: "Cryptocurrency",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      ),
    },
    {
      id: "other",
      label: "Other Methods",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-7 10V12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#F8FAFC] dark:bg-transparent">
      {showHowModal && <HowDepositsModal onClose={() => setShowHowModal(false)} />}

      {/* Page title */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-start sm:justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1 dark:text-white">Deposit Funds</h1>
          <p className="text-slate-500 text-sm dark:text-white/40">
            Choose your preferred payment method and fund your trading account securely.
          </p>
        </div>
        <button
          onClick={() => setShowHowModal(true)}
          className="flex w-fit items-center gap-2 px-4 py-2 bg-white border border-blue-100 rounded-lg text-blue-600 text-sm font-semibold shadow-sm hover:shadow transition-shadow dark:bg-white/5 dark:border-[#c4a24d]/30 dark:text-[#c4a24d] dark:shadow-none dark:hover:bg-white/10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
          How Deposits Work
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Card 1 */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E2E8F0] dark:bg-[rgba(255,255,255,0.05)] dark:[backdrop-filter:blur(20px)] dark:border-[rgba(255,255,255,0.1)] dark:shadow-none" style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 dark:text-white/40">Minimum Deposit</p>
          <h3 className="text-2xl font-bold text-slate-900 mb-1 dark:text-white">$1,350</h3>
          <p className="text-xs text-slate-400 dark:text-white/30">Equivalent in your local currency</p>
        </div>
        {/* Card 2 */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E2E8F0] dark:bg-[rgba(255,255,255,0.05)] dark:[backdrop-filter:blur(20px)] dark:border-[rgba(255,255,255,0.1)] dark:shadow-none" style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 dark:text-white/40">Processing Time</p>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1 dark:text-white">Instant – 1 Hour</h3>
          <p className="text-xs text-slate-400 dark:text-white/30">After payment confirmation</p>
        </div>
        {/* Card 3 */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E2E8F0] dark:bg-[rgba(255,255,255,0.05)] dark:[backdrop-filter:blur(20px)] dark:border-[rgba(255,255,255,0.1)] dark:shadow-none" style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 dark:text-white/40">Deposit Fee</p>
          <h3 className="text-2xl font-bold text-slate-900 mb-1 dark:text-white">0%</h3>
          <p className="text-xs text-slate-400 dark:text-white/30">No hidden charges</p>
        </div>
        {/* Card 4 — fixed layout for mobile */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 dark:bg-[rgba(255,255,255,0.05)] dark:[backdrop-filter:blur(20px)] dark:border-[rgba(255,255,255,0.1)] dark:shadow-none" style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <div className="w-10 h-10 sm:w-14 sm:h-14 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0 dark:bg-blue-500/10">
            <svg className="w-5 h-5 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Secure &amp; Encrypted</h4>
            <p className="text-[11px] text-slate-500 leading-normal dark:text-white/40">
              All payments are processed through secure and verified channels.
            </p>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-12 gap-5 sm:gap-8">
        {/* Left: Payment method */}
        <div className="col-span-12 lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden dark:bg-[rgba(255,255,255,0.03)] dark:[backdrop-filter:blur(12px)] dark:border-[rgba(255,255,255,0.05)] dark:shadow-none" style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <div className="p-5 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-6 dark:text-white">1. Select Payment Method</h2>

            {/* Tabs — hidden native scrollbar */}
            <div className="flex overflow-x-auto border-b border-[#E2E8F0] mb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:border-white/10">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "shrink-0 px-4 sm:px-6 py-3 text-sm flex items-center gap-2 transition-colors",
                    activeTab === tab.id
                      ? "font-semibold border-b-2 border-[#C5A059] text-slate-900 dark:border-[#c4a24d] dark:text-white"
                      : "font-medium text-slate-500 hover:text-slate-800 dark:text-white/40 dark:hover:text-white/70"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-400 font-medium mb-4 dark:text-white/30">Choose your preferred payment option</p>

            {/* Crypto warning */}
            {activeTab === "crypto" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3 mb-4 dark:bg-amber-500/10 dark:border-amber-500/20">
                <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                <p className="text-[11px] text-amber-800 dark:text-amber-200">
                  <span className="font-bold">Important:</span> Only send the exact cryptocurrency to its matching address. Sending to the wrong network will result in permanent loss of funds.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {activeTab === "bank" && BANKS.map((b) => (
                <OptionRow key={b.id} logoText={b.logoText} logoColor={b.logoColor} logoBg="bg-white"
                  name={b.name} description={b.description} selected={selectedBank === b.id}
                  recommended={b.recommended} onClick={() => setSelectedBank(b.id)} />
              ))}
              {activeTab === "ewallet" && EWALLETS.map((w) => (
                <OptionRow key={w.id} logoText={w.logoText} logoColor={w.logoColor} logoBg="bg-white"
                  name={w.name} description={w.description} selected={selectedEWallet === w.id}
                  onClick={() => setSelectedEWallet(w.id)} />
              ))}
              {activeTab === "crypto" && CRYPTOS.map((c) => (
                <OptionRow key={c.id} logoText={c.logoText} logoColor={c.logoColor} logoBg={c.logoBg}
                  name={c.name} description={c.description} extra={c.address.slice(0, 20) + "..."}
                  selected={selectedCrypto === c.id} onClick={() => setSelectedCrypto(c.id)} />
              ))}
              {activeTab === "other" && OTHERS.map((o) => (
                <OptionRow key={o.id} logoText={o.logoText} logoColor={o.logoColor} logoBg={o.logoBg}
                  name={o.name} description={o.description} extra={o.note}
                  selected={selectedOther === o.id} onClick={() => setSelectedOther(o.id)} />
              ))}
            </div>

            {/* Contact support banner */}
            <div className="mt-8 bg-blue-50 rounded-xl p-4 flex items-center justify-between border border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center dark:bg-blue-500/15">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-blue-900 dark:text-blue-200">Can&apos;t find your preferred method?</h5>
                  <p className="text-[10px] text-blue-700 dark:text-blue-300/70">Contact our support team for assistance.</p>
                </div>
              </div>
              <button
                onClick={() => router.push(ROUTES.SUPPORT)}
                className="px-4 py-2 border border-blue-200 bg-white text-blue-700 text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-blue-50 transition-colors shrink-0 dark:bg-white/5 dark:border-blue-500/30 dark:text-blue-300 dark:hover:bg-blue-500/10"
              >
                Contact Support
              </button>
            </div>
          </div>
        </div>

        {/* Right: Deposit details */}
        <div className="col-span-12 lg:col-span-5">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-8 dark:bg-[rgba(255,255,255,0.03)] dark:[backdrop-filter:blur(12px)] dark:border-[rgba(255,255,255,0.05)] dark:shadow-none" style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
            <h2 className="text-lg font-bold text-slate-900 mb-6 dark:text-white">2. Deposit Details</h2>

            {/* Currency selector */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 mb-2 dark:text-white/70">Deposit Currency</label>
              <CurrencySelector selected={currency} onSelect={setCurrency} />
              {currency.code !== "USD" && (
                <p className="mt-1.5 text-[10px] text-amber-700 font-medium dark:text-amber-400">
                  Deposits are processed in USD. Your amount will be converted at the current market rate.
                </p>
              )}
            </div>

            {/* Amount input */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 mb-2 dark:text-white/70">
                Deposit Amount{" "}
                <span className="text-slate-400 font-normal dark:text-white/30">
                  {currency.code === "USD" ? "(Min. $1,350)" : "(Min. $1,350 USD equivalent)"}
                </span>
              </label>
              <div className="flex">
                <div className="bg-slate-50 border border-r-0 border-[#E2E8F0] rounded-l-xl px-4 py-3 flex items-center text-slate-500 text-sm font-medium dark:bg-white/5 dark:border-white/10 dark:text-white/40">
                  {currency.symbol}
                </div>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setAmountError(""); }}
                  placeholder="Enter amount"
                  className="flex-1 border border-[#E2E8F0] focus:outline-none focus:border-[#C5A059] px-4 py-3 text-sm font-medium dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-white/30 dark:focus:border-[#c4a24d]"
                />
                <div className="bg-slate-50 border border-l-0 border-[#E2E8F0] rounded-r-xl px-3 py-3 flex items-center text-slate-900 font-bold text-xs uppercase tracking-wider dark:bg-white/5 dark:border-white/10 dark:text-white">
                  {currency.code}
                </div>
              </div>
              {amountError && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{amountError}</p>}
            </div>

            {/* Preset amounts */}
            <div className="grid grid-cols-4 gap-2 mb-8">
              {PRESET_AMOUNTS.map((p) => (
                <button
                  key={p}
                  onClick={() => handlePreset(p)}
                  className="py-2 border border-[#E2E8F0] rounded-lg text-sm font-semibold hover:border-[#C5A059] hover:text-[#C5A059] transition-colors dark:border-white/10 dark:text-white/70 dark:hover:border-[#c4a24d] dark:hover:text-[#c4a24d]"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Calculation box */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 space-y-4 mb-8 dark:bg-white/5 dark:border-white/10">
              <p className="text-xs font-bold text-slate-700 dark:text-white/70">You Will Receive</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium dark:text-white/40">Deposit Amount</span>
                <span className="text-slate-900 font-bold dark:text-white">{displayTotal}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium dark:text-white/40">Processing Fee</span>
                <span className="text-slate-900 font-bold dark:text-white">{currency.symbol}0.00</span>
              </div>
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between dark:border-white/10">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Total</span>
                <span className="text-xl font-extrabold text-green-600 dark:text-emerald-400">{displayTotal}</span>
              </div>
            </div>

            {/* Security note */}
            <div className="bg-green-50/50 border border-green-100 rounded-xl p-4 flex items-start gap-3 mb-8 dark:bg-emerald-500/10 dark:border-emerald-500/20">
              <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <div>
                <h5 className="text-xs font-bold text-green-800 dark:text-emerald-300">All deposits are secure and monitored.</h5>
                <p className="text-[10px] text-green-700 dark:text-emerald-400/70">Your funds are protected with bank-level security.</p>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleContinue}
              className="w-full py-4 bg-[#0F172A] text-white rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors shadow-lg dark:bg-[#c4a24d] dark:text-[#050b14] dark:hover:bg-[#d4b35d] dark:shadow-none"
            >
              <svg className="w-5 h-5 text-white/50 dark:text-[#050b14]/50" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM8.9 6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2H8.9V6z" />
              </svg>
              Continue to Payment
              <svg className="w-5 h-5 text-white/50 dark:text-[#050b14]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Footer trust indicators */}
      <div className="mt-8 sm:mt-12 py-8 border-t border-[#E2E8F0] grid grid-cols-2 sm:grid-cols-4 gap-5 sm:gap-8 dark:border-white/10">
        {[
          {
            icon: <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />,
            label: "Secure Transactions",
            sub: "Your payments are 100% secure and encrypted.",
          },
          {
            icon: <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />,
            label: "Fast Processing",
            sub: "Deposits are processed within minutes.",
          },
          {
            icon: <path d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />,
            label: "24/7 Support",
            sub: "Our support team is always here to help you.",
          },
          {
            icon: <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />,
            label: "Verified Methods",
            sub: "All payment methods are verified and trusted.",
          },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 dark:bg-white/10">
              <svg className="w-5 h-5 text-slate-500 dark:text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {item.icon}
              </svg>
            </div>
            <div>
              <h6 className="text-xs font-bold text-slate-900 dark:text-white">{item.label}</h6>
              <p className="text-[10px] text-slate-500 dark:text-white/40">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
