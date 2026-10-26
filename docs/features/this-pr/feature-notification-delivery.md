# Notification delivery

**Status:** Implementing | **Date:** 2026-10-25 | **Updated:** 2026-10-25 | **Branch:** chore/work-roster-leftovers

Priority high, issue #170.

| Package | State |
|---|---|
| Desired deliveries | in your test 39e14a6, 16586f1 |
| Diagnostics | in your test 39e14a6 |
| Booking status | awaiting approval |
| Monthly billing | decided 2026-10-25 |
| Chef deadlines | approved 2026-10-25 |
| Booking emails flag | in your test 39e14a6, 16586f1 |

## Desired deliveries

### Problem

A booking email goes to the user who made the booking, or to the person's own user. A place on the waiting list that
the nightly run or a preference change joined emails the system account; a child's ticket from the waiting list or
extra portion emails nobody; a sold ticket emails every member of the selling household. Issue #170: a place on the
waiting list of 27/10, joined by a preference change, greeted the person in an email to the API account.

An email lost on the way stays lost, and the booking and the nightly run each decide on their own what to send.

A user's opt-out holds until the next Heynabo import: the import resets a user's channels and appearance when the
user's email, phone or admin role changes in Heynabo.

### Solution

**Notifications and deliveries.** A notification tells one recipient about one subject at one version of that subject.
The subjects are a place on the waiting list, an order, a dinner and a billing period. A delivery is one notification
sent on one channel; email is the channel. The system records every delivery it sends.

**Sender events.** The notifications come from sender events. A sender event reads its data and derives its
notifications: the subject, the version, the recipient and the text of each. One shared delivery step serves every
sender event: it works out the desired deliveries, compares them with the recorded deliveries, sends the missing ones
together and records them together.

| Sender event | Subjects | Notifications |
|---|---|---|
| Booking status | a place on the waiting list, an order, a dinner | waitlist joined, ticket sold, waitlist ticket assigned, ticket bought, waitlist buildup, waitlist extra portion |
| Monthly billing | a billing period | billing period closed, billing period updated |
| Chef deadlines | a dinner | the dinner's deadlines |

The team assignment notifications ship with the duty roster (`../release-0.9.3/feature-proposal-duty-roster.md`).

**Should send.** A desired delivery is sent when no recorded delivery covers it: the same subject, version,
notification, channel and recipient. An admin's re-send overrides this and sends again; the override is logged with the
admin.

**Recipient: findClosestUserInHousehold.** A notification about an inhabitant goes to the closest user: the inhabitant's own user, else the
first user of the inhabitant's household. The waitlist buildup and the chef deadlines go to findClosestUserInHousehold(the
dinner's chef); the billing notifications go to the accountant's mailbox. A channel the user has opted out of receives nothing.

**Versions.** A subject's version counts from 1 and steps once per booking event a notification tells: a place on the
waiting list at its join; an order at the extra portion that created it and at each sale; a dinner at its first buildup
and at each extra portion after it. A new version is a new notification.

**One derivation.** The booking, the chef's extra portions and the nightly run read the notifications off the dinners
as they stand. Notifications are an idempotent service: in the absence of failures, one run and two runs have the same
effects. A sent mail writes a delivery record.

**Background notifications.** The user does not wait for notifications. A booking, a season change or the chef's extra
portions write their data, respond to the user, and send the notifications in the background. Cloudflare gives
background work 30 seconds after the response; a notification a background run did not send has no delivery record,
and the nightly run sends it.

**Diagnostics.** A notification the nightly run sends again heals by itself and needs no report. What stays broken is
reported:

| Breakdown | Where the admin sees it |
|---|---|
| The sender fails a send: retries used up, or a failure retrying cannot fix | the sender's error line on the Cloudflare dashboard; its dedupe key names the notification and the user, and the admin contacts the inhabitant's household |
| A background run fails | the delivery step's error line, naming the sender event and the reason, on the dashboard |
| A background run is cut off 30 seconds after the response, and an email it queued may go twice | Cloudflare's warning that the background tasks were cancelled, on the dashboard |
| Two runs on one dinner send the same notification | the delivery step's sent-twice line, naming the notification, the subject, the version and the user, at the next run on that dinner |
| The app cannot hand a notification to the queue (no sender binding, no mailbox) | the app's error line on the dashboard |
| The sender stops taking messages off the queue | the queue's backlog on the dashboard |
| The nightly run fails | the job runs page |

