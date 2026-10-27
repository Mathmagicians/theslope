# 0.9.2 chores

**Status:** Proposed | **Date:** 2026-10-25 | **Builds on:** release 0.9.1 (`../this-pr/chores-0.9.1.md`)

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

## Booking emails on

The booking emails go out from this release (`../this-pr/feature-notification-delivery.md` § Desired deliveries, the
booking emails flag).

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
