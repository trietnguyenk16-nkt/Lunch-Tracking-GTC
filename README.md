# Lunch Tracking GTC

This repository currently contains the expense-settlement domain layer for issues [#1](https://github.com/trietnguyenk16-nkt/Lunch-Tracking-GTC/issues/1) through [#4](https://github.com/trietnguyenk16-nkt/Lunch-Tracking-GTC/issues/4).

## Implemented behavior

Money is represented as an integer number of minor units plus a three-letter currency code. Decimal input accepts at most two fractional digits and is converted without floating-point arithmetic. Equal splits allocate any remainder deterministically to the first participants in the supplied participant order, ensuring that allocated shares always sum exactly to the expense total.

Expenses are immutable validated records. `calculateBalances` derives balances from the expense snapshot and does not mutate historical expenses. A positive balance means that the employee is owed money; a negative balance means that the employee owes money. The function validates conservation: all balances must sum to zero.

`simplifyDebts` produces derived debtor-to-creditor suggestions from a balance snapshot. It uses deterministic employee-ID ordering, never creates self-transfers or zero transfers, preserves every balance exactly, minimizes the total amount transferred, and produces no more than `n - 1` transfers for `n` non-zero participants. It is intentionally documented as a practical greedy algorithm rather than a claim of globally minimum payment count.

Payments are separate immutable records. `createPayment` validates a completed transfer, while `applyPaymentsToBalances` applies recorded payments to a balance snapshot without rewriting or mutating expenses or the original settlement suggestions.

## Development

```bash
npm install
npm run typecheck
npm test
```

The domain entry points are currently `src/money.ts` and `src/settlement.ts`. The test suite in `test/settlement.test.ts` covers parsing, rounding, invalid inputs, conservation, deterministic settlement, zero balances, payment separation, and recomputation after expense changes.

## Design boundary

This implementation is deliberately independent of HTTP, database, authentication, and UI layers. The next application phase can persist the immutable expense and payment records, call `calculateSettlement` from a service or read model, and expose the returned balances and suggestions through the REST API described in issue #5.
