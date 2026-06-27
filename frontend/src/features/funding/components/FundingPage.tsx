"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ROUTES } from "@/src/lib/constants/routes";

// ── Types ─────────────────────────────────────────────────────────────────────

type PaymentTab = "bank" | "ewallet" | "crypto" | "other";

interface BankOption {
  id: string;
  name: string;
  description: string;
  accountHolder: string;
  accountNumber: string;
  logoText: string;
  logoColor: string;
  logoBg: string;
  recommended?: boolean;
}

interface EWalletOption {
  id: string;
  name: string;
  description: string;
  accountHolder: string;
  accountNumber: string;
  logoText: string;
  logoColor: string;
}

interface CryptoOption {
  id: string;
  name: string;
  description: string;
  address: string;
  network: string;
  logoText: string;
  logoColor: string;
  logoBg: string;
}

interface OtherOption {
  id: string;
  name: string;
  description: string;
  note: string;
  logoText: string;
  logoColor: string;
  logoBg: string;
}

// ── Data ──────────────────────────────────────────────────────────────────────

const BANKS: BankOption[] = [
  {
    id: "cbe",
    name: "Commercial Bank of Ethiopia",
    description: "Deposit via Commercial Bank of Ethiopia",
    accountHolder: "Nathaniel Elias Misgane",
    accountNumber: "1000549712502",
    logoText: "CBE",
    logoColor: "text-[#C5A059]",
    logoBg: "bg-white",
    recommended: true,
  },
  {
    id: "boa",
    name: "Bank of Abyssinia",
    description: "Deposit via Bank of Abyssinia",
    accountHolder: "Nathaniel Elias Misgane",
    accountNumber: "162435388",
    logoText: "BOA",
    logoColor: "text-blue-900",
    logoBg: "bg-white",
  },
  {
    id: "awash",
    name: "Awash Bank",
    description: "Deposit via Awash Bank",
    accountHolder: "Nathaniel Elias Misgane",
    accountNumber: "01320151831901",
    logoText: "AB",
    logoColor: "text-orange-600",
    logoBg: "bg-white",
  },
  {
    id: "coop",
    name: "Cooperative Bank of Oromia",
    description: "Deposit via Cooperative Bank of Oromia",
    accountHolder: "Nathaniel Elias Misgane",
    accountNumber: "1026100366733",
    logoText: "CBO",
    logoColor: "text-green-700",
    logoBg: "bg-white",
  },
];

const EWALLETS: EWalletOption[] = [
  {
    id: "telebirr",
    name: "TeleBirr",
    description: "Deposit via TeleBirr Wallet",
    accountHolder: "Nathaniel Elias Misgane",
    accountNumber: "0901090348",
    logoText: "telebirr",
    logoColor: "text-blue-500",
  },
  {
    id: "cbebirr",
    name: "CBE Birr",
    description: "Deposit via CBE Birr Wallet",
    accountHolder: "Nathaniel Elias Misgane",
    accountNumber: "1000549712502",
    logoText: "CBE Birr",
    logoColor: "text-green-600",
  },
];

const CRYPTOS: CryptoOption[] = [
  {
    id: "usdt",
    name: "USDT (TRC-20)",
    description: "Deposit via Tether on TRON network",
    address: "TQnGF3KsVQKYqNxgwm8fNWdmT7sJxzRkqP",
    network: "TRON (TRC-20)",
    logoText: "₮",
    logoColor: "text-green-600",
    logoBg: "bg-green-50",
  },
  {
    id: "btc",
    name: "Bitcoin (BTC)",
    description: "Deposit via Bitcoin network",
    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    network: "Bitcoin Mainnet",
    logoText: "₿",
    logoColor: "text-orange-500",
    logoBg: "bg-orange-50",
  },
  {
    id: "eth",
    name: "Ethereum (ETH)",
    description: "Deposit via Ethereum network",
    address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    network: "Ethereum Mainnet (ERC-20)",
    logoText: "Ξ",
    logoColor: "text-purple-600",
    logoBg: "bg-purple-50",
  },
];