Each environment has its dashboard over the app's and the sender's Workers Logs. The dev sender delivers to the test
mailbox alone, so the dev dashboard filters the sender's lines for the allowed addresses.

The dashboard is a set of saved queries in Workers Observability, one set per environment, and the queue's metrics.
The admin creates them in the Cloudflare dashboard from the steps in the ops-runbook.

**Opt-out.** A new user starts with the default channels and appearance. After that, only the user's own save changes
them; the Heynabo import leaves them as they are.

**Booking emails flag.** The booking emails are behind the Cloudflare variable `SHOULD_SEND_BOOKING_EMAILS_FLAG`, set
per environment in `wrangler.toml`. Off, no booking email is sent or recorded; the other sender events send as usual. The flag
ships off in dev and prod, and on locally, in e2e and in CI. A configuration release turns it on in dev and prod; the
release after that removes the flag.

**Delivery dry run.** Before the flag goes on, the admin runs the delivery dry run of the booking notifications for the environment from
the terminal, a make target beside the sender targets: per user, how many of each notification the first run sends. The
dry run is the run stopped before it sends, and it sends and records nothing. With email off in the environment, the run
stops before it reads and the dry run answers an error. It has no page.

### Mockup — notifications ✅ signed off 2026-10-17

The notifications speak the booking words: they greet the one who hears and name the inhabitant they are about, carry
the ticket line of the booking page and the badge's help text, and link to the dinner's booking page.

```
WAITLIST_JOINED  → findClosestUserInHousehold(the inhabitant)
Emne: Skråningen: Emil står på ventelisten til 20/10/2026 · Lasagne
  Kære Lene,

  20/10/2026 · Lasagne
  Emil: 1 på ventelisten (Barn #1)
  Barn · 35 kr · Spisesal

  Du får automatisk tildelt en billet, hvis en kommer til salg, eller chefkokken frigiver portioner.
  Du betaler, når du får en billet fra ventelisten.
  Du kan altid afmelde din ventelisteplads, hvis du ikke har brug for den alligevel.

  Se bookingen: https://skraaningen.dk/dinner?date=20/10/26

WAITLIST_TICKET_ASSIGNED  → findClosestUserInHousehold(the inhabitant)
Emne: Skråningen: Emil har fået en billet til 20/10/2026 · Lasagne
  20/10/2026 · Lasagne
  Emil: 1 købt
  Barn · 35 kr · Spisesal · fra Hansen
  Du betaler for billetten. Vi glæder os til at se jer.
  Se bookingen: …

WAITLIST_EXTRA_PORTION  → findClosestUserInHousehold(the inhabitant)
  20/10/2026 · Lasagne
  Emil: 1 tilmeldt
  Barn · 35 kr · Spisesal
  Køkkenholdet laver flere portioner, og en af dem er til Emil. Vi glæder os til at se jer.
  Se bookingen: …

TICKET_SOLD  → findClosestUserInHousehold(the seller)
Emne: Skråningen: 1 billet til 20/10/2026 · Lasagne er solgt
  20/10/2026 · Lasagne
  1 billet solgt til ventelisten        (1 billet solgt til Jensen, when a user bought it)
  Voksen · 55 kr
  I betaler ikke længere for den.
  Se bookingen: …

TICKET_BOUGHT  → findClosestUserInHousehold(the buyer) (signed 2026-10-24)
Emne: Skråningen: Emil har fået en billet til 20/10/2026 · Lasagne
  20/10/2026 · Lasagne
  Emil: 1 købt
  Barn · 35 kr · Spisesal · fra Hansen
  Du betaler for billetten. Vi glæder os til at se jer.
  Se bookingen: https://skraaningen.dk/dinner?date=20/10/26

WAITLIST_BUILDUP  → findClosestUserInHousehold(the chef), in the words of the chef's alert
Emne: Skråningen: 3V 1B på venteliste til 20/10/2026 · Lasagne
  3V 1B på venteliste · 5 portioner
  Skrånere mangler billetter til din middag — har du mulighed for at mætte flere munde?
  Det gør du under Flere på middagen: https://skraaningen.dk/chef
```

