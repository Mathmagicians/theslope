# 1.0.0 chores

**Status:** Proposed | **Date:** 2026-10-28 | **Builds on:** release 0.9.3 (`../release-0.9.3/feature-0.9.3.md`)

## Delivered

| Delivery | Description or spec | Gherkin | Status |
|---|---|---|---|

## In flight

| Delivery | Description or spec | Gherkin | Status |
|---|---|---|---|
| UI suites fail the build | § UI suites fail the build | – | specified |
| Map.groupBy in the Workers runtime | § Map.groupBy in the Workers runtime | – | specified |
| Catch-up amounts | § Catch-up amounts | – | specified |
| Job schedule module | § Job schedule module | – | specified |
| Dependency clusters | § Dependency clusters | – | specified |

## UI suites fail the build

Priority: medium. Added 2026-10-19 from the e2e work on the UI suites (release 0.9, CI test reporting). Runs once the
suites have stayed stable over a few pull requests.

### Problem

`.github/workflows/cicd.yml` runs the ui step (`npm run test:e2e:ui`) and the ui serial step with
`continue-on-error: true` and prints their reports to the run summary with a "do not fail the pipeline" note: a red
UI case leaves the build green.

### Solution

Both steps gate the build: `continue-on-error` goes from each step, and the note goes from its summary line. The api
step is the model.

## Map.groupBy in the Workers runtime

### Problem

`Map.groupBy` failed in the Workers runtime on 2026-01-20 (cc05ea9, the commit that added `groupBy` to
`app/utils/batchUtils.ts`) although the Workers docs (Runtime APIs, Web standards) state the runtime tracks the V8 of
the current Chrome stable, where the method has shipped since Chrome 117. ADR-013 rule 7 records the finding; the
cause, a compatibility flag or date gating the method, is not named anywhere in our docs.

### Solution

The Cloudflare compatibility-flags page and the workerd changelog name the flag or date that enables the ES2024
grouping methods. With that reference the rule names the flag, the compatibility date moves past it, the helper leaves
with its unit cases, and the call sites in `server/` and the stores use the method. Without it the rule and the helper
stay.

### Affected

`docs/adr.md` ADR-013 rule 7, `app/utils/batchUtils.ts` (`groupBy`), its call sites in `server/` and `app/stores/`.

## Catch-up amounts

### Problem

A transaction billed into an already-closed period (ADR-015 catch-up: a straggler order transacted after the period's
first run) is linked to the household's existing invoice, but the invoice `amount` stays at its creation value and the
period's stored aggregates stay at the first run's values. The accountant CSV is built from `invoice.amount`
(`useBillingValidation.ts` `generateCsvRow`), so the straggler reaches the CSV as a version bump with unchanged figures;
the public page shows the mismatch as `invoiceSum` ≠ `transactionSum`. In `server/utils/generateBilling.ts`
`processBillingPeriod`, `totalAmount`, `householdCount` and `ticketCount` are written by `createBillingPeriodSummary`
only, an existing summary is reused as is, and households with an existing invoice only get transactions linked.

### Solution

After linking, in the same `processBillingPeriod` call: `addToInvoiceAmount(d1, invoiceId, delta)` for each household
that already had an invoice (delta = the sum of the transactions linked now) and
`addToBillingPeriodTotals(d1, summaryId, {totalAmount, householdCount: newInvoices.length, ticketCount})` for an
existing summary. Both are increments of exactly the transactions linked in this run; a transaction is linked once
(unbilled → invoiced), so a re-run adds nothing (ADR-015). `bumpBillingPeriodVersion` stays; the v2 CSV and the
`BILLING_PERIOD_UPDATED` mail carry the corrected figures. Two repository functions in `financesRepository.ts`
(`prisma.invoice.update` / `prisma.billingPeriodSummary.update` with `increment`).

### TDD

`tests/e2e/features/jobs/monthly-billing.feature`, a scenario: after the first billing, one more order in the same period
(order → consume → daily maintenance), billing again → the household's invoice `amount` and the period's
`totalAmount` / `ticketCount` include it, `version` is 2, `invoiceSum` = `transactionSum` on the period detail. The
control sums (`useBilling` `controlInvoices` / `controlTransactions`) already assert equality.

### Affected

`server/utils/generateBilling.ts`, `server/data/financesRepository.ts`, the serial maintenance spec,
`docs/adr-compliance-backend.md` (Admin – Billing row).

## Job schedule module

### Problem

One schedule is written in five places — `wrangler.toml` `[triggers] crons` in the three environment blocks,
`nuxt.config.ts` `nitro.scheduledTasks`, `app.config.ts` `theslope.systemJobs` — and labelled in
`systemJobs[].description`, which `AdminSystem.vue` shows. The monthly job runs `0 3 18 * *`: the 18th at
03:00 UTC, 05:00 in summer time and 04:00 in winter time; the labels carry the winter clock only ("kl. 02:00",
"kl. 03:00", "kl. 04:00").

### Solution

`app/config/systemJobs.ts`, a plain module (the `notificationTemplates.ts` pattern): per job its cron and its Danish
label with the UTC time and the Copenhagen summer and winter times. `nuxt.config.ts` builds `scheduledTasks` from it,
`app.config.ts` spreads it into `theslope.systemJobs`, whose labels `AdminSystem.vue` shows. The three `wrangler.toml`
`crons` lists stay per environment block (TOML).

### Mockup

Text only, on the job cards and the job-run table of `/admin/system` — ⏳ awaiting signoff:

```
Månedlig fakturering    D. 18. hver måned kl. 05:00 (sommertid) / 04:00 (vintertid)
```

### TDD

Unit: every `systemJobs` cron is a key of `scheduledTasks` and appears in each `wrangler.toml` `crons` list (parsed with
wrangler's own config reader); the `theslope.systemJobs` labels equal the module's labels.

### Affected

`app/config/systemJobs.ts` (new), `nuxt.config.ts`, `app/app.config.ts`.

## Dependency clusters

### Problem

Three majors wait on upstream: `typescript` 7 (`vue-tsc` on TypeScript 7.1), `@types/node` 26 (Node 26) and `h3` 2
(Nuxt 5). The ADR-017 follow-up, Nuxt's root `references` layout with `nuxt typecheck` as the gate, waited on
nuxt/nuxt#34385; `nuxt typecheck` runs clean on `feature/work-roster` (2026-10-13).

### Solution

Each major moves through an explicit install the day its gate opens, one package each with `npm run pre:all`,
`make unit-test` and the api suite. `nuxt typecheck` replaces the three `vue-tsc` projects in `pre:all` and the CI
step once its run time on CI is known; `server/tsconfig.json` stays until then.

### Affected

`package.json`, `package-lock.json`, `.github/workflows/cicd.yml`, `docs/adr.md` ADR-017 (the gate), `CLAUDE.md` (the commands).

