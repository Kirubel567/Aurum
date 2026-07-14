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
  // Twelve Data — free tier (800 req/day, 8/min), genuinely intraday quotes.
  //
  // Frankfurter.app (the previous provider here) was removed: it serves the
  // ECB's REFERENCE rate, published once per business day around 16:00 CET
  // and frozen for the rest of the day/night. It is not live pricing. Using
  // it to mark an open trade or price a close silently produced numbers
  // that could disagree with the real intraday market by the entire day's
  // trading range — enough to flip a genuinely winning position into an
  // apparent loss. Confirmed in production: a EUR/USD LONG closed at
  // Frankfurter's frozen daily print while the real (TradingView/FXCM)
  // price had moved favorably.
  //
  // Behind an optional env var, same defensive pattern as fetchMetalPrice:
  // no key = unavailable (the console falls back to manual entry), never a
  // plausible-looking wrong number.
  const apiKey = process.env.FOREX_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://api.twelvedata.com/price?symbol=${base}/${quote}&apikey=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const body = await res.json();
    if (body?.status === "error" || body?.code) return null; // twelvedata error shape
    const price = Number(body?.price);
    if (!Number.isFinite(price) || price <= 0) return null;
    return { price, source: "twelvedata.com", asOf: new Date().toISOString() };
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
  // Fallback for metals Twelve Data's free tier doesn't carry (confirmed:
  // XAG/USD and other non-gold metals 404 with "requires Grow/Venture plan").
  // Gold itself is handled by fetchForexRate below — Twelve Data serves
  // XAU/USD live on the same free tier as forex pairs. Needs a paid-tier key
  // on every other mainstream provider we could find with a workable free
  // plan (Frankfurter/ECB and CoinGecko don't carry metals either). Behind an
  // optional env var so this degrades to "unavailable" — not a crash — until
  // one is configured.
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

// Module-level TTL cache: one slot per asset pair, 10-second lifetime.
// In a long-running Node process (dev) this persists across requests.
// In a serverless function each cold start gets a fresh cache — that's
// fine; the point is to prevent duplicate calls within the same hot
// instance when many investors are polling simultaneously.
const _cache = new Map<string, { result: LivePriceResult; expiresAt: number }>();
const CACHE_TTL_MS = 10_000;

async function cachedFetch(
  key: string,
  fn: () => Promise<LivePriceResult | null>
): Promise<LivePriceResult | null> {
  const now = Date.now();
  const hit = _cache.get(key);
  if (hit && hit.expiresAt > now) return hit.result;
  const result = await fn();
  if (result) _cache.set(key, { result, expiresAt: now + CACHE_TTL_MS });
  return result;
}

// Returns null (never throws) when no live price is available for this
// pair — the caller decides how to degrade (skip the auto-refresh, show
// "unavailable", leave the field for manual entry).
export async function fetchLivePrice(assetPair: string): Promise<LivePriceResult | null> {
  const { base, quote } = splitPair(assetPair);
  const assetClass = classifyAssetPair(assetPair);

  const key = assetPair.toUpperCase();
  if (assetClass === "crypto") return cachedFetch(key, () => fetchCryptoPrice(base, quote));
  if (assetClass === "metal") {
    // Gold rides the same Twelve Data /price endpoint as forex pairs (free
    // tier). Other metals (silver, etc.) aren't on that tier — fall back to
    // metals-api.com, which stays gated behind METALS_API_KEY.
    if (base === "XAU") return cachedFetch(key, () => fetchForexRate(base, quote));
    return cachedFetch(key, () => fetchMetalPrice(base, quote));
  }
  if (assetClass === "forex") return cachedFetch(key, () => fetchForexRate(base, quote));
  return null; // "other" (equities/indices) — explicitly out of scope
}
