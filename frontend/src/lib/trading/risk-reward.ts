// Risk:reward is derived, never admin-entered: reward / risk from the prices
// actually set at open. Returns null when TP/SL weren't set (nothing to
// compute) rather than a misleading "—" baked in by the caller.
export function computeRiskReward(
  entryPrice: number,
  takeProfitPrice: number | null,
  stopLossPrice: number | null
): number | null {
  if (takeProfitPrice == null || stopLossPrice == null) return null;
  const risk = Math.abs(entryPrice - stopLossPrice);
  const reward = Math.abs(takeProfitPrice - entryPrice);
  if (risk === 0) return null;
  return Number((reward / risk).toFixed(2));
}

export function formatRiskReward(ratio: number | null): string {
  return ratio == null ? "—" : `1:${ratio.toFixed(2)}`;
}

// LONG: stop must be below entry, target above (loss below, profit above).
// SHORT: reversed. Rejects nonsensical combinations up front rather than
// silently accepting a stop that would already be triggered at entry.
export function validateTakeProfitStopLoss(
  side: "LONG" | "SHORT",
  entryPrice: number,
  takeProfitPrice: number | null,
  stopLossPrice: number | null
): string | null {
  if (takeProfitPrice != null) {
    const invalid = side === "LONG" ? takeProfitPrice <= entryPrice : takeProfitPrice >= entryPrice;
    if (invalid) {
      return side === "LONG"
        ? "Take profit must be above the entry price for a LONG position."
        : "Take profit must be below the entry price for a SHORT position.";
    }
  }
  if (stopLossPrice != null) {
    const invalid = side === "LONG" ? stopLossPrice >= entryPrice : stopLossPrice <= entryPrice;
    if (invalid) {
      return side === "LONG"
        ? "Stop loss must be below the entry price for a LONG position."
        : "Stop loss must be above the entry price for a SHORT position.";
    }
  }
  return null;
}