A guest reads "Gæst af Anna". The booking page's waiting-list badge carries the same help text.

### TDD

The features replace the waiting-list notification e2e and the billing re-send case:

- [booking-notifications.feature](../../../tests/e2e/features/notifications/booking-notifications.feature)
- [billing-notifications.feature](../../../tests/e2e/features/notifications/billing-notifications.feature)
- [preferences.feature](../../../tests/e2e/features/user/preferences.feature): the channel a user saves

The rules below the features, each in its unit spec:

| Rule | Spec |
|---|---|
| findClosestUserInHousehold; an opted-out channel receives nothing | `tests/component/utils/sender/events/waitlist.unit.spec.ts` |
| The versions; the notifications read off the dinners as they stand | `waitlist.unit.spec.ts` |
| The flag off: no booking email is sent or recorded | `waitlist.unit.spec.ts` |
| The channels: the recipient's crossed with the environment's | `tests/component/utils/sender/deliveries.unit.spec.ts` |
| Should send, with the admin's override | `tests/component/composables/useDeliveryValidation.unit.spec.ts` |
| One send and one record per run; the dry run sends and records nothing | `deliveries.unit.spec.ts` |
| The Heynabo import leaves a user's channels and appearance as they are | the Heynabo mapper and import specs |

### Affected

| Where | What changes |
|---|---|
| `app/composables/useDeliveryValidation.ts` | the desired deliveries and the should-send rule |
| `server/utils/sender/deliveries.ts` (new) | the shared delivery step |
| `server/utils/sender/config.ts` | the booking emails flag |
| `server/utils/sender/events/waitlist.ts` | the booking status sender event, findClosestUserInHousehold |
| `server/utils/sender/events/monthly-billing.ts`, `server/utils/monthlyBillingService.ts`, `app/composables/useBilling.ts` | the monthly billing sender event |
| `server/data/financesRepository.ts` | the delivery records in one write |
| `server/routes/api/admin/sender/delivery.get.ts`, `Makefile` | the delivery dry run, one make target per environment |
| the seven booking routes, the chef's extra portions, the nightly run, the billing re-send | background notifications, the admin's override |
| `useHeynaboValidation.ts`, `useCoreValidation.ts` | the opt-out |
| `wrangler.toml`, `docs/ops-runbook.md` | the flag per environment |
| `package.json` | the dev script sets the flag on locally, in e2e and in CI, as it sets the deploy URL |
| `server/utils/dailyMaintenanceService.ts`, `app/composables/useMaintenance.ts` | the nightly run's counts on the job runs page |
| `server/utils/sender/events/chef-deadlines.ts` (new), `app/config/notificationTemplates.ts`, `server/utils/dailyMaintenanceService.ts` | the chef deadlines sender event, its words, the nightly run sending it |
| `docs/ops-runbook.md` | the Cloudflare dashboards, dev and prod, over the sender's and the app's Workers Logs and the queue's backlog |

ADR notes: ADR-016 [Unified Booking Through Scaffold] rule 9 and Key Files, ADR-015 [Idempotent Automated Jobs with
Rolling Window] § Rolling Window Pattern, ADR-014 [Batch Operations and Utility Functions] rule 5.

## Booking status

The sender event reads the active season's dinners past their booking deadline, consumed and cancelled dinners aside.
Each place on the waiting list gets its waitlist joined notification; the chef of a dinner whose waiting list reaches
the buildup threshold gets the waitlist buildup; each order its holder still holds gets the notifications of its latest
sale or extra portion. The notifications and their recipients: § Mockup.

## Monthly billing

Monthly billing sends through the same delivery step as the booking notifications. The sender event reads the closed
billing periods and sends the notification of each period's current version to the accountant's mailbox, cc the admin
mailbox, with the period's CSV attached: billing period closed for the first version, billing period updated after it.
A missing accountant mailbox is an error: nothing is sent or recorded, and the app's error line names the setting. The
monthly run and the admin's re-send both go through the delivery step; the re-send is the admin's override. The CSV
archive stays its own step and records its own delivery.

### TDD

The feature: [billing-notifications.feature](../../../tests/e2e/features/notifications/billing-notifications.feature)