const OTHERS: OtherOption[] = [
  {
    id: "wire",
    name: "International Wire Transfer",
    description: "SWIFT/IBAN wire transfer for international investors",
    note: "Processing time: 3–5 business days",
    logoText: "SWIFT",
    logoColor: "text-blue-700",
    logoBg: "bg-blue-50",
  },
  {
    id: "westernunion",
    name: "Western Union",
    description: "Send funds via Western Union Money Transfer",
    note: "Contact support for receiver details",
    logoText: "WU",
    logoColor: "text-yellow-700",
    logoBg: "bg-yellow-50",
  },
  {
    id: "moneygram",
    name: "MoneyGram",
    description: "International money transfer via MoneyGram",
    note: "Contact support for receiver details",
    logoText: "MG",
    logoColor: "text-red-600",
    logoBg: "bg-red-50",
  },
];

// ── Chevron SVG ───────────────────────────────────────────────────────────────

function ChevronRight() {
  return (
    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

// ── Bank tab ──────────────────────────────────────────────────────────────────

function BankTab({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {BANKS.map((bank) => {
        const isSelected = selected === bank.id;
        return (
          <div
            key={bank.id}
            onClick={() => onSelect(bank.id)}
            className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors ${
              isSelected
                ? "border border-[#C5A059] bg-amber-50/20"
                : "border border-[#E2E8F0] hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-lg border border-[#E2E8F0] flex items-center justify-center p-2">
                <span className={`font-bold italic text-sm ${bank.logoColor}`}>{bank.logoText}</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{bank.name}</h4>
                <p className="text-[11px] text-slate-500">{bank.description}</p>
              </div>
            </div>
            {isSelected ? (
              <div className="flex items-center gap-3">
                {bank.recommended && (
                  <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                    Recommended
                  </span>
                )}
                <div className="w-5 h-5 bg-[#C5A059] text-white rounded-full flex items-center justify-center">
                  <CheckIcon />
                </div>
              </div>
            ) : (
              <ChevronRight />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── E-Wallet tab ──────────────────────────────────────────────────────────────

function EWalletTab({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {EWALLETS.map((wallet) => {
        const isSelected = selected === wallet.id;
        return (
          <div
            key={wallet.id}
            onClick={() => onSelect(wallet.id)}
            className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors ${
              isSelected
                ? "border border-[#C5A059] bg-amber-50/20"
                : "border border-[#E2E8F0] hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-lg border border-[#E2E8F0] flex items-center justify-center p-2">
                <span className={`font-bold text-[10px] ${wallet.logoColor}`}>{wallet.logoText}</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{wallet.name}</h4>
                <p className="text-[11px] text-slate-500">{wallet.description}</p>
              </div>
            </div>
            {isSelected ? (
              <div className="w-5 h-5 bg-[#C5A059] text-white rounded-full flex items-center justify-center">
                <CheckIcon />
              </div>
            ) : (
              <ChevronRight />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Crypto tab ────────────────────────────────────────────────────────────────

function CryptoTab({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3 mb-4">
        <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
        <p className="text-[11px] text-amber-800">
          <span className="font-bold">Important:</span> Only send the exact cryptocurrency to its matching address. Sending to the wrong network will result in permanent loss of funds.
        </p>
      </div>
      {CRYPTOS.map((crypto) => {
        const isSelected = selected === crypto.id;
        return (
          <div
            key={crypto.id}
            onClick={() => onSelect(crypto.id)}
            className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors ${
              isSelected
                ? "border border-[#C5A059] bg-amber-50/20"
                : "border border-[#E2E8F0] hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${crypto.logoBg} rounded-lg border border-[#E2E8F0] flex items-center justify-center`}>
                <span className={`text-xl font-bold ${crypto.logoColor}`}>{crypto.logoText}</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{crypto.name}</h4>
                <p className="text-[11px] text-slate-500">{crypto.description}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[220px]">{crypto.address}</p>
              </div>
            </div>
            {isSelected ? (
              <div className="w-5 h-5 bg-[#C5A059] text-white rounded-full flex items-center justify-center shrink-0">
                <CheckIcon />
              </div>
            ) : (
              <div className="shrink-0"><ChevronRight /></div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Other methods tab ─────────────────────────────────────────────────────────

function OtherTab({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {OTHERS.map((method) => {
        const isSelected = selected === method.id;
        return (
          <div
            key={method.id}
            onClick={() => onSelect(method.id)}
            className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors ${
              isSelected
                ? "border border-[#C5A059] bg-amber-50/20"
                : "border border-[#E2E8F0] hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${method.logoBg} rounded-lg border border-[#E2E8F0] flex items-center justify-center`}>
                <span className={`font-bold text-xs ${method.logoColor}`}>{method.logoText}</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{method.name}</h4>
                <p className="text-[11px] text-slate-500">{method.description}</p>
                <p className="text-[10px] text-amber-600 font-medium mt-0.5">{method.note}</p>
              </div>
            </div>
            {isSelected ? (
              <div className="w-5 h-5 bg-[#C5A059] text-white rounded-full flex items-center justify-center shrink-0">
                <CheckIcon />
              </div>
            ) : (
              <div className="shrink-0"><ChevronRight /></div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PRESET_AMOUNTS = ["$1,200", "$2,500", "$5,000", "$10,000"];

export function FundingPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<PaymentTab>("bank");
  const [selectedBank, setSelectedBank] = useState("cbe");
  const [selectedEWallet, setSelectedEWallet] = useState("telebirr");
  const [selectedCrypto, setSelectedCrypto] = useState("usdt");
  const [selectedOther, setSelectedOther] = useState("wire");
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");

  const numericAmount = parseFloat(amount.replace(/[^0-9.]/g, "")) || 0;
  const displayTotal = numericAmount > 0 ? `$${numericAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "$0.00";

  const handlePreset = (preset: string) => {
    setAmount(preset.replace("$", "").replace(",", ""));
    setAmountError("");
  };

  const handleContinue = () => {
    if (numericAmount < 1200) {
      setAmountError("Minimum deposit is $1,200. Please enter a valid amount.");
      return;
    }
    // Build query params for the upload page
    const params = new URLSearchParams({ amount: String(numericAmount), method: activeTab });
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
    <div className="p-4 sm:p-6 lg:p-8 bg-[#F8FAFC] min-h-screen">
      {/* Page title */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-start sm:justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">Deposit Funds</h1>
          <p className="text-slate-500 text-sm">
            Choose your preferred payment method and fund your trading account securely.
          </p>
        </div>
        <button className="flex w-fit items-center gap-2 px-4 py-2 bg-white border border-blue-100 rounded-lg text-blue-600 text-sm font-semibold shadow-sm hover:shadow transition-shadow">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
          How Deposits Work
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0]" style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05),0 2px 4px -1px rgba(0,0,0,0.03)" }}>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Minimum Deposit</p>
          <h3 className="text-2xl font-bold text-slate-900 mb-1">$1,200</h3>
          <p className="text-xs text-slate-400">Equivalent in your local currency</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0]" style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05),0 2px 4px -1px rgba(0,0,0,0.03)" }}>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Processing Time</p>
          <h3 className="text-2xl font-bold text-slate-900 mb-1">Instant – 1 Hour</h3>
          <p className="text-xs text-slate-400">After payment confirmation</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0]" style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05),0 2px 4px -1px rgba(0,0,0,0.03)" }}>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Deposit Fee</p>
          <h3 className="text-2xl font-bold text-slate-900 mb-1">0%</h3>
          <p className="text-xs text-slate-400">No hidden charges</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4" style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05),0 2px 4px -1px rgba(0,0,0,0.03)" }}>
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Secure &amp; Encrypted</h4>
            <p className="text-[11px] text-slate-500 leading-normal">
              All payments are processed through secure and verified channels.
            </p>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-12 gap-5 sm:gap-8">
        {/* Left: Payment method */}
        <div className="col-span-12 lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden" style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05),0 2px 4px -1px rgba(0,0,0,0.03)" }}>
          <div className="p-5 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-6">1. Select Payment Method</h2>

            {/* Tabs */}
            <div className="flex overflow-x-auto border-b border-[#E2E8F0] mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 px-4 sm:px-6 py-3 text-sm flex items-center gap-2 transition-colors ${
                    activeTab === tab.id
                      ? "font-semibold border-b-2 border-[#C5A059] text-slate-900"
                      : "font-medium text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-400 font-medium mb-4">Choose your preferred payment option</p>

            {activeTab === "bank" && (
              <BankTab selected={selectedBank} onSelect={setSelectedBank} />
            )}
            {activeTab === "ewallet" && (
              <EWalletTab selected={selectedEWallet} onSelect={setSelectedEWallet} />
            )}
            {activeTab === "crypto" && (
              <CryptoTab selected={selectedCrypto} onSelect={setSelectedCrypto} />
            )}
            {activeTab === "other" && (
              <OtherTab selected={selectedOther} onSelect={setSelectedOther} />
            )}

            {/* Contact support banner */}
            <div className="mt-8 bg-blue-50 rounded-xl p-4 flex items-center justify-between border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-blue-900">Can&apos;t find your preferred method?</h5>
                  <p className="text-[10px] text-blue-700">Contact our support team for assistance.</p>
                </div>
              </div>
              <button className="px-4 py-2 border border-blue-200 bg-white text-blue-700 text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-blue-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                Contact Support
              </button>
            </div>
          </div>
        </div>

        {/* Right: Deposit details */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-5 sm:gap-8">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-8 flex-1" style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05),0 2px 4px -1px rgba(0,0,0,0.03)" }}>
            <h2 className="text-lg font-bold text-slate-900 mb-6">2. Deposit Details</h2>

            {/* Currency selector */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 mb-2">Deposit Currency</label>
              <div className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-4 bg-slate-200 overflow-hidden flex items-center gap-[1px]">
                    <div className="w-1/3 h-full bg-blue-800" />
                    <div className="w-2/3 h-full flex flex-col">
                      <div className="h-1/2 bg-white" />
                      <div className="h-1/2 bg-red-600" />
                    </div>
                  </div>
                  <span className="text-sm font-semibold">USD – US Dollar</span>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
            </div>

            {/* Amount input */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Deposit Amount{" "}
                <span className="text-slate-400 font-normal">(Min. $1,200)</span>
              </label>
              <div className="flex">
                <div className="bg-slate-50 border border-r-0 border-[#E2E8F0] rounded-l-xl px-4 py-3 flex items-center text-slate-400">
                  <span className="text-lg">$</span>
                </div>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setAmountError("");
                  }}
                  placeholder="Enter amount"
                  className="flex-1 border border-[#E2E8F0] focus:outline-none focus:border-[#C5A059] px-4 py-3 text-sm font-medium"
                />
                <div className="bg-slate-50 border border-l-0 border-[#E2E8F0] rounded-r-xl px-4 py-3 flex items-center text-slate-900 font-bold text-xs uppercase tracking-wider">
                  USD
                </div>
              </div>
              {amountError && (
                <p className="mt-1.5 text-xs text-red-600">{amountError}</p>
              )}
            </div>

            {/* Preset amounts */}
            <div className="grid grid-cols-4 gap-2 mb-8">
              {PRESET_AMOUNTS.map((p) => (
                <button
                  key={p}
                  onClick={() => handlePreset(p)}
                  className="py-2 border border-[#E2E8F0] rounded-lg text-sm font-semibold hover:border-[#C5A059] hover:text-[#C5A059] transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Calculation box */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 space-y-4 mb-8">
              <p className="text-xs font-bold text-slate-700">You Will Receive</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Deposit Amount</span>
                <span className="text-slate-900 font-bold">{displayTotal}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Processing Fee</span>
                <span className="text-slate-900 font-bold">$0.00</span>
              </div>
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">Total</span>
                <span className="text-xl font-extrabold text-green-600">{displayTotal}</span>
              </div>
            </div>

            {/* Security note */}
            <div className="bg-green-50/50 border border-green-100 rounded-xl p-4 flex items-start gap-3 mb-8">
              <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <div>
                <h5 className="text-xs font-bold text-green-800">All deposits are secure and monitored.</h5>
                <p className="text-[10px] text-green-700">Your funds are protected with bank-level security.</p>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleContinue}
              className="w-full py-4 bg-[#0F172A] text-white rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors shadow-lg"
            >
              <svg className="w-5 h-5 text-white/50" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM8.9 6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2H8.9V6z" />
              </svg>
              Continue to Payment
              <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Footer trust indicators */}
      <div className="mt-8 sm:mt-12 py-8 border-t border-[#E2E8F0] grid grid-cols-2 sm:grid-cols-4 gap-5 sm:gap-8">
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
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {item.icon}
              </svg>
            </div>
            <div>
              <h6 className="text-xs font-bold text-slate-900">{item.label}</h6>
              <p className="text-[10px] text-slate-500">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
