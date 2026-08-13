import type { SettlementResponse } from "./api.js";

export type DashboardBalanceRow = Readonly<{
  employeeId: string;
  label: string;
  amountMinor: number;
  currency: string;
}>;

export type DashboardTransferRow = Readonly<{
  label: string;
  debtorId: string;
  creditorId: string;
  amountMinor: number;
  currency: string;
}>;

export type DashboardViewModel = Readonly<{
  status: "settled" | "needs_action";
  statusLabel: string;
  balances: readonly DashboardBalanceRow[];
  transfers: readonly DashboardTransferRow[];
  explanation: string;
}>;

export function toDashboardViewModel(response: SettlementResponse): DashboardViewModel {
  const { data } = response;
  const balances = data.balances.map((balance) => Object.freeze({
    employeeId: balance.employeeId,
    label: balance.direction === "owes"
      ? `${balance.employeeId} owes`
      : balance.direction === "is_owed"
        ? `${balance.employeeId} is owed`
        : `${balance.employeeId} is settled`,
    amountMinor: balance.amountMinor,
    currency: data.currency,
  }));
  const transfers = data.suggestedTransfers.map((transfer) => Object.freeze({
    label: `${transfer.debtorId} → ${transfer.creditorId}`,
    debtorId: transfer.debtorId,
    creditorId: transfer.creditorId,
    amountMinor: transfer.amountMinor,
    currency: transfer.currency,
  }));

  return Object.freeze({
    status: data.isSettled ? "settled" : "needs_action",
    statusLabel: data.isSettled ? "Everyone is settled" : "Suggested payments",
    balances: Object.freeze(balances),
    transfers: Object.freeze(transfers),
    explanation: "Suggestions are calculated from the current expenses and may change when expenses or payments change.",
  });
}
