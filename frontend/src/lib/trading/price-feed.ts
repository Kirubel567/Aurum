// Live market price lookups for the trading console — Forex, Gold, and
// Crypto, per the user's explicit scope decision (equities/indices are out
// of scope; they typically need a paid subscription). Every provider call
// degrades gracefully: a failure returns null, never a thrown error that
// would break the console — the admin can always fall back to manual entry.
import { classifyAssetPair } from "./lot-size";

export interface LivePriceResult {
  price: number;
  source: string;
  asOf: string;
}

const CRYPTO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  USDC: "usd-coin",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  TRX: "tron",
  LTC: "litecoin",
};

function splitPair(assetPair: string): { base: string; quote: string } {
  const [base, quote] = assetPair.split("/").map((s) => s.trim().toUpperCase());
  return { base: base ?? "", quote: quote ?? "USD" };
}

async function fetchForexRate(base: string, quote: string): Promise<LivePriceResult | null> {
  try {
    // Frankfurter.app — free, no API key, ECB reference rates. Good enough
    // for a demo/verification quote; not tick-level FX pricing.
    const res = await fetch(`https://api.frankfurter.app/latest?from=${base}&to=${quote}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const body = await res.json();
    const rate = body?.rates?.[quote];
    if (typeof rate !== "number") return null;
    return { price: rate, source: "frankfurter.app", asOf: body.date ?? new Date().toISOString() };
  } catch {
    return null;
  }
}

async function fetchCryptoPrice(base: string, quote: string): Promise<LivePriceResult | null> {
  const id = CRYPTO_IDS[base];
  if (!id) return null;
  try {
    // CoinGecko public simple-price endpoint — free, no API key required.
    const vsQuote = quote.toLowerCase();
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=${vsQuote}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const body = await res.json();
    const price = body?.[id]?.[vsQuote];
    if (typeof price !== "number") return null;
    return { price, source: "coingecko.com", asOf: new Date().toISOString() };
  } catch {
    return null;
  }
}

async function fetchMetalPrice(base: string, quote: string): Promise<LivePriceResult | null> {
  // Gold/silver spot pricing needs a paid-tier key on every mainstream
  // provider we could find with a workable free plan (Frankfurter/ECB and
  // CoinGecko don't carry metals). Behind an optional env var so this
  // degrades to "unavailable" — not a crash — until one is configured.
  const apiKey = process.env.METALS_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://metals-api.com/api/latest?access_key=${apiKey}&base=${quote}&symbols=${base}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const body = await res.json();
    const perUnit = body?.rates?.[base];
    if (typeof perUnit !== "number" || perUnit === 0) return null;
    // metals-api returns e.g. rates.XAU = ounces of gold per 1 unit of
    // `base` currency — invert to get quote-currency price per ounce.
    return { price: 1 / perUnit, source: "metals-api.com", asOf: body.date ?? new Date().toISOString() };
  } catch {
    return null;
  }
}

// Returns null (never throws) when no live price is available for this
// pair — the caller decides how to degrade (skip the auto-refresh, show
// "unavailable", leave the field for manual entry).
export async function fetchLivePrice(assetPair: string): Promise<LivePriceResult | null> {
  const { base, quote } = splitPair(assetPair);
  const assetClass = classifyAssetPair(assetPair);

  if (assetClass === "crypto") return fetchCryptoPrice(base, quote);
  if (assetClass === "metal") return fetchMetalPrice(base, quote);
  if (assetClass === "forex") return fetchForexRate(base, quote);
  return null; // "other" (equities/indices) — explicitly out of scope
}