| Rule | Spec |
|---|---|
| The accountant's notification: the mailbox, cc the admin mailbox, the CSV, closed at the first version and updated after; one delivery record of the period's version | `tests/component/utils/sender/events/monthly-billing.unit.spec.ts` |
| A missing accountant mailbox: an error line, nothing sent or recorded | `monthly-billing.unit.spec.ts` |
| The admin's re-send sends again and logs the admin | `monthly-billing.unit.spec.ts` |
| A mailbox delivery is covered by the mailbox's delivery records only | `tests/component/composables/useDeliveryValidation.unit.spec.ts`, `deliveries.unit.spec.ts` |

## Chef deadlines

A chef's dinner has deadlines, each an alarm on the chef page: the menu, published by the menu deadline, and the
groceries, ordered by the dinner. An alarm turns yellow 72 hours before its deadline, red 24 hours before, and overdue
once its deadline has passed. The sender event reads the active season's dinners with a chef, eaten and cancelled dinners
aside. The chef gets one notice per dinner a night at most, listing all the dinner's deadlines: the night an alarm turns
yellow or red, and every night an alarm is overdue, until the dinner date has passed. The highest alarm sets the tone.
A dinner with all its deadlines met sends nothing. The waiting list has no deadline; its buildup notice is in § Booking status.

### Mockup — chef deadlines notice ✅ signed off 2026-10-25

The menu deadline is ten days before the dinner at 18:00. The link opens the dinner on the chef page.

```
CHEF_DINNER_DEADLINES  → findClosestUserInHousehold(the chef)
When:   the nightly run, one notice a dinner at most: an alarm turned yellow or red since the last notice, or an
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

  Indkøb – mangler, senest 20/10/2026 kl. 18:00, om 2 dage
    yellow:   Bestil madvarerne i god tid, så køkkenholdet har det hele på dagen.
    red:      Middagen er i dag. Husk madvarerne, så køkkenholdet har det hele.

  Se din middag: https://skraaningen.dk/chef?team=3&date=20/10/26
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

## Decisions

**2026-10-24**
- A delivery dry run lists the booking notifications per user before they go out.
- The booking, the chef's extra portions and the nightly run read the notifications off the dinners as they stand:
  notifications are an idempotent service, in the absence of failures one run and two runs have the same effects, and
  a sent mail writes a delivery record.

**2026-10-25**
- A notification has no channel of its own; email is the first channel.
- The notifications come from sender events: booking status, monthly billing, chef deadlines. The team assignment
  notifications ship with the duty roster.
- With no active season, no dinner sends a notification: the nightly run and the delivery dry run count zero.
- The recipient rule is findClosestUserInHousehold.
- Should send: a delivery is sent when no recorded delivery covers it; the re-send is an admin's override.
- The booking emails are behind the Cloudflare variable `SHOULD_SEND_BOOKING_EMAILS_FLAG`, read from the environment
  and kept out of the database; a configuration release turns it on, and the release after it removes it.
- The features state the delivery records a db admin sees and the emails sent, in numbers.
- Monthly billing sends through the same delivery step as the booking notifications (DRY).
- The user does not wait for notifications: they go in the background after the response, and the nightly run sends,
  idempotently, what a background run did not finish.
- The delivery dry run has no page: a make target per environment, in our regular env style.
- A cancelled dinner sends no notification.
- A failed job sends no notification for now.
- The nightly run's result counts the new notifications.
- A Cloudflare dashboard monitors the sender worker's failed sends and the background errors.
- What heals by itself needs no report; what breaks down gets a diagnostic: a log line the admin sees on the dashboard.
- A dashboard per environment; the dev dashboard filters for the allowed addresses.
- The dashboard is saved queries in Workers Observability; the admin creates them in the Cloudflare dashboard from the
  steps in the ops-runbook.
- The chef gets a menu notice at yellow and at red, each if the menu is unpublished, each in its tone.
- After the menu deadline, the chef gets the overdue notice every night until the dinner date has passed, while the menu
  is unpublished.
- Alarms are handled alike: warning levels, a deadline, nothing after the dinner. A chef gets one deadline notice per
  dinner a night at most, listing the dinner's deadlines with their state.
- The waiting list has no deadline: its buildup notice goes as specified in booking status.
- After the dinner the calendar still shows an overdue alarm; no notification goes after the dinner.
