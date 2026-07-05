import type {
  SavedBankAccount,
  WithdrawBalanceSummary,
  WithdrawHistoryItem,
} from "@/src/types/withdraw.types";

// Client-side fallbacks used before the summary API response arrives.
export const FEE_RATE = { standard: 0.005, express: 0.01 };
export const MIN_WITHDRAW = 500;
export const PROCESSING_DAYS = { standard: "1–3 business days", express: "Within 24 hours" };

export type WithdrawSummaryResponse = WithdrawBalanceSummary & {
  minWithdrawal: number;
  standardFeeRate: number;
  expressFeeRate: number;
};

export async function fetchWithdrawSummary(): Promise<WithdrawSummaryResponse> {
  const res = await fetch("/api/withdraw/summary");
  if (!res.ok) throw new Error("Failed to load withdrawal summary.");
  return res.json() as Promise<WithdrawSummaryResponse>;
}

export async function fetchWithdrawBanks(): Promise<SavedBankAccount[]> {
  const res = await fetch("/api/withdraw/banks");
  if (!res.ok) throw new Error("Failed to load bank accounts.");
  const json = (await res.json()) as { banks: SavedBankAccount[] };
  return json.banks;
}

export async function fetchWithdrawHistory(): Promise<WithdrawHistoryItem[]> {
  const res = await fetch("/api/withdraw/history");
  if (!res.ok) throw new Error("Failed to load withdrawal history.");
  const json = (await res.json()) as { history: WithdrawHistoryItem[] };
  return json.history;
}

export async function submitWithdrawal(payload: {
  amount: number;
  bankId: string;
  method: string;
  note: string;
}): Promise<{ id: string; reference: string }> {
  const res = await fetch("/api/withdraw/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount:        payload.amount,
      bankAccountId: payload.bankId,
      method:        payload.method,
      note:          payload.note || undefined,
    }),
  });
  const json = (await res.json()) as { id?: string; reference?: string; error?: string; code?: string };
  if (!res.ok) throw Object.assign(new Error(json.error ?? "Withdrawal failed."), { code: json.code });
  return { id: json.id!, reference: json.reference! };
}
