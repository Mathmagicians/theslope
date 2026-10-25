# Notification delivery

**Status:** Design awaiting approval | **Date:** 2026-10-25 | **Updated:** 2026-10-25 | **Branch:** chore/work-roster-leftovers

Priority high, issue #170.

| Package | State |
|---|---|
| Desired deliveries | awaiting approval |
| Booking status | awaiting approval |
| Monthly billing | decided 2026-10-25 |
| Chef deadlines | design |
| Booking emails flag | agreed 2026-10-25 |

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

**Topics.** The notifications come in topics. A topic knows which data it reads, which notifications that data owes,
whom each notification goes to and what it says. One shared delivery step serves every topic: it works out the desired
deliveries, compares them with the recorded deliveries, sends the missing ones together and records them together.

| Topic | Subjects | Notifications |
|---|---|---|
| Booking status | a place on the waiting list, an order, a dinner | waiting list joined, ticket sold, ticket from the waiting list, ticket bought, waiting list buildup, extra portion |
| Monthly billing | a billing period | billing period closed, billing period updated |
| Chef deadlines | a dinner | menu deadline, menu overdue |

The team assignment notifications ship with the duty roster (`../release-0.9.3/feature-proposal-duty-roster.md`).

**Should send.** A desired delivery is sent when no recorded delivery covers it: the same subject, version,
notification, channel and recipient. An admin's re-send overrides this and sends again; the override is logged with the
admin.

**Recipient: findClosestUserInHousehold.** A notification about a person goes to the person's own user, else to the
first user in that household. The waiting list buildup goes to the dinner's chef; the billing notifications go to the
accountant's mailbox. A channel the user has opted out of receives nothing.

**Versions.** A subject's version counts from 1 and steps once per event that owes it a notification: a place on the
waiting list at its join; an order at the extra portion that created it and at each sale; a dinner at its first buildup
and at each extra portion after it. A new version is a new notification.

**One derivation.** The booking, the chef's extra portions and the nightly run read the notifications off the dinners
as they stand. A rerun sends what the first run sends, and nothing twice.

**Background notifications.** The user does not wait for notifications. A booking, a season change or the chef's extra
portions write their data, respond to the user, and send the notifications in the background. Cloudflare gives
background work 30 seconds after the response; what a background run does not finish stays owed, and the nightly run
sends it.

**Opt-out.** A new user starts with the default channels and appearance. After that, only the user's own save changes
them; the Heynabo import leaves them as they are.

**Booking emails flag.** The booking emails are behind the Cloudflare variable `SHOULD_SEND_BOOKING_EMAILS_FLAG`, set
per environment in `wrangler.toml`. Off, no booking email is sent or recorded; the other topics send as usual. The flag
ships off in dev and prod, and on locally, in e2e and in CI. A configuration release turns it on in dev and prod; the
release after that removes the flag.

**Preview.** Before the flag goes on, the admin runs the preview of the booking notifications for the environment from
the terminal, a make target beside the sender targets: per user, how many of each notification the first run sends, how
many are already sent, and how many have no user to go to. The preview sends and records nothing; it has no page.

### Mockup — notifications ✅ signed off 2026-10-17

The notifications speak the booking words: they greet the one who hears and name the person they are about, carry
the ticket line of the booking page and the badge's help text, and link to the dinner's booking page.

```
WAITLIST_JOINED  → the person, else the first user of the household
Emne: Skråningen: Emil står på ventelisten til 20/10/2026 · Lasagne
  Kære Lene,

  20/10/2026 · Lasagne
  Emil: 1 på ventelisten (Barn #1)
  Barn · 35 kr · Spisesal

  Du får automatisk tildelt en billet, hvis en kommer til salg, eller chefkokken frigiver portioner.
  Du betaler, når du får en billet fra ventelisten.
  Du kan altid afmelde din ventelisteplads, hvis du ikke har brug for den alligevel.

  Se bookingen: https://skraaningen.dk/dinner?date=20/10/26

WAITLIST_TICKET_ASSIGNED  → the person, else the first user of the household
Emne: Skråningen: Emil har fået en billet til 20/10/2026 · Lasagne
  20/10/2026 · Lasagne
  Emil: 1 købt
  Barn · 35 kr · Spisesal · fra Hansen
  Du betaler for billetten. Vi glæder os til at se jer.
  Se bookingen: …

WAITLIST_EXTRA_PORTION  → the person, else the first user of the household
  20/10/2026 · Lasagne
  Emil: 1 tilmeldt
  Barn · 35 kr · Spisesal
  Køkkenholdet laver flere portioner, og en af dem er til Emil. Vi glæder os til at se jer.
  Se bookingen: …

TICKET_SOLD  → the person whose ticket was released, else the first user of the household
Emne: Skråningen: 1 billet til 20/10/2026 · Lasagne er solgt
  20/10/2026 · Lasagne
  1 billet solgt til ventelisten        (1 billet solgt til Jensen, when a user bought it)
  Voksen · 55 kr
  I betaler ikke længere for den.
  Se bookingen: …

TICKET_BOUGHT  → the buyer, else the first user of the household (signed 2026-10-24)
Emne: Skråningen: Emil har fået en billet til 20/10/2026 · Lasagne
  20/10/2026 · Lasagne
  Emil: 1 købt
  Barn · 35 kr · Spisesal · fra Hansen
  Du betaler for billetten. Vi glæder os til at se jer.
  Se bookingen: https://skraaningen.dk/dinner?date=20/10/26

WAITLIST_BUILDUP  → the chef, in the words of the chef's alert
Emne: Skråningen: 3V 1B på venteliste til 20/10/2026 · Lasagne
  3V 1B på venteliste · 5 portioner
  Skrånere mangler billetter til din middag — har du mulighed for at mætte flere munde?
  Det gør du under Flere på middagen: https://skraaningen.dk/chef
```

