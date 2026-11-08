# 0.9.2 chores

**Status:** Proposed | **Date:** 2026-10-25 | **Builds on:** release 0.9.1 (`../archived/release-0.9.1/chores-0.9.1.md`)

A chore release: the booking emails go on, and two bug fixes.

## Delivered

| Delivery | Description or spec | Gherkin | Status |
|---|---|---|---|

## In flight

| Delivery | Description or spec | Gherkin | Status |
|---|---|---|---|
| Booking emails on | § Booking emails on | – | specified |
| Billing delivery report and interrupted job runs | `bug-fix-billing-delivery-report.md` | – | discovery |
| Chef's available budget after the ticket deadline | `bug-fix-chef-budget-drift.md` | – | discovery |
| Household lookup | § Household lookup | – | moved from 0.9.1 on 2026-11-02 |
| Release notes PDF removed | § Release notes PDF removed | – | specified |
| E2E suites fan out in CI | § E2E suites fan out in CI | – | specified |
| Build once, test locally, ship the artifact | § Build once, test locally, ship the artifact | – | specified |

## Build once, test locally, ship the artifact

### Problem

Every e2e runner starts the dev server from scratch after installing, and the deploy stage builds the app again: four
cold builds test code that a fifth build ships.

### Solution

The check stage builds the app once and keeps the build as the run's artifact. An e2e row takes the build and runs its
suite against it under wrangler's local runtime on the runner (localhost, the local D1); the runtime takes the server's
variables and the local address from the row's environment, nothing is written to disk. The deploy stage builds and ships. Smoke tests run on the deployed address.

Locally the same run is `npm run build && CI=true npm run test:e2e`: `CI` picks the built app under the local runtime on
port 3000, one worker and two retries, and a dev server on that port stops it with a clear message; without it the
suites run on the dev server, or reuse the one already up. The pre-ship gate runs that sequence.

### Decisions

- 2026-11-08: the e2e suites run on the build artifact in CI; the check stage builds it, the deploy stage keeps its build.
- 2026-11-08: `CI` is the switch locally too; no new variable, no new command.

### Affected

`.github/workflows/cicd.yml`, `playwright.config.ts`, `docs/testing.md`, `docs/ops-runbook.md`,
`.claude/skills/prepare-to-ship/SKILL.md`.

## E2E suites fan out in CI

### Problem

The pipeline is one job: the api, ui and ui serial suites run one after another on one runner and one D1, after the
unit tests. The serial projects depend on the parallel ones, so the ui serial script runs with `--no-deps` and takes
its login state from the ui run before it.

### Solution

Three stages: `check` (version, generated layer, lint, typecheck, unit tests), `e2e` (a matrix of four suites on a
runner and a local D1 each: api, api-serial, ui, ui-serial; the api rows gate, the ui rows report) and `deploy`;
create-release, rollback and smoke-tests read the deploy outputs. A serial project depends on the setup projects and
caps itself at one worker, so each suite runs alone, locally in the `test:e2e` chain and on CI. `playwright.config.ts`
names the json and Cucumber reports after `BDD_SUITE`; on CI its web server waits 180 s for the cold `nuxt dev` and
pipes the server's output into the step log. Artifacts per suite: `playwright-report-<suite>` and
`bdd-<suite>`; the developer companion downloads `bdd-*` by pattern. One composite action installs Node, the
dependencies and Chromium.

### Affected

`.github/workflows/cicd.yml`, `.github/workflows/developer.yml`, `.github/actions/setup/action.yml`,
`playwright.config.ts`, `package.json`, `Makefile`, `docs/testing.md`, `.claude/skills/prepare-to-ship/SKILL.md`,
`docs/features/release-1.0.0/chores-1.0.0.md`.

## Release notes PDF removed

### Problem

`make release-notes` renders `docs/releases/*.md` to a one-page PDF; `cicd.yml` runs it after the e2e suites and
`create-release` attaches the PDFs. The notes live in `docs/release-notes/`, so the guard on the poster head fails the
pipeline at the end of every run.

### Solution

A release's notes and their poster live with the release, `docs/features/archived/release-0.9.0/release-notes-0.9.0/`
(markdown and PDF); `create-release` writes the release's one-line body. Removed: the target, its CI step, the artifact
`release-notes`, the release attachment and `poster.head.html`.

### Affected

`Makefile`, `.github/workflows/cicd.yml`, `docs/features/archived/release-0.9.0/`.

## Booking emails on

The booking emails go out from this release (`../archived/release-0.9.1/feature-notification-delivery.md`, the booking emails flag).

1. The delivery dry run on prod: `make theslope-sender-dry-run-booking-status-prod` lists per user the booking emails the first
   run sends.
2. `wrangler.toml`:

```toml
[env.dev.vars]
SHOULD_SEND_BOOKING_EMAILS_FLAG = "true"
[env.prod.vars]
SHOULD_SEND_BOOKING_EMAILS_FLAG = "true"
```

3. The pull request deploys dev, the merge to main deploys prod (`../../ops-runbook.md` § Deployment Routing Table).
4. The guides name the booking mails: in `user-guide.md` a ticket from the waiting list and a sold ticket send a mail,
   in `chef-guide.md` the portions Frigiv gives to the first in line send them a mail.

## Household lookup

Moved from 0.9.1 on 2026-11-02.

### Problem

The admin economy page's PBS view joins the upcoming orders with the households list in the browser and renders before
that list arrives: orders drop out, and the household amounts fall short of the total until it loads.

### Solution

The order's cost context serves the household in the same query (id, PBS number, address: the shape of the
transaction's order snapshot); the view groups by it and joins nothing. The household edit panel finds a row's household
by the row's `householdId` and loses its copy of the lookup. `KitchenPreparation` keeps the store's lookup, since a
waiting-list entry names only its inhabitant.

### Affected

`server/data/financesRepository.ts`, `app/composables/useBookingValidation.ts`, `app/stores/bookings.ts`,
`app/components/admin/AdminEconomy.vue`, `app/components/admin/HouseholdEditPanel.vue`; `order.e2e.spec.ts`,
`AdminEconomy.nuxt.spec.ts`, `HouseholdEditPanel.nuxt.spec.ts`, `bookings.nuxt.spec.ts`.
