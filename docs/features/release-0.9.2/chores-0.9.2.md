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
