# Settlement Performance and Optimization Guarantees

The current settlement path is intentionally deterministic and bounded for the office-sized groups described by the product brief.

`calculateBalances` scans each expense and each participant share once. With `m` expense-participant allocations and `n` employees, its work is `O(m + n log n)` because the final balance output is sorted by employee ID. `simplifyDebts` sorts the active balance lists and then consumes at least one debtor or creditor on every transfer, so the practical settlement pass is `O(n log n + t)`, where `t` is the number of generated transfers.

The greedy algorithm minimizes the total amount transferred: that amount equals the sum of all positive balances. It guarantees at most `n - 1` transfers for `n` non-zero participants. It does not claim the absolute minimum number of payments for every input because that optimization problem is computationally hard in the general case.

The default implementation must not run exponential search in an API request. If exact minimum-payment optimization is introduced later, it should be protected by both a participant-count limit and a wall-clock timeout. The exact solver should fall back to the current deterministic result when the limit or timeout is reached.

For observability, a future application layer should record calculation duration, participant count, expense count, and generated transfer count. It should not log expense notes or other unnecessary personal data. The API should return the calculation timestamp so clients can identify the snapshot from which suggestions were derived.
