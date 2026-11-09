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
| Icons ship in the client bundle | § Icons ship in the client bundle | – | specified |
| npm audit | § npm audit | – | discovery |

## npm audit

### Problem

Dependabot opens weekly version pull requests (`.github/dependabot.yml`); no step reads npm's advisories, so a known
vulnerability in an installed package shows only to a developer who reads the summary `npm ci` prints.

### Solution

`make audit` runs `npm audit` at the agreed level and fails on a finding; the check job runs it after `npm ci`, and
`pre:all` runs it locally. An accepted finding is recorded with its advisory id and the date it is reviewed again.

OPEN: the level that fails (`high`, or `moderate`); the scope (production dependencies alone, or the dev dependencies
the build runs on too); where an accepted finding is recorded (the runbook, or a tool with an ignore list); a scheduled
run on main beside Dependabot, or the pull-request gate alone.

### Affected

`Makefile`, `package.json`, `.github/workflows/cicd.yml`, `docs/ops-runbook.md`, `.claude/skills/prepare-to-ship/SKILL.md`.

## Icons ship in the client bundle

### Problem

The icon module's scan reads templates only, while the app names its icons in the design system and the UI
composables, so the client bundle holds none of them: every page fetches its icons from the Worker, which packs every
installed collection whole, most of its size, and a component spec, with no Worker to answer, logs one warning per
icon per mount.

### Solution

The design system is the one file that names icons, and the scan reads that file, so every icon the app names ships in
the browser bundle and renders with the page; a component binds a token, never a name. The Worker packs no collection;
a name the scan does not see is fetched from the Iconify CDN at runtime. Four icons
that stood alone in their collection take a glyph from a collection the app draws on: the power row's alert carries
the bolt of its button, the logout button a waving hand, the armed delete button a skull, the admin entry a wrench. The
team badge keeps its icon. The four icon names written in components bind tokens (`ICONS.swap`, `ICONS.arrowRight`
through a computed default, `ICONS.robotDead`, `ICONS.confusedFace`), and the architecture spec fails an icon name
outside the design system and an installed collection no token names (ADR-018, compliance 5).

### Decisions

- 2026-11-08: the client bundle from a scan over templates and `.ts`; the server bundle is remote, so a missed name
  still renders and the Worker carries no icons.
- 2026-11-08: `powerMode.icon` is `i-heroicons-bolt`, `ICONS.logout` `i-hugeicons-waving-hand-01`,
  `ICONS.dangerConfirm` `i-hugeicons-skull`, `ICONS.admin` `i-heroicons-wrench-screwdriver`; `ICONS.team` stays
  `i-fluent-mdl2-team-favorite`.
- 2026-11-08: `@iconify-json/material-symbols`, `streamline`, `healthicons`, `pajamas` and `tdesign` leave
  `package.json`; `fluent-emoji-high-contrast` stays for the error page's confused face (`ViewError.vue`).

### Affected

`nuxt.config.ts`, `app/composables/useTheSlopeDesignSystem.ts`, `package.json`, `ViewError.vue`, `ActionCard.vue`,
`WorkAssignment.vue`, `tests/component/architecture/designSystemUsage.unit.spec.ts`, `docs/adr.md` (ADR-018),
`docs/testing.md`, `docs/ui.md`.

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
