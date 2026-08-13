import assert from "node:assert/strict";
import test from "node:test";
import { parseMoney } from "../src/money.js";
import { buildSettlementResponse } from "../src/api.js";
import { toDashboardViewModel } from "../src/dashboard.js";
import { createExpense, calculateBalances, simplifyDebts } from "../src/settlement.js";

const expense = (input: Parameters<typeof createExpense>[0]) => createExpense(input);

test("builds a stable settlement response with explicit directions", () => {
  const response = buildSettlementResponse([
    expense({
      id: "e1", name: "Lunch", amount: parseMoney("120.00"), paidBy: "alice",
      participantIds: ["alice", "bob", "charlie"], occurredAt: "2026-08-13T12:00:00Z",
    }),
  ], undefined, "2026-08-13T13:00:00Z");

  assert.deepEqual(response, {
    data: {
      currency: "USD",
      calculatedAt: "2026-08-13T13:00:00Z",
      balances: [
        { employeeId: "alice", direction: "is_owed", amountMinor: 8000 },
        { employeeId: "bob", direction: "owes", amountMinor: 4000 },
        { employeeId: "charlie", direction: "owes", amountMinor: 4000 },
      ],
      suggestedTransfers: [
        { debtorId: "bob", creditorId: "alice", amountMinor: 4000, currency: "USD" },
        { debtorId: "charlie", creditorId: "alice", amountMinor: 4000, currency: "USD" },
      ],
      isSettled: false,
    },
  });
});

test("returns a settled state for zero balances", () => {
  const response = buildSettlementResponse([], ["alice", "bob"], "2026-08-13T13:00:00Z");
  const view = toDashboardViewModel(response);
  assert.equal(view.status, "settled");
  assert.equal(view.statusLabel, "Everyone is settled");
  assert.deepEqual(view.transfers, []);
  assert.ok(view.balances.every((balance) => balance.label.endsWith("is settled")));
});

test("dashboard labels never expose ambiguous signed amounts", () => {
  const response = buildSettlementResponse([
    expense({
      id: "e1", name: "Lunch", amount: parseMoney("10.00"), paidBy: "alice",
      participantIds: ["alice", "bob"], occurredAt: "2026-08-13T12:00:00Z",
    }),
  ], undefined, "2026-08-13T13:00:00Z");
  const view = toDashboardViewModel(response);
  assert.deepEqual(view.balances.map((balance) => balance.label), ["alice is owed", "bob owes"]);
  assert.equal(view.transfers[0]?.label, "bob → alice");
  assert.match(view.explanation, /current expenses/);
});

test("settlement preserves conservation for generated balance snapshots", () => {
  const balances = calculateBalances([
    expense({
      id: "e1", name: "Team meal", amount: parseMoney("99.99"), paidBy: "a",
      participantIds: ["a", "b", "c", "d"], occurredAt: "2026-08-13T12:00:00Z",
    }),
  ]);
  const transfers = simplifyDebts(balances);
  assert.equal(balances.reduce((sum, balance) => sum + balance.amountMinor, 0), 0);
  assert.ok(transfers.length <= balances.filter((balance) => balance.amountMinor !== 0).length - 1);
  assert.ok(transfers.every((transfer) => transfer.amount.amountMinor > 0));
});
