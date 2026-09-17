# Bug Fix: Catch-up billing keeps invoice amounts and period totals at their first value

**Status:** Parked (2026-09-18, process alignment first) | **Date:** 2026-09-17 | **Updated:** 2026-09-18
**Branch:** `bugfix/admin-ux` (found while building the accountant mail; see `feature-proposal-notifications.md`)

## Fix Inventory

| Fix | Status |
|-----|--------|
| Catch-up amounts — invoice `amount` and period `totalAmount` / `householdCount` / `ticketCount` follow the transactions linked later | ⏳ awaiting sign-off |

## Catch-up amounts

**Problem.** A transaction billed into an already-closed period (ADR-015 catch-up: a straggler order transacted after the period's first run) is linked to the household's existing invoice, but the invoice `amount` stays at its creation value and the period's stored aggregates stay at the first run's values. The accountant CSV is built from `invoice.amount` (`useBillingValidation.ts` `generateCsvRow`), so the straggler reaches the CSV as a version bump with unchanged figures; the public page shows the mismatch as `invoiceSum` ≠ `transactionSum`.

**Root cause.** `server/utils/generateBilling.ts` `processBillingPeriod`: `totalAmount`, `householdCount`, `ticketCount` are written only by `createBillingPeriodSummary` (`:144-151`); an existing summary is reused as is (`:139-142`); households with an existing invoice skip `createInvoices` (`:164-183`) and only get transactions linked (`:195`). No write touches `Invoice.amount` or the summary after creation.

**Solution.** After linking, in the same `processBillingPeriod` call:
- `addToInvoiceAmount(d1, invoiceId, delta)` for each household that already had an invoice (delta = Σ of the transactions linked now).
- `addToBillingPeriodTotals(d1, summaryId, {totalAmount, householdCount: newInvoices.length, ticketCount})` for an existing summary.
Both are increments of exactly the transactions linked in this run; a transaction is linked once (unbilled → invoiced), so a re-run adds nothing (ADR-015). `bumpBillingPeriodVersion` stays as it is; the v2 CSV and the `BILLING_PERIOD_UPDATED` mail then carry the corrected figures. Two repository functions in `financesRepository.ts` (`prisma.invoice.update` / `prisma.billingPeriodSummary.update` with `increment`).

**TDD.**
- `tests/e2e/api/serial/admin/maintenance.e2e.spec.ts`: after the first billing, transact one more order in the same period (order → consume → daily maintenance), run billing again → the household's invoice `amount` and the period's `totalAmount` / `ticketCount` include it, `version` is 2, `invoiceSum` = `transactionSum` on the period detail.
- Unit: none new — the arithmetic is the repository increment; the control sums (`useBilling` `controlInvoices` / `controlTransactions`) already assert equality.

**Affected areas.** `server/utils/generateBilling.ts`, `server/data/financesRepository.ts`, the serial maintenance spec, `docs/adr-compliance-backend.md` (Admin – Billing row).
