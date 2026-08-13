import { calculateSettlement, type Expense, type SettlementSnapshot } from "./settlement.js";

export type SettlementResponse = Readonly<{
  data: Readonly<{
    currency: string;
    calculatedAt: string;
    balances: readonly Readonly<{
      employeeId: string;
      direction: "owes" | "is_owed" | "settled";
      amountMinor: number;
    }>[];
    suggestedTransfers: readonly Readonly<{
      debtorId: string;
      creditorId: string;
      amountMinor: number;
      currency: string;
    }>[];
    isSettled: boolean;
  }>;
}>;

function direction(amountMinor: number): "owes" | "is_owed" | "settled" {
  if (amountMinor < 0) return "owes";
  if (amountMinor > 0) return "is_owed";
  return "settled";
}

export function toSettlementResponse(
  snapshot: SettlementSnapshot,
  calculatedAt: string,
): SettlementResponse {
  const currency = snapshot.balances[0]?.currency ?? snapshot.suggestedTransfers[0]?.amount.currency ?? "USD";
  return Object.freeze({
    data: Object.freeze({
      currency,
      calculatedAt,
      balances: Object.freeze(snapshot.balances.map((balance) => Object.freeze({
        employeeId: balance.employeeId,
        direction: direction(balance.amountMinor),
        amountMinor: Math.abs(balance.amountMinor),
      }))),
      suggestedTransfers: Object.freeze(snapshot.suggestedTransfers.map((transfer) => Object.freeze({
        debtorId: transfer.debtorId,
        creditorId: transfer.creditorId,
        amountMinor: transfer.amount.amountMinor,
        currency: transfer.amount.currency,
      }))),
      isSettled: snapshot.suggestedTransfers.length === 0,
    }),
  });
}

export function buildSettlementResponse(
  expenses: readonly Expense[],
  employeeIds?: readonly string[],
  calculatedAt = new Date().toISOString(),
): SettlementResponse {
  return toSettlementResponse(calculateSettlement(expenses, employeeIds), calculatedAt);
}
