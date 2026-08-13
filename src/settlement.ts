import { allocateEqualShares, money, type Money } from "./money.js";

export type Expense = Readonly<{
  id: string;
  name: string;
  amount: Money;
  paidBy: string;
  participantIds: readonly string[];
  occurredAt: string;
  notes?: string;
}>;

export type Payment = Readonly<{
  id: string;
  payerId: string;
  payeeId: string;
  amount: Money;
  paidAt: string;
  note?: string;
}>;

export type Balance = Readonly<{
  employeeId: string;
  amountMinor: number;
  currency: string;
}>;

export type SuggestedTransfer = Readonly<{
  debtorId: string;
  creditorId: string;
  amount: Money;
}>;

export type SettlementSnapshot = Readonly<{
  balances: readonly Balance[];
  suggestedTransfers: readonly SuggestedTransfer[];
}>;

function assertNonEmpty(value: string, field: string): void {
  if (!value.trim()) throw new Error(`${field} is required`);
}

export function createExpense(input: {
  id: string;
  name: string;
  amount: Money;
  paidBy: string;
  participantIds: readonly string[];
  occurredAt: string;
  notes?: string;
}): Expense {
  assertNonEmpty(input.id, "Expense id");
  assertNonEmpty(input.name, "Expense name");
  assertNonEmpty(input.paidBy, "Paid by");
  if (input.amount.amountMinor <= 0) throw new Error("Amount must be greater than zero");
  if (input.participantIds.length === 0) throw new Error("At least one participant is required");
  if (!input.participantIds.includes(input.paidBy)) throw new Error("Paid by must be one of the participants");
  if (new Set(input.participantIds).size !== input.participantIds.length) throw new Error("Participants must be unique");
  const date = new Date(input.occurredAt);
  if (Number.isNaN(date.getTime())) throw new Error("Occurred at must be a valid ISO date");

  return Object.freeze({
    ...input,
    participantIds: Object.freeze([...input.participantIds]),
  });
}

function addBalance(
  balances: Map<string, number>,
  employeeId: string,
  amountMinor: number,
): void {
  balances.set(employeeId, (balances.get(employeeId) ?? 0) + amountMinor);
}

/**
 * Positive balance means the employee is owed money. Negative means the employee owes money.
 * The calculation derives from expenses and never mutates those source records.
 */
export function calculateBalances(
  expenses: readonly Expense[],
  employeeIds: readonly string[] = [...new Set(expenses.flatMap((expense) => expense.participantIds))].sort(),
): readonly Balance[] {
  const balances = new Map<string, number>(employeeIds.map((id) => [id, 0]));

  for (const expense of expenses) {
    if (expense.amount.amountMinor <= 0) throw new Error("Expense amount must be greater than zero");
    if (!expense.participantIds.includes(expense.paidBy)) throw new Error("Paid by must be one of the participants");
    if (expense.amount.currency !== (expenses[0]?.amount.currency ?? expense.amount.currency)) {
      throw new Error("Mixed currencies are not supported in one settlement snapshot");
    }
    const shares = allocateEqualShares(expense.amount, expense.participantIds);
    addBalance(balances, expense.paidBy, expense.amount.amountMinor);
    expense.participantIds.forEach((participantId, index) => {
      const share = shares[index];
      if (!share) throw new Error("Share allocation failed");
      addBalance(balances, participantId, -share.amountMinor);
    });
  }

  const currency = expenses[0]?.amount.currency ?? "USD";
  const result = [...balances.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([employeeId, amountMinor]) => Object.freeze({ employeeId, amountMinor, currency }));

  const total = result.reduce((sum, balance) => sum + balance.amountMinor, 0);
  if (total !== 0) throw new Error("Balance conservation invariant failed");
  return Object.freeze(result);
}

/**
 * Greedy settlement. It minimizes total transferred amount and guarantees at most n-1 transfers,
 * but it does not claim the globally minimum payment count for every input.
 */
export function simplifyDebts(balances: readonly Balance[]): readonly SuggestedTransfer[] {
  const active = balances
    .filter((balance) => balance.amountMinor !== 0)
    .map((balance) => ({ ...balance }))
    .sort((left, right) => left.employeeId.localeCompare(right.employeeId));

  const total = active.reduce((sum, balance) => sum + balance.amountMinor, 0);
  if (total !== 0) throw new Error("Balances must sum to zero");

  const debtors = active.filter((balance) => balance.amountMinor < 0).map((balance) => ({ ...balance }));
  const creditors = active.filter((balance) => balance.amountMinor > 0).map((balance) => ({ ...balance }));
  const transfers: SuggestedTransfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    if (!debtor || !creditor) throw new Error("Settlement matching invariant failed");
    const amountMinor = Math.min(-debtor.amountMinor, creditor.amountMinor);
    if (amountMinor <= 0 || debtor.employeeId === creditor.employeeId) {
      throw new Error("Invalid settlement transfer");
    }
    transfers.push(Object.freeze({
      debtorId: debtor.employeeId,
      creditorId: creditor.employeeId,
      amount: money(amountMinor, debtor.currency),
    }));
    debtor.amountMinor += amountMinor;
    creditor.amountMinor -= amountMinor;
    if (debtor.amountMinor === 0) debtorIndex += 1;
    if (creditor.amountMinor === 0) creditorIndex += 1;
  }

  if (debtorIndex !== debtors.length || creditorIndex !== creditors.length) {
    throw new Error("Could not settle all balances");
  }
  return Object.freeze(transfers);
}

export function calculateSettlement(
  expenses: readonly Expense[],
  employeeIds?: readonly string[],
): SettlementSnapshot {
  const balances = calculateBalances(expenses, employeeIds);
  return Object.freeze({ balances, suggestedTransfers: simplifyDebts(balances) });
}

/** Payments are separate immutable records; recording one does not rewrite expenses or suggestions. */
export function createPayment(input: {
  id: string;
  payerId: string;
  payeeId: string;
  amount: Money;
  paidAt: string;
  note?: string;
}): Payment {
  assertNonEmpty(input.id, "Payment id");
  assertNonEmpty(input.payerId, "Payer");
  assertNonEmpty(input.payeeId, "Payee");
  if (input.payerId === input.payeeId) throw new Error("Payer and payee must be different");
  if (input.amount.amountMinor <= 0) throw new Error("Payment amount must be greater than zero");
  if (Number.isNaN(new Date(input.paidAt).getTime())) throw new Error("Paid at must be a valid ISO date");
  return Object.freeze({ ...input });
}

export function applyPaymentsToBalances(
  balances: readonly Balance[],
  payments: readonly Payment[],
): readonly Balance[] {
  const result = new Map(balances.map((balance) => [balance.employeeId, balance.amountMinor]));
  const currency = balances[0]?.currency ?? "USD";
  for (const payment of payments) {
    if (payment.amount.currency !== currency) throw new Error("Payment currency must match the balance currency");
    if (!result.has(payment.payerId) || !result.has(payment.payeeId)) throw new Error("Payment references an unknown employee");
    addBalance(result, payment.payerId, payment.amount.amountMinor);
    addBalance(result, payment.payeeId, -payment.amount.amountMinor);
  }
  return Object.freeze([...result.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([employeeId, amountMinor]) => Object.freeze({ employeeId, amountMinor, currency })));
}
