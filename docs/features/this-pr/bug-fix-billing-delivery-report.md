# Bug Fix: Billing delivery report and interrupted job runs

**Status:** OPEN decisions | **Date:** 2026-09-19 | **Moved out of** [archived/bug-fix-plan-v0.9.md](../archived/bug-fix-plan-v0.9.md) on its archival (2026-10-06)

Blocked by the OPEN decisions below; lands before Adhoc + EXPENSE writes the ledger. The two fixes share
surfaces (`JobRun`, the job history panel) — one package or sequenced.

## Billing delivery report

**Problem.** The monthly billing card, the job history and the toast count what the displayed run did
(`formatMonthlyBillingStats` in `useMaintenance.ts`). On prod, the CI smoke run 697 (2026-09-18 23:39) archived seven periods and
queued the September mail, then its request ended at the test's 30 s timeout and its `JobRun` holds no `resultSummary`. Runs 698
and 699 report the two remaining archives and nothing; `Delivery` holds the September mail with `jobRunId` 697.
**Root cause.** A run's report is the job's in-memory result, stored by `completeJobRun` when the run completes
(`monthlyBillingService.ts`). `Delivery` is read by the job's own decision only (`fetchDeliveries` in `syncBillingPeriod`).
**Solution.** The repository fills the delivery state on every read:
- `BillingPeriodSummaryDisplay` / `Detail` carry `delivered: DeliveredVersions` (the highest version per kind,
  `useDeliveryValidation.ts`). `fetchBillingPeriodDeliveries(d1, subjectId?)` in `financesRepository.ts` feeds the list, id and
  token reads in `prismaRepository.ts`: one query for all `BILLING_PERIOD` rows, grouped with `groupBy` from `batchUtils.ts`.
- `JobRunDisplay` carries `delivered: {ARCHIVE, EMAIL, SMS}`, the run's deliveries through the `JobRun → Delivery` relation
  (`fetchJobRuns` in `maintenanceRepository.ts`).
- `syncBillingPeriod` decides from `summary.delivered`; `fetchDeliveries` goes.

**Stored run summary — OPEN.** In `periods[]`, the period fields, `csvUploaded` / `emailSent`, `archive.archived` / `key` and
`notification.queued` / `dedupeKey` repeat the period row and `Delivery`. `results` and the failures (`archive.degraded`,
`notification.degraded`, `archive.archived: false`) exist there only. Proposal: the job stores `{results, failures}`, and the
monthly endpoint returns the periods re-read through the repository.
**Card — OPEN.** The card, the job history's Resultat and the toast keep their text; a change starts as a mockup signed off on its
own, in a UX package.
**TDD.** API specs: `GET /api/admin/billing/periods` gives each period its delivered versions; `GET /api/admin/maintenance/job-run`
gives a monthly run its deliveries per kind; after a monthly run every closed period's delivered versions equal its version, and a
second run leaves the same state.
**Affected.** `useBillingValidation.ts`, `useMaintenanceValidation.ts`, `financesRepository.ts`, `prismaRepository.ts`,
`maintenanceRepository.ts`, `monthlyBillingService.ts`.

## Admin economy past periods — unverified

From the 2026-04 bare-fetch notes (report folded into the release and deleted, 2026-10-07): "admin economy
doesn't load PAST periods — have to go to admin system and run billing". Repro by the user decides: live → a
root-cause section here; gone → this entry closes citing the January billing endpoints (`current-period`,
lazy invoices).

## Interrupted job runs — OPEN

**Problem.** A run whose request ends before `completeJobRun` stays `RUNNING`: prod run 697 (2026-09-18 23:39). The job history
lists it as running.
**Options.** The next run of the same job marks a `RUNNING` run older than a limit as `FAILED`; or the job history shows such a run
as "afbrudt".
