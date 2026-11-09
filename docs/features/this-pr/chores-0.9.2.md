# 0.9.2 chores

**Status:** Shipping | **Date:** 2026-10-25 | **Updated:** 2026-11-09 | **Builds on:** release 0.9.1 (`../archived/release-0.9.1/chores-0.9.1.md`)

A chore release: the booking emails go on with a footer to the member's settings, the pipeline builds once and fans the
e2e suites out on the build, the icons ship in the client bundle, and the tab pages render on the server.

## Delivered

| Delivery | Description or spec | Gherkin | Status |
|---|---|---|---|
| Release notes PDF removed | § Release notes PDF removed | – | done a4bc37d |
| E2E suites fan out in CI | § E2E suites fan out in CI | – | done a4bc37d |
| Build once, test locally, ship the artifact | § Build once, test locally, ship the artifact | – | done a4bc37d |
| Icons ship in the client bundle | § Icons ship in the client bundle | – | done a4bc37d |
| Public billing checks at their level | § Public billing checks at their level | `monthly-billing.feature` | done 61523a0 |
| Tab pages render their content on the server | § Tab pages render their content on the server | – | done d1cfb01 |

## In flight

| Delivery | Description or spec | Gherkin | Status |
|---|---|---|---|
| Booking emails on | § Booking emails on | – | dry run, flag on for dev and prod, guides 2026-11-09 · open: the first mails on dev and on prod |
| Notification settings footer | § Notification settings footer | – | ordered 2026-11-09 · sender specs green |
| Household lookup | § Household lookup | – | moved from 0.9.1 on 2026-11-02 |
| npm audit | § npm audit | – | discovery |

## Booking emails on

The booking emails go out from this release (`../archived/release-0.9.1/feature-notification-delivery.md`).
`SHOULD_SEND_BOOKING_EMAILS_FLAG` gates the two sender events they come from, booking status and chef deadlines
(`../../ops-runbook.md` § Booking emails flag); off, the events send and record nothing. The flag is `"true"` in
`wrangler.toml` `[env.dev.vars]` and `[env.prod.vars]`; the pull request's pipeline deploys dev, the merge to main
deploys prod (`../../ops-runbook.md` § Deployment Routing Table).

### Steps

1. **See what goes out before anything is sent.** `make theslope-sender-dry-run-booking-emails-dev`, then
   `make theslope-sender-dry-run-booking-emails-prod`: per user, the booking status and chef deadline mails the next
   DAILY_MAINTENANCE job sends; nothing is sent or recorded. The list names the people and dinners expected.
2. **Enable on dev.** `[env.dev.vars]`: `SHOULD_SEND_BOOKING_EMAILS_FLAG = "true"`.
3. **Verify on dev.** A booking on dev past its deadline (a waiting-list join, a sold ticket) lands a mail in the dev test
   mailbox; `make logs-sender-dev` shows `📮 > SENDER > [EMAIL] delivered`; `make queues-info-dev` shows an empty backlog;
   `GET /api/admin/sender/delivery` lists the delivery records.
4. **Enable on prod.** `[env.prod.vars]`: `SHOULD_SEND_BOOKING_EMAILS_FLAG = "true"`.
5. **Verify on prod.** After the first night's DAILY_MAINTENANCE (02:00 UTC): `make logs-sender-prod`,
   `make queues-info-prod`, the delivery records.
6. **Guides.** `user-guide.md` names the mails a ticket from the waiting list and a sold ticket send; `chef-guide.md` the
   mail the portions Frigiv gives to the first in line send.

## Notification settings footer

### Problem

A member who gets the booking mails reads nothing in them about where the mails are turned off.

### Solution

Every mail ends with the signature and a footer: "Er du træt af at få mails fra Skrånerappen, så kan du ændre dine
indstillinger her:" and the link to the member's own settings, the profile card on the login page
(`NOTIFICATION_FOOTER`, `app/config/notificationTemplates.ts`). `composeEmail` fills the link as `{{settingsUrl}}` from
the deployment's site, like `{{site}}`; the footer rides the config beside the signature (`app.config.ts`
`theslope.notifications.footer`, `NotificationConfigSchema`).

### Affected

`app/config/notificationTemplates.ts`, `app/app.config.ts`, `app/composables/useNotificationValidation.ts`,
`server/utils/sender/compose.ts`, `server/utils/sender/config.ts`, `tests/e2e/testDataFactories/notificationFactory.ts`,
`tests/component/utils/sender/compose.unit.spec.ts`, `tests/component/utils/sender/config.unit.spec.ts`,
`docs/ops-runbook.md` § Templates.

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

## Tab pages render their content on the server

`app/pages/admin/[tab].vue` and `app/pages/household/[shortname]/[tab].vue` render each tab's panel from Nuxt's lazy
component (`LazyAdminEconomy` and its siblings from `#components`), so the production build sends the panel's HTML and
the browser hydrates it (`docs/adr-compliance-frontend.md`).

## Public billing checks at their level

The accountant link's page and the refusal of an unknown link: `tests/e2e/features/jobs/monthly-billing.feature`; the
phone-width measure `expectNoHorizontalOverflow` (`tests/e2e/testHelpers.ts`) in `MobileViewport.e2e.spec.ts`; the
page's words in `tests/component/pages/public-billing.nuxt.spec.ts` (`docs/testing.md`).

## Icons ship in the client bundle

ADR-018 (icons, compliance 5), `docs/ui.md`; the tokens in `app/composables/useTheSlopeDesignSystem.ts`, the scan in
`nuxt.config.ts`, the rules in `tests/component/architecture/designSystemUsage.unit.spec.ts`.

## Build once, test locally, ship the artifact

`docs/testing.md` (suites and runs), `.claude/skills/prepare-to-ship/SKILL.md` (gates), `docs/ops-runbook.md` § App
config .env (`CLOUDFLARE_INCLUDE_PROCESS_ENV`); `.github/workflows/cicd.yml`, `playwright.config.ts`.

## E2E suites fan out in CI

`.github/workflows/cicd.yml` (the `e2e` matrix), `.github/actions/setup/action.yml`, `docs/testing.md` (suites and
runs); the ui rows gate in `../release-1.0.0/chores-1.0.0.md`.

## Release notes PDF removed

A release's notes and their poster live with the release: `../archived/release-0.9.0/release-notes-0.9.0/`;
`create-release` writes the release's one-line body.
