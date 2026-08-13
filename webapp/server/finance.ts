export type FinanceEmployee = { id: number; name: string; active: number };
export type FinanceExpense = { id: number; amountMinor: number; paidById: number; currency: string; active: number };
export type FinanceShare = { expenseId: number; employeeId: number; amountMinor: number };
export type FinancePayment = { payerId: number; payeeId: number; amountMinor: number; currency: string };

export function splitEvenly(amountMinor: number, employeeIds: number[]): Array<{ employeeId: number; amountMinor: number }> {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) throw new Error("Amount must be a positive integer minor-unit value");
  if (employeeIds.length === 0) throw new Error("At least one participant is required");
  const base = Math.floor(amountMinor / employeeIds.length);
  const remainder = amountMinor % employeeIds.length;
  return employeeIds.map((employeeId, index) => ({ employeeId, amountMinor: base + (index < remainder ? 1 : 0) }));
}

export function validatePayment(input: { payerId: number; payeeId: number; amountMinor: number }) {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error("Payment amount must be positive minor units");
  if (input.payerId === input.payeeId) throw new Error("Payer and payee must be different");
  return true;
}

export function calculateBalances(
  employees: FinanceEmployee[],
  expenses: FinanceExpense[],
  shares: FinanceShare[],
  payments: FinancePayment[],
) {
  const balances = new Map<number, number>(employees.filter((employee) => employee.active === 1).map((employee) => [employee.id, 0]));
  const shareMap = new Map<number, FinanceShare[]>();
  for (const share of shares) shareMap.set(share.expenseId, [...(shareMap.get(share.expenseId) ?? []), share]);

  for (const expense of expenses.filter((item) => item.active === 1)) {
    balances.set(expense.paidById, (balances.get(expense.paidById) ?? 0) + expense.amountMinor);
    for (const share of shareMap.get(expense.id) ?? []) {
      balances.set(share.employeeId, (balances.get(share.employeeId) ?? 0) - share.amountMinor);
    }
  }

  for (const payment of payments) {
    balances.set(payment.payerId, (balances.get(payment.payerId) ?? 0) + payment.amountMinor);
    balances.set(payment.payeeId, (balances.get(payment.payeeId) ?? 0) - payment.amountMinor);
  }

  return employees.filter((employee) => employee.active === 1).map((employee) => ({
    employeeId: employee.id,
    name: employee.name,
    balanceMinor: balances.get(employee.id) ?? 0,
    state: (balances.get(employee.id) ?? 0) > 0 ? "is_owed" : (balances.get(employee.id) ?? 0) < 0 ? "owes" : "settled",
  } as const));
}

export function simplifyDebts(balances: Array<{ employeeId: number; name: string; balanceMinor: number }>) {
  const debtors = balances.filter((item) => item.balanceMinor < 0).map((item) => ({ ...item, remaining: -item.balanceMinor })).sort((a, b) => a.employeeId - b.employeeId);
  const creditors = balances.filter((item) => item.balanceMinor > 0).map((item) => ({ ...item, remaining: item.balanceMinor })).sort((a, b) => a.employeeId - b.employeeId);
  const transfers: Array<{ debtorId: number; debtorName: string; creditorId: number; creditorName: string; amountMinor: number }> = [];
  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]!;
    const creditor = creditors[creditorIndex]!;
    const amountMinor = Math.min(debtor.remaining, creditor.remaining);
    if (amountMinor > 0) transfers.push({ debtorId: debtor.employeeId, debtorName: debtor.name, creditorId: creditor.employeeId, creditorName: creditor.name, amountMinor });
    debtor.remaining -= amountMinor;
    creditor.remaining -= amountMinor;
    if (debtor.remaining === 0) debtorIndex += 1;
    if (creditor.remaining === 0) creditorIndex += 1;
  }
  return transfers;
}