A guest reads "Gæst af Anna". The booking page's waiting-list badge carries the same help text.

### TDD

A delivery record is a recorded delivery on the dinner's places on the waiting list, its orders or the dinner itself,
or on the billing period. The buildup threshold is 3. The features replace the waiting-list notification e2e and the
billing re-send case.

`tests/e2e/features/notifications/booking-notifications.feature`

```gherkin
@api-serial
Feature: Booking notifications
  Past a dinner's booking deadline, the waiting list and the sales notify the people they concern by email, once per
  version of the subject. The booking, the chef's extra portions and the nightly run read the notifications off the
  dinners as they stand; a delivery record records each email sent.

  Background:
    Given the admin is signed in
    And a season is active

  Scenario Outline: <event> on a dinner <dinner>
    Given a dinner <dinner>
    When <event>
    Then a db admin sees <records> delivery records for the dinner
    And the <notification> email is sent to <recipient> <emails>

    Examples:
      | dinner                                                                     | event                          | records | notification     | recipient                  | emails |
      | past its booking deadline with no ticket for sale                          | a person books the dinner      | 1       | waitlist joined  | the person                 | 1 time |
      | past its booking deadline with a person first in line                      | a holder releases their ticket | 3       | ticket sold      | the holder                 | 1 time |
      | past its booking deadline with a person first in line                      | a holder releases their ticket | 3       | ticket assigned  | the first in line          | 1 time |
      | past its booking deadline with a released ticket                           | a person books the dinner      | 2       | ticket sold      | the holder                 | 1 time |
      | past its booking deadline with a released ticket                           | a person books the dinner      | 2       | ticket bought    | the person                 | 1 time |
      | past its booking deadline with two in line                                 | a person books the dinner      | 4       | waitlist buildup | the chef                   | 1 time |
      | past its booking deadline with three in line                               | the chef adds a portion        | 5       | extra portion    | the first in line          | 1 time |
      | past its booking deadline where a ticket went to the first in line         | the daily maintenance job runs | 3       | ticket sold      | the holder                 | 1 time |
      | past its booking deadline with a person in line whose household got a user | the daily maintenance job runs | 1       | waitlist joined  | the household's first user | 1 time |

  Scenario: A booking before the deadline records no delivery
    Given a dinner before its booking deadline
    When a person books the dinner
    Then a db admin sees 0 delivery records for the dinner

  Scenario: The preview counts per user what a run sends
    Given a dinner past its booking deadline with a person in line whose household got a user
    When the admin previews the booking notifications
    Then the preview counts 1 waitlist joined email for the household's first user
    And a db admin sees 0 delivery records for the dinner
```

`tests/e2e/features/notifications/billing-notifications.feature`

```gherkin
@api-serial
Feature: Billing notifications
  A closed billing period archives its CSV and notifies the accountant by email, once per version of the period; an
  admin's override sends the email again. The archive and each email record one delivery record.

  Background:
    Given the admin is signed in

  Scenario Outline: <action> on <period>
    Given <period>
    When <action>
    Then a db admin sees <records> delivery records for the period
    And an email is sent to the accountant <emails>

    Examples:
      | period                            | action                             | records | emails  |
      | a past month with unbilled orders | the monthly billing job runs       | 2       | 1 time  |
      | a closed billing period           | the monthly billing job runs       | 2       | 1 time  |
      | a closed billing period           | the admin overrides with a re-send | 3       | 2 times |
```

The rules below the features, each in its unit spec:

| Rule | Spec |
|---|---|
| findClosestUserInHousehold; an opted-out channel receives nothing | `tests/component/utils/sender/events/waitlist.unit.spec.ts` |
| The versions; the notifications the dinners owe as they stand | `waitlist.unit.spec.ts` |
| The flag off: no booking email is sent or recorded | `waitlist.unit.spec.ts` |
| The channels: the recipient's crossed with the environment's | `tests/component/utils/sender/deliveries.unit.spec.ts` |
| Should send, with the admin's override | `tests/component/composables/useDeliveryValidation.unit.spec.ts` |
| One send and one record per run; a notification without a user stays owed; the preview sends and records nothing | `deliveries.unit.spec.ts` |
| The Heynabo import leaves a user's channels and appearance as they are | the Heynabo mapper and import specs |

