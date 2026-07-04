// Lot size → notional value → unrealized P/L, and the per-instrument-class
// "leverage" label shown to investors. Real trading terminology: leverage
// and lot size are orthogonal — leverage is a broker/instrument-class
// setting (fixed here, since positions are pool-shared with no individual
// investor margin account), lot size is the trader's chosen position size.
// The admin enters lot size; leverage is looked up, never derived from it.

export type AssetClass = "forex" | "metal" | "crypto" | "other";

const CRYPTO_TICKERS = new Set([
  "BTC", "ETH", "USDT", "USDC", "BNB", "SOL", "XRP", "ADA", "DOGE", "TRX", "LTC",
]);
const METAL_TICKERS = new Set(["XAU", "XAG"]); // gold, silver

// Standard notional-per-lot conventions.
const CONTRACT_SIZE: Record<AssetClass, number> = {
  forex: 100_000, // 1 standard lot = 100,000 units of base currency
  metal: 100, // 1 lot = 100 troy oz (gold convention; silver commonly 5,000 but
  // this platform only quotes XAU/USD today — revisit if XAG is added)
  crypto: 1, // 1 lot = 1 unit (BTC, ETH, ...) — common retail-broker default
  other: 1,
};

// Nominal leverage shown to investors, per instrument class — matches the
// ratios the UI already used for its per-asset presets (EUR/USD 1:100,
// XAU/USD 1:50, BTC/USD 1:20) before this model existed.
const NOMINAL_LEVERAGE: Record<AssetClass, string> = {
  forex: "1:100",
  metal: "1:50",
  crypto: "1:20",
  other: "—",
};

export function classifyAssetPair(assetPair: string): AssetClass {
  const base = assetPair.split("/")[0]?.trim().toUpperCase() ?? "";
  if (METAL_TICKERS.has(base)) return "metal";
  if (CRYPTO_TICKERS.has(base)) return "crypto";
  // Anything else with a 3-letter ISO-style base is treated as forex — the
  // console only offers a handful of real pairs today, all of which qualify.
  if (/^[A-Z]{3}$/.test(base)) return "forex";
  return "other";
}

export function nominalLeverageLabel(assetPair: string): string {
  return NOMINAL_LEVERAGE[classifyAssetPair(assetPair)];
}

// Total dollar exposure of a position — the basis for both auto-computing
// a pool-level P/L on close and the real (not honestly-unavailable)
// floating P/L shown on the dashboard/live-performance chart.
export function computeNotionalUsd(assetPair: string, lotSize: number, price: number): number {
  const assetClass = classifyAssetPair(assetPair);
  return lotSize * CONTRACT_SIZE[assetClass] * price;
}

// Unrealized/realized dollar P/L for one position, sign-adjusted for side.
// This is the platform-wide (pool-level) dollar amount — dividing it across
// investors by allocation_pct still happens in close_trade_execution(), same
// as before; this function just makes that number real instead of an
// admin's manual guess.
export function computePositionPl(
  assetPair: string,
  side: "LONG" | "SHORT",
  lotSize: number,
  entryPrice: number,
  currentPrice: number
): number {
  const assetClass = classifyAssetPair(assetPair);
  const contractSize = CONTRACT_SIZE[assetClass];
  const priceDelta = side === "LONG" ? currentPrice - entryPrice : entryPrice - currentPrice;
  return Number((priceDelta * lotSize * contractSize).toFixed(2));
}
