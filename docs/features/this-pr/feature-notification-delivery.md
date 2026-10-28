# Notification delivery

**Status:** Implementing | **Date:** 2026-10-25 | **Updated:** 2026-10-28 | **Branch:** chore/work-roster-leftovers

Priority high, issue #170. The rules: ADR-015 (Notifications), ADR-016 compliance 9. The templates:
`app/config/notificationTemplates.ts`. The features: `tests/e2e/features/notifications/`. Open defects: `defects.md`
§ Notification delivery.

| Package | What | State |
|---|---|---|
| Desired deliveries | One delivery step for every sender event; a delivery record covers a sent notification | done 8fa59aa, 39e14a6, 16586f1, signed off 2026-10-27 |
| Diagnostics | The dashboard's saved queries, `docs/ops-runbook.md` | done 39e14a6 |
| Booking status | The waiting list, the sales and the buildup off the dinners past their deadline | done 8fa59aa, 39e14a6 |
| Monthly billing | The accountant's mail with the period's CSV, through the same step | done 8fa59aa, 39e14a6 |
| Booking emails flag | `SHOULD_SEND_BOOKING_EMAILS_FLAG`, off on dev | done 39e14a6, 16586f1, signed off 2026-10-27 |
| Chef deadlines | § Chef deadlines | • approved 2026-10-25<br>• brief signed 2026-10-28<br>• partly committed (f4bb23f); open: defects 138, 139, 140 |

## Chef deadlines

A chef's dinner has deadlines, each an alarm on the chef page: the menu, published by the menu deadline, and the
groceries, ordered by the dinner. An alarm turns yellow 72 hours before its deadline, red 24 hours before, and overdue
once its deadline has passed. The sender event reads the active season's dinners with a chef, eaten and cancelled dinners
aside. The chef gets one notice per dinner a night at most, listing all the dinner's deadlines: the night an alarm turns
yellow or red, and every night an alarm is overdue, until the dinner date has passed. The highest alarm sets the tone.
A dinner with all its deadlines met sends nothing. The waiting list has no deadline; its buildup notice is a booking status notification.

### Mockup — chef deadlines notice ✅ signed off 2026-10-25

The menu deadline is ten days before the dinner at 18:00. The link opens the dinner on the chef page.

```
CHEF_DINNER_DEADLINES  → findClosestUserInHousehold(the chef)
When:   the DAILY_MAINTENANCE job, one notice a dinner at most: an alarm turned yellow or red since the last notice, or an
        alarm is overdue; none after the dinner date (getChefDeadlineAlarm, getAlarmLevel)
Alarms: Menu publiceret  deadline getMenuDeadlineTime, met when the menu is published
        Indkøb           deadline getDinnerStartTime, met when the groceries are ordered
        Each missing deadline carries the line of its alarm level; a met deadline reads "– check"

Emne: Skråningen: Din middag d. 20/10/2026 mangler noget fra din side
  Kære chefkok,

  Du er chefkok på fællesspisningen d. 20/10/2026, og din middag mangler noget fra din side:

  Menu publiceret – mangler, senest 10/10/2026 kl. 18:00, om 2 dage
    yellow:   Skrånerne kan framelde sig indtil 12/10/2026 kl. 18:00, så de skal kunne se menuen inden.
    red:      Fristen er tæt på. Publicer menuen i dag, så skrånerne når at se den, før de ikke længere kan
              framelde sig.
    overdue:  Fristen var 10/10/2026 kl. 18:00. Skrånerne venter på at se, hvad de skal spise. Publicer menuen,
              så snart du kan.

  Past its deadline the line counts the time since it and carries the overdue line:
  Menu publiceret – mangler, senest 10/10/2026 kl. 18:00, 2 dage siden
    Fristen var 10/10/2026 kl. 18:00. Skrånerne venter på at se, hvad de skal spise. Publicer menuen, så snart du kan.

  Indkøb – mangler, senest 20/10/2026 kl. 18:00, om 2 dage
    yellow:   Bestil madvarerne i god tid, så køkkenholdet har det hele på dagen.
    red:      Middagen er i dag. Husk madvarerne, så køkkenholdet har det hele.

  Se din middag: https://skraaningen.dk/chef?team=3&date=20/10/2026
```

### TDD

The feature: [chef-deadline-notifications.feature](../../../tests/e2e/features/notifications/chef-deadline-notifications.feature)

The deadlines and the alarms come from the chef page's deadline rules, proven in their specs: the deadline times in
`tests/component/composables/useSeason.nuxt.spec.ts`, a step met or open in
`tests/component/composables/useBookingUi.nuxt.spec.ts`. The rules this package adds:

| Rule | Spec |
|---|---|
| The alarm levels of the chef's deadlines, menu and groceries: yellow, red, overdue, overdue still after the dinner as the calendar shows it, and none once met; one parametrized table holds every expected level | `tests/component/composables/useBooking.nuxt.spec.ts` |
| The chef gets one notice per dinner a night: the night an alarm turns yellow or red, every night an alarm is overdue, none after the dinner date | `tests/component/utils/sender/events/chef-deadlines.unit.spec.ts` |
| The notice lists each deadline with its state and the line of its alarm level | `chef-deadlines.unit.spec.ts` |

| The DAILY_MAINTENANCE job sends the WAITLIST_JOINED email once the household has a user: the scenario counts the dinner's WAITLIST_JOINED delivery records, beside the chef deadlines notice the same run sends (2026-10-28) | `booking-notifications.feature` |