### Affected

| Where | What changes |
|---|---|
| `app/composables/useDeliveryValidation.ts` | the desired deliveries and the should-send rule |
| `server/utils/sender/deliveries.ts` (new) | the shared delivery step |
| `server/utils/sender/config.ts`, `shared/types/cloudflare.d.ts` | the booking emails flag |
| `server/utils/sender/events/waitlist.ts` | the booking status topic, findClosestUserInHousehold |
| `server/utils/sender/events/monthly-billing.ts`, `server/utils/monthlyBillingService.ts`, `app/composables/useBilling.ts` | the monthly billing topic |
| `server/data/financesRepository.ts` | the delivery records in one write |
| `server/routes/api/admin/sender/delivery.get.ts`, `Makefile` | the preview, one make target per environment |
| the eight booking routes, the chef's extra portions, the nightly run, the billing re-send | background notifications, the admin's override |
| `useHeynaboValidation.ts`, `useCoreValidation.ts` | the opt-out |
| `wrangler.toml`, `docs/ops-runbook.md` | the flag per environment |

ADR notes: ADR-016 [Unified Booking Through Scaffold] rule 9 and Key Files, ADR-015 [Idempotent Automated Jobs with
Rolling Window] § Rolling Window Pattern, ADR-014 [Batch Operations and Utility Functions] rule 5.

## Booking status

The topic reads the active season's dinners past their booking deadline, consumed and cancelled dinners aside. They
owe each place on the waiting list its join, each line at the buildup threshold its buildup to the chef, and each order
its holder still holds the latest sale or extra portion. The notifications and their recipients: § Mockup.

## Monthly billing

Monthly billing sends through the same delivery step as the booking notifications. The topic reads the closed billing
periods; each owes the accountant its current version: billing period closed for the first version, billing period
updated after it. The monthly run and the admin's re-send both go through the delivery step; the re-send is the
admin's override. The CSV archive stays its own step and records its own delivery.

## Chef deadlines

The topic reads the active season's dinners with a chef and an unpublished menu, eaten and cancelled dinners aside. Each
owes its chef the menu deadline notice when the chef's Menu badge turns yellow, three days before the menu deadline, and
the menu overdue notice once the deadline has passed. A menu published in time owes nothing. The nightly run sends
them; the chef gets each notice once.

### Mockup — chef deadline notifications ⏳ awaiting signoff

The menu deadline is ten days before the dinner at 18:00 and the cancellation deadline eight days before, so the menu
reaches the diners while they can still cancel. The link opens the dinner on the chef page.

```
CHEF_MENU_DEADLINE  → the chef, else the first user of the chef's household
When: the first nightly run once the Menu badge turns yellow, 72 h before the menu deadline
      (getMenuDeadlineTime, cookingDeadlines.warningHours), the menu unpublished
Emne: Skråningen: Publicer menuen til 20/10/2026 senest 10/10/2026
  Kære Lene,

  Du er chefkok på fællesspisningen 20/10/2026.
  Menu: publiceres senest 10/10/2026 kl. 18:00
  Skrånerne kan framelde sig indtil 12/10/2026 kl. 18:00, så de skal kunne se menuen inden.

  Publicer menuen: https://skraaningen.dk/chef?team=3&date=20/10/26

CHEF_MENU_OVERDUE  → the chef, else the first user of the chef's household
When: the first nightly run after the menu deadline (isAnnounceMenuPastDeadline), the menu unpublished
Emne: Skråningen: Menuen til 20/10/2026 mangler
  Kære Lene,

  Du er chefkok på fællesspisningen 20/10/2026.
  Menu: fristen var 10/10/2026 kl. 18:00
  Skrånerne venter på at se, hvad de skal spise. Publicer menuen, så snart du kan.

  Publicer menuen: https://skraaningen.dk/chef?team=3&date=20/10/26
```

## Decisions

**2026-10-24**
- The booking notifications are previewed per user before they go out.
- The booking, the chef's extra portions and the nightly run read the notifications off the dinners as they stand:
  a rerun sends what the first run sends, and nothing twice.

**2026-10-25**
- A notification has no channel of its own; email is the first channel.
- The notifications come in topics: booking status, monthly billing, chef deadlines. The team assignment notifications
  ship with the duty roster.
- The recipient rule is findClosestUserInHousehold.
- Should send: a delivery is sent when no recorded delivery covers it; the re-send is an admin's override.
- The booking emails are behind the Cloudflare variable `SHOULD_SEND_BOOKING_EMAILS_FLAG`, read from the environment
  and kept out of the database; a configuration release turns it on, and the release after it removes it.
- The features state the delivery records a db admin sees and the emails sent, in numbers.
- Monthly billing sends through the same delivery step as the booking notifications (DRY).
- The user does not wait for notifications: they go in the background after the response, and the nightly run sends,
  idempotently, what a background run did not finish.
- The preview has no page: a make target per environment, in our regular env style.
- A cancelled dinner sends no notification.
- A failed job sends no notification for now.
