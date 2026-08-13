import { describe, expect, it } from "vitest";
import { calculateBalances, simplifyDebts, splitEvenly, validatePayment } from "./finance";

describe("finance ledger", () => {
  it("splits minor units deterministically with the remainder assigned first", () => {
    expect(splitEvenly(100, [3, 1, 2])).toEqual([
      { employeeId: 3, amountMinor: 34 },
      { employeeId: 1, amountMinor: 33 },
      { employeeId: 2, amountMinor: 33 },
    ]);
  });

  it("derives zero-sum balances from expenses and payments", () => {
    const employees = [{ id: 1, name: "A", active: 1 }, { id: 2, name: "B", active: 1 }, { id: 3, name: "C", active: 1 }];
    const balances = calculateBalances(
      employees,
      [{ id: 10, amountMinor: 900, paidById: 1, currency: "USD", active: 1 }],
      [{ expenseId: 10, employeeId: 1, amountMinor: 300 }, { expenseId: 10, employeeId: 2, amountMinor: 300 }, { expenseId: 10, employeeId: 3, amountMinor: 300 }],
      [{ payerId: 2, payeeId: 1, amountMinor: 100, currency: "USD" }],
    );
    expect(balances.map((item) => item.balanceMinor)).toEqual([500, -200, -300]);
    expect(balances.reduce((sum, item) => sum + item.balanceMinor, 0)).toBe(0);
  });

  it("keeps completed payments separate and rejects invalid payment pairs", () => {
    expect(validatePayment({ payerId: 1, payeeId: 2, amountMinor: 250 })).toBe(true);
    expect(() => validatePayment({ payerId: 1, payeeId: 1, amountMinor: 250 })).toThrow("different");
    expect(() => validatePayment({ payerId: 1, payeeId: 2, amountMinor: 0 })).toThrow("positive");
  });

  it("creates deterministic debtor-to-creditor suggestions", () => {
    expect(simplifyDebts([
      { employeeId: 2, name: "B", balanceMinor: -300 },
      { employeeId: 1, name: "A", balanceMinor: 100 },
      { employeeId: 3, name: "C", balanceMinor: 200 },
    ])).toEqual([
      { debtorId: 2, debtorName: "B", creditorId: 1, creditorName: "A", amountMinor: 100 },
      { debtorId: 2, debtorName: "B", creditorId: 3, creditorName: "C", amountMinor: 200 },
    ]);
  });
});
