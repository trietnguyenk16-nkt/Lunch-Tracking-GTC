import assert from "node:assert/strict";
import test from "node:test";
import { allocateEqualShares, money, parseMoney } from "../src/money.js";
import {
  applyPaymentsToBalances,
  calculateBalances,
  calculateSettlement,
  createExpense,
  createPayment,
  simplifyDebts,
} from "../src/settlement.js";

const expense = (input: Parameters<typeof createExpense>[0]) => createExpense(input);

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

test("parses exact minor units and rejects fractional-cent input", () => {
  assert.equal(parseMoney("12.34").amountMinor, 1234);
  assert.equal(parseMoney("12.3").amountMinor, 1230);
  assert.throws(() => parseMoney("12.345"));
  assert.throws(() => parseMoney("-1.00"));
});

test("equal allocation assigns remainder deterministically to earlier participants", () => {
  const shares = allocateEqualShares(money(100), ["alice", "bob", "charlie"]);
  assert.deepEqual(shares.map((share) => share.amountMinor), [34, 33, 33]);
  assert.equal(sum(shares.map((share) => share.amountMinor)), 100);
});

test("rejects invalid expenses and keeps the source expense immutable", () => {
  assert.throws(() => expense({
    id: "e1", name: "Lunch", amount: parseMoney("120.00"), paidBy: "dana",
    participantIds: ["alice", "bob"], occurredAt: "2026-08-13T12:00:00Z",
  }));
  const source = expense({
    id: "e1", name: "Lunch", amount: parseMoney("120.00"), paidBy: "alice",
    participantIds: ["alice", "bob", "charlie"], occurredAt: "2026-08-13T12:00:00Z",
  });
  const before = JSON.stringify(source);
  calculateBalances([source]);
  assert.equal(JSON.stringify(source), before);
});

test("calculates the example balances from the immutable expense ledger", () => {
  const lunch = expense({
    id: "e1", name: "Lunch", amount: parseMoney("120.00"), paidBy: "alice",
    participantIds: ["alice", "bob", "charlie"], occurredAt: "2026-08-13T12:00:00Z",
  });
  assert.deepEqual(calculateBalances([lunch]), [
    { employeeId: "alice", amountMinor: 8000, currency: "USD" },
    { employeeId: "bob", amountMinor: -4000, currency: "USD" },
    { employeeId: "charlie", amountMinor: -4000, currency: "USD" },
  ]);
});

test("includes employees with no activity when employee IDs are provided", () => {
  const balances = calculateBalances([], ["charlie", "alice"]);
  assert.deepEqual(balances, [
    { employeeId: "alice", amountMinor: 0, currency: "USD" },
    { employeeId: "charlie", amountMinor: 0, currency: "USD" },
  ]);
});

test("simplifies balances deterministically with exact conservation", () => {
  const balances = [
    { employeeId: "alice", amountMinor: 8000, currency: "USD" },
    { employeeId: "bob", amountMinor: -4000, currency: "USD" },
    { employeeId: "charlie", amountMinor: -4000, currency: "USD" },
  ] as const;
  const transfers = simplifyDebts(balances);
  assert.deepEqual(transfers, [
    { debtorId: "bob", creditorId: "alice", amount: money(4000) },
    { debtorId: "charlie", creditorId: "alice", amount: money(4000) },
  ]);
  assert.equal(sum(transfers.map((transfer) => transfer.amount.amountMinor)), 8000);
  assert.ok(transfers.length <= balances.length - 1);
});

test("handles exact matches and all-zero balances without self-transfers", () => {
  assert.deepEqual(simplifyDebts([
    { employeeId: "a", amountMinor: -100, currency: "USD" },
    { employeeId: "b", amountMinor: 100, currency: "USD" },
    { employeeId: "c", amountMinor: 0, currency: "USD" },
  ]), [{ debtorId: "a", creditorId: "b", amount: money(100) }]);
  assert.deepEqual(simplifyDebts([
    { employeeId: "a", amountMinor: 0, currency: "USD" },
    { employeeId: "b", amountMinor: 0, currency: "USD" },
  ]), []);
});

test("keeps suggestions separate from recorded payments", () => {
  const lunch = expense({
    id: "e1", name: "Lunch", amount: parseMoney("120.00"), paidBy: "alice",
    participantIds: ["alice", "bob", "charlie"], occurredAt: "2026-08-13T12:00:00Z",
  });
  const snapshot = calculateSettlement([lunch]);
  const payment = createPayment({
    id: "p1", payerId: "bob", payeeId: "alice", amount: money(4000),
    paidAt: "2026-08-13T13:00:00Z",
  });
  assert.equal(snapshot.suggestedTransfers.length, 2);
  assert.deepEqual(applyPaymentsToBalances(snapshot.balances, [payment]), [
    { employeeId: "alice", amountMinor: 4000, currency: "USD" },
    { employeeId: "bob", amountMinor: 0, currency: "USD" },
    { employeeId: "charlie", amountMinor: -4000, currency: "USD" },
  ]);
  assert.equal(snapshot.suggestedTransfers[0]?.amount.amountMinor, 4000);
  assert.throws(() => createPayment({
    id: "bad", payerId: "alice", payeeId: "alice", amount: money(1), paidAt: "2026-08-13T13:00:00Z",
  }));
});

test("recomputes balances after expense changes instead of mutating history", () => {
  const lunch = expense({
    id: "e1", name: "Lunch", amount: parseMoney("120.00"), paidBy: "alice",
    participantIds: ["alice", "bob", "charlie"], occurredAt: "2026-08-13T12:00:00Z",
  });
  const snack = expense({
    id: "e2", name: "Snack", amount: parseMoney("30.00"), paidBy: "bob",
    participantIds: ["alice", "bob"], occurredAt: "2026-08-13T15:00:00Z",
  });
  const original = JSON.stringify(lunch);
  const before = calculateSettlement([lunch]);
  const after = calculateSettlement([lunch, snack]);
  assert.notDeepEqual(before.balances, after.balances);
  assert.equal(JSON.stringify(lunch), original);
});
