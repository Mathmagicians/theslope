# Release 0.9.0

**Status:** In progress | **Date:** 2026-10-05 | **Updated:** 2026-10-17 | **Branch:** `feature/work-roster`

The packages of release 0.9, where each one lives and the decisions behind them. Work after this release lives in
`../chores-0.9.1.md`.

## Package inventory

| Package | What | Where | Status |
|---|---|---|---|
| Framework research spike | prisma, zod and `zod-prisma-types` compatibility; the Nuxt option surface behind the store factory | `../archived/feature-proposal-framework-adoption.md` | committed |
| CI test reporting | vitest writes the unit summary; `make test-report` renders one Playwright suite per call with counts and the report link | § CI test reporting | committed (86e7c98, dd53d16) |
| Framework pair upgrade | pinia 4 with @pinia/nuxt 1, ical-generator 11 | `../archived/feature-proposal-framework-adoption.md` § Dependency clusters | committed |
| Store fetcher factory and store alignment | `storeAsyncData` and `apiRequest` from `useApiHandler`; the stores read and write through them | ADR-007 | committed (33a3567) |
| Fetch gating | `enabled` carries the fetch condition, `dependsOn` the chain; a dataset reads the selection a page hands the store | ADR-007 rules 8 and 9 | committed (c8788a5) |
| Re-authentication on 401 | a 401 re-authenticates and returns in place through `?redirect`; a 404 on a selected id recovers through `notFound` | ADR-007, `app/composables/useApiHandler.ts`, `app/plugins/apiErrors.client.ts` | committed (d6fe721, 52f395c) |
| URL writer | `useUrlQueryWriter` batches the URL writes of a tick into one navigation; an edit draft starts on an edit action | ADR-006 § URL Writes, ADR-007 rule 10 | committed (42b380f) |
| Dependency policy | `.npmrc` saves tilde ranges; a minor or major moves through an explicit install | `.npmrc`, `package.json` | committed |
| Prisma bundle | prisma 7.10, zod 4.6, zod-prisma-types 3.3 and the models of the push in migration `0017_roster` | § Prisma bundle | committed (db78d61, 5dc8818, 541fc01) |
| Booking one-path | one builder family for regular and guest orders across grid, preview and day | `../archived/bug-fix-plan-v0.9.md` | committed (1929a8d, e0d00d7) |
| Joker slot | `JokerSlot` on a team with the slot form in the team card | `../archived/feature-joker-slot.md` | committed (c62dd6b, 427a625, 3cdb77c) |
| Calendar legend | one `CalendarLegend` for the chef, dinner and team calendars | `CalendarLegend.vue`, `ALERTS.legend` | committed (541fc01) |
| Team wanted poster | a dinner without a chef shows the wanted poster on the chef card | `ChefMenuCard.vue`, `COMPONENTS.wantedPoster` | committed (ba5604c) |
| Waitlist | queue, assignment on release, extra portions, one booking path, UI, the calendar chips | `../archived/feature-waitlist.md`, ADR-016 | committed (5eedd34, 5f50af2, c151d74, f4892ad, 0a37cc4, 9cad84a, 627f2f6) |
| Waitlist notifications | the serial e2e asserting each of the four kinds writes its Delivery row | § Waitlist notifications | planned |
| Chef spending | expense rows per dinner, the chef endpoints, the Budget pane with the ticket changes | § Chef spending | committed (49ece5e, 24e9a3f, fd41213, c65feae) |
| Kitchen allergy line | the dining-mode panels show the allergy kuverter; the expanded list opens with the allergen breakdown | § Kitchen allergy line | committed (5eedd34, 49ece5e, 42b380f) |
| Chef allergen line | the chef's allergen row counts the dinner's diners in kuverter per menu allergen | § Chef allergen line | committed (49ece5e) |
| Chef calendar header | the Agenda/Kalender tabs and the collapse chevron share one header row | § Chef calendar header | committed (42b380f) |
| Ticket allergies | a booked inhabitant's live allergies on the ticket card and in the booking form | § Ticket allergies | committed (7df4c17, bcf56c8, fd41213) |
| One team number | a team's number comes from its name, else its season position; the team bands derive from it | § Decisions 2026-10-11 | committed (0b54a73, 8d98269) |
| Season pick | the season order is active, in progress, upcoming, ended | § Decisions 2026-10-11 | committed (9a03544) |
| One breakpoint source | the design system is the one reader of the layout's `isMd` | § Decisions 2026-10-11 | committed (8d98269) |
| Calendar default waits for the viewport | `/dinner` and `/chef` land open on desktop and closed on a phone | `createBreakpoint` (`measured`) | committed (2a8d0e9) |
| Season status glyphs | the season's status as a `UBadge` from `SEASON_STATUS_GLYPHS` | § Decisions 2026-10-12 | committed (fd41213, bb3271e) |
| Spinner motion token | one spin value with the motion-reduce guard behind the save, job and ticket-change spinners | `MOTION_SPIN` in `useTheSlopeDesignSystem.ts` | committed (c151d74) |
| Admin economy loads on request | the billing periods and the current period fetch while the economy tab is on the page | `loadBillingOverview` in `app/stores/bookings.ts`, ADR-007 rule 9 | committed (83597f8) |
| Team delete returns the deleted id | `DELETE /api/admin/team/[id]` answers the id of the deleted team | ADR-009 rule 7 | committed (afadb83) |
| Joker slot delete returns the deleted id | `DELETE /api/admin/team/[id]/joker-slot/[slotId]` answers the id of the deleted slot; a slot of another team answers 404 | ADR-009 rule 7 | committed (679fc8f) |
| Validation owns the types | `TicketType` and the booking row action (`BookingRowActionSchema`) come from `useBookingValidation` | ADR-001 | committed (1cc6b5e, fdff39e) |
| Ticket portions | a ticket price row carries `portions` from the config's default prices | ADR-010 rule 7, `useTicket().withPortions` | committed (fdff39e) |
| Table loading | a loading table shows the spinning glyph in its `#loading` slot | ADR-018, `COMPONENTS.table.loadingRow` | committed (4e7d174) |
| Security patches | wrangler, `@nuxt/devtools` and prisma 7.10.1 patched; `nitro-cloudflare-dev` removed | `package.json` | committed (326ca63, b36d01d, 8c83700, 04d4fbd, 3629473, 861771d) |
| Heal endpoint removed | `heal-user-bookings`, its spec and make targets are removed; `sellTicketsToWaitlist` settles the waiting list | ADR-016 | committed (6ed207b) |
| Test sweep | dead and duplicate cases removed; cleanup fails early; factories, `gotoHydrated` and web-first waits replace raw sleeps; the `setup-season` project creates the active season once per run | `docs/testing.md` | packages 1–4 committed (5b1616b, b7d238d, 2d17d64, 45c1f83, 084ea42); 5 and 6 in progress |
| DRY sweep | dead code and duplicate token paths removed; the specs share their mount, endpoint and session helpers | `tests/component/testHelpers.ts`, `tests/component/hoistedMocks.ts` | committed (72cf9d9, 6b65a70, b456b2f, 999bdbd, c0beb62, 43876aa) |
| PRF spike | passkey and PRF research with the device protocol | `../feature-proposal-relogin-faceid.md`, `../archived/feature-mobile-native-feel.md` | committed |
| One booking path, end to end | outcomes in, notification out; the scaffold survives a partial failure and reports per person; the waiting list catches up; one client write; preview and toast from one word table; the ticket history follows kuverter | § One booking path, end to end | points 1–5 committed (2ad1429 to 7b6a622); 6 and 6b in progress; 7 awaiting signoff |
| Docs and tooling | the user, chef and admin guides; `docs/ui.md` and the compliance tables compacted; `docs/testing.md` Rule 0; the ui skill and the frontend agent | `docs/`, `.claude/skills/`, `.claude/agents/` | committed (b82852e, 38804ef, 0dfd8eb, 450bcc8) |

## Open before the release

| Item | State |
|---|---|
| One booking path, end to end | points 6, 6b and 7, § One booking path, end to end |
| Waitlist notifications | planned, § Waitlist notifications |
| CI summary | read on the Actions run page: categories, counts, red ui failures, report links |
| Visual check per UI package | the route → viewport → element tables, carried into the PR description |

## CI test reporting

Vitest writes the unit summary. `make test-report` renders a Playwright suite (api, ui, smoke) from its JSON with
counts, a ❌ heading on failures and the report artifact link. The ui suite keeps `continue-on-error`.

## Prisma bundle

One package and one migration, `0017_roster`, applied on local, dev and prod 2026-10-08. The models, the majors and
the partial unique indexes are `prisma/schema.prisma`.

| Model / change | Design |
|---|---|
| `DinnerDutyTemplate`, `DinnerDuty`, `DutyHistory`, `DutyState`, `DutyAuditAction` | `../feature-proposal-duty-roster.md` § Schema additions |
| `JokerSlot` | `../archived/feature-joker-slot.md` |
| `TicketWaitlist` | `../archived/feature-waitlist.md` |
| `LedgerEntryType`, `Transaction.type` and `description`, `Expense`, `DinnerEvent.totalCost` deprecated | `../feature-proposal-adhoc-admin-billing.md` § Data model |

## Chef spending

Signed 2026-10-11 and 12. Expenses are rows of the `Expense` table, outside invoicing. The chef card carries the
Madbestilling row and its editor, the Budget pane with its boxes, the ticket table, the dinner's and the team's
spending and Se billetændringer. Mockups: the headers of `ChefMenuCard.vue`, `DinnerBudget.vue`, `ExpenseLines.vue`,
`CookingRoundSpending.vue` and `TicketChanges.vue`. The grocery line's note is prefilled by
`useBilling.expenseNoteWords`. Specs: `chef/expenses.e2e.spec.ts`, `ChefExpenses.e2e.spec.ts`,
`chef/orderHistory.e2e.spec.ts`, the chef component specs.

## Kitchen allergy line

UX signed 2026-10-08, stats bar ink 2026-10-10. The dining-mode panel heads carry the allergy glyph and the kuverter
of allergic diners; the expanded list opens with the overview line and marks each diner's allergy types. Mockups:
`KitchenPreparation.vue` and `AllergyOverviewLine.vue` headers. Code: `useAllergy.ts` (`computeAllergenOverview`,
`computeAffectedDiners`), `AllergyTypeDisplay.vue` compact face, `COMPONENTS.kitchen`, `COMPONENTS.allergyOverview`.
Specs: `useAllergy.unit.spec`, `KitchenPreparation.nuxt.spec`, `AllergyTypeDisplay.nuxt.spec`.

## Chef allergen line

UX signed 2026-10-09. The ALLERGENER row counts the dinner's diners per menu allergen through the same overview; the
edit panel is the allergy panel. Mockups: `ChefMenuCard.vue` and `AllergenMultiSelector.vue` headers. Specs:
`ChefMenuCard.nuxt.spec` (Allergen line).

## Chef calendar header

Signed 2026-10-10. One header row: the Agenda/Kalender tabs beside a chevron over a `UCollapsible`; `/chef` hydrates
with one footer. Mockup: `ChefCalendarDisplay.vue` header. Tokens: `COMPONENTS.chefCalendar`,
`COMPONENTS.collapsible`. Specs: `ChefCalendarDisplay.nuxt.spec`, `Chef.e2e.spec` (hydration guard).

## Ticket allergies

UX signed 2026-10-11. A booked inhabitant's live allergies: the glyph in the ticket card's special slot and the
compact allergy line in the expanded row. Mockups: `DinnerTicket.vue` and `DinnerBookingForm.vue` headers. Specs:
`DinnerTicket.nuxt.spec`, `DinnerBookingForm.nuxt.spec`, `useCoreValidation.unit.spec`, `Dinner.e2e.spec` (Ticket
allergies).

## One booking path, end to end

### Problem

An admin's preference change for a whole household (power mode) released the tickets past the deadline, then failed
when the first released ticket went to the waiting list: the scaffold resolved the mail settings without a request, and
locally `DEPLOY_URL` is unset. The failure skipped the rest of the household's steps (the cancellations of the open
dinners and the assignment to the waiting list) and dropped the household's counts from the reply, so the toast read
only "fejlede", in green. Other views in the session kept the old released counts until reload, the waiting list stayed
beside tickets for sale, and "Se billetændringer" left the releases out (it drops every system update).

### Points

Each point is presented with its files and code, and signed off on its own.

| Point | What | Status |
|---|---|---|
| 1. Mail is configured or off | The notification service decides its channels from the environment; `DEPLOY_URL` unset means e-mail is off, a channel that is off logs the kind and the missing setting and reports not sent; the request fallback goes; `npm run dev` sets `DEPLOY_URL` locally | ✅ signed off 2026-10-14, implemented |
| 2. Notification after the action | The scaffold and the waiting-list steps send nothing and return outcomes that carry what a notification needs; the caller passes them to the notification service | ✅ signed off 2026-10-14, implemented |
| 3. The scaffold survives a partial failure | A failed write batch is retried order by order; the rest of the household runs on; the reply counts the orders per action, lists them per person for a household run and lists the failed orders; the preview and the reply name the action through one function (`actionOfUpdate`) | ✅ signed off 2026-10-15, implemented |
| 4. The waiting list catches up | A dinner's waiting list is one first-come-first-served line per ticket type; every save and every nightly run ends by selling the tickets for sale to the first in their type's line (`sellTicketsToWaitlist`), idempotent (ADR-015); a claim buys while nobody waits in its type's line; a place counts within its line; the save preview counts the tickets for sale of the row's type | ✅ signed off 2026-10-16, implemented |
| 4b. The views show each line | The chef's alert, the booking form and the kitchen box name the waiting list per ticket type; the kitchen box holds the tickets for sale and the waiting list together | kitchen box ✅ signed off 2026-10-16, implemented (§ Mockup — kitchen box); the chef's alert ✅ signed off 2026-10-17, implemented (`SUPPLY_WORDS.queuedCount`, mockup in `ChefMenuCard.vue`) |
| 4c. The preview sells each ticket once | The save preview settles the claims in order as the save does: the first claims of a ticket type buy that type's tickets for sale, the rest join its waiting list (`bookingOutcomes` takes one order or a list, `supplyOfType`); the guest form opens on Voksen and its button names the guests | ✅ signed off 2026-10-16, implemented |
| 5. One client write | Every write that changes bookings goes through `bookingsStore.writeBookings`: the request, then the household's orders, the upcoming orders, the tickets for sale, the waiting list and the dinner on view re-read once; the waiting list per locked dinner derives from the one waiting-list read; the households store keeps its own household re-reads | ✅ signed off 2026-10-17, implemented |
| 6. Preview and toast from one word table | Future words in the preview, past words in the toast, grouped per person; the toast is red as soon as one item failed, green otherwise | toast look implemented 2026-10-16 (`scaffoldToastLook`); the words ✅ signed off 2026-10-17 (§ Mockup — toast and preview) |
| 6b. The mails speak the booking words | The waiting-list mails greet the user who booked, name the person as the toast does, carry the ticket line of the booking page and the badge's help text, and link to the dinner's booking page | mockup ✅ signed off 2026-10-17 (§ Mockup — waiting-list mails) |
| 7. The ticket history follows kuverter | Every audit row replays, system or member alike; a line for each change of kuverter; a system run and the nightly close are one line for the dinner; the replay ends equal to state | mockup ✅ signed off 2026-10-17 (§ Mockup — ticket history) |

### Coverage

The preference-change cases (`household/preferences.e2e.spec.ts`, `admin/inhabitant.e2e.spec.ts`,
`serial/admin/scaffold-prebookings.e2e.spec.ts`) release tickets on dinners without a waiting list; the waiting-list
cases release through the member's booking route. The package adds the case that joins them.

| Case | Level |
|---|---|
| GIVEN a dinner past its booking deadline with a waiting entry at a household's ticket price WHEN an admin sets the household's preferences to Ingen THEN the first in the waiting list holds the ticket, the household's orders on open dinners are cancelled, and the reply lists the release and the cancellation with no failure | serial API e2e, `waitlistAssignment.e2e.spec.ts` |
| The same with e-mail off: the booking work completes and the reply carries the outcomes | unit, the scaffold with no `DEPLOY_URL` |
| GIVEN a batch write that fails WHEN it is retried order by order THEN the orders that land are reported and only the failing order is listed as failed | unit, `batchUtils.unit.spec.ts` |
| GIVEN an adult then a child waiting WHEN a child ticket is released THEN the child holds it and the adult still waits; daily maintenance then sells nothing more on that dinner | serial API e2e, `waitlistAssignment.e2e.spec.ts` |
| GIVEN a child waiting WHEN a household releases one child's ticket and claims one for its other child in one save THEN the waiting child holds the released ticket and the claimer joins the child line | serial API e2e, `waitlistAssignment.e2e.spec.ts` |
| One line per ticket type in join order; a place counts within its line | unit, `useWaitlist.unit.spec.ts` |
| A child row on a dinner with only an adult ticket for sale saves as "Skriv på venteliste", with a child ticket as "Køb billet" | component, `DinnerBookingForm.nuxt.spec.ts` |

### Mockup — toast and preview ✅ signed off 2026-10-17

```
Grid save after the deadline
Preview  [buy badge]    Anna køber en billet til salg: 19/10/2026
         [queue badge]  Anna skrives på ventelisten: 20/10/2026, 21/10/2026
         [queue badge]  Gæst af Anna skrives på ventelisten: 20/10/2026
Toast    Bookinger processeret                                    (green)
           Anna: 1 købt, 2 på ventelisten (Voksen #3, Voksen #5)
           Gæst af Anna: 1 på ventelisten (Voksen #6)

Grid power mode: Takeaway on Thursday (open), Ingen on Friday (past the deadline)
Preview  [edit badge]      Anna ændrer spisemåde til Takeaway: 22/10/2026
         [edit badge]      Lars ændrer spisemåde til Takeaway: 22/10/2026
         [released badge]  Anna frigiver sin billet: 23/10/2026
         [released badge]  Lars frigiver sin billet: 23/10/2026
Toast    Bookinger processeret                                    (green)
           Anna: 1 ændret spisemåde, 1 frigivet
           Lars: 1 ændret spisemåde, 1 frigivet

Preference power mode: Monday to Ingen, one order fails
Toast    Alle præferencer opdateret                               (red)
           Knud: 7 frameldt, 2 frigivet
           Lene: 6 frameldt, 2 frigivet, 1 fejlede
           1 billet solgt til ventelisten
           42 uændret
```

A preview line names its dinners in the default `formatDate`: each date up to three, else the count with the first and
last date ("Knud frameldes: 7 middage, 02/11/2026 – 14/12/2026"). A toast line counts per person; the sales to the
waiting list and the unchanged orders count for the household.

| Action | Preview, after the name | Toast, after the count |
|---|---|---|
| BOOK | tilmeldes | tilmeldt |
| CANCEL | frameldes | frameldt |
| RELEASE | frigiver sin billet | frigivet |
| RECLAIM | tilmeldes igen | tilmeldt igen |
| BUY | køber en billet til salg | købt |
| QUEUE | skrives på ventelisten | på ventelisten (Voksen #3) |
| LEAVE | forlader ventelisten | forlod ventelisten |
| REQUEUE | ændrer spisemåde til <spisemåde> (venteliste) | ændret spisemåde (venteliste) |
| CHANGE_MODE | ændrer spisemåde til <spisemåde> | ændret spisemåde |
| CHANGE_PRICE | ændrer billettype | ændret billettype |

`<spisemåde>` is the person's eating mode, `MODE_WORDS[dinnerMode].label`: Spisesal, Sen or Takeaway.

### Mockup — waiting-list mails ✅ signed off 2026-10-17

```
WAITLIST_JOINED  → the user who booked
Emne: Skråningen: Emil står på ventelisten til 20/10/2026 · Lasagne
  Kære Lene,

  20/10/2026 · Lasagne
  Emil: 1 på ventelisten (Barn #1)
  Barn · 35 kr · Spisesal

  Du får automatisk tildelt en billet, hvis en kommer til salg, eller chefkokken frigiver portioner.
  Du betaler, når du får en billet fra ventelisten.
  Du kan altid afmelde din ventelisteplads, hvis du ikke har brug for den alligevel.

  Se bookingen: https://skraaningen.dk/dinner?date=20/10/26

WAITLIST_TICKET_ASSIGNED  → the user who booked
Emne: Skråningen: Emil har fået en billet til 20/10/2026 · Lasagne
  20/10/2026 · Lasagne
  Emil: 1 købt
  Barn · 35 kr · Spisesal · fra Hansen
  Du betaler for billetten. Vi glæder os til at se jer.
  Se bookingen: …

WAITLIST_EXTRA_PORTION  → the user who booked
  20/10/2026 · Lasagne
  Emil: 1 tilmeldt
  Barn · 35 kr · Spisesal
  Køkkenholdet laver flere portioner, og en af dem er til Emil. Vi glæder os til at se jer.
  Se bookingen: …

TICKET_SOLD  → each user in the selling household
Emne: Skråningen: 1 billet til 20/10/2026 · Lasagne er solgt
  20/10/2026 · Lasagne
  1 billet solgt til ventelisten        (1 billet solgt til Jensen, when a user bought it)
  Voksen · 55 kr
  I betaler ikke længere for den.
  Se bookingen: …

WAITLIST_BUILDUP  → the chef, in the words of the chef's alert
Emne: Skråningen: 3V 1B på venteliste til 20/10/2026 · Lasagne
  3V 1B på venteliste · 5 portioner
  Mange skrånere mangler en billet til din middag — har du mulighed for at mætte flere munde?
  Det gør du under Flere på middagen: https://skraaningen.dk/chef
```

A guest reads "Gæst af Anna". The booking page's waiting-list badge carries the same help text. The join outcome
carries the guest flag, the ticket price and the eating mode; a sale carries the buyer's booking user, eating mode and
guest flag.

### Mockup — ticket history ✅ signed off 2026-10-17

```
Se billetændringer                                                                          [v]
Dato              Husstand  Ændring                     Billetter · kuverter     Indtægter
21/10/2026 02:00  System    lukket                      29V 11B 3b · 34,5        2.035 kr
20/10/2026 19:10  S_14      købt               +1V      29V 11B 3b · 34,5        2.035 kr
20/10/2026 12:40  S_31      frigivet           −2V      28V 11B 3b · 33,5        2.035 kr
20/10/2026 09:05  S_22      ændret billettype  −1B +1V  30V 11B 3b · 35,5        2.035 kr
── Framelding lukker · 19/10/2026 18:00 ─────────────────────────────────────────────────────
[Vis fuld historik]
```

Every audit row replays, user or system. A line appears when the tickets at the table change; a switch between eating
modes changes none. Billetter counts the tickets that eat; a released ticket leaves them and keeps its revenue until
someone buys it. A system run is one line for the dinner, named by its household when it touched one, else System; the
nightly close is one line, "lukket". The Ændring column reads the toast words of § Mockup — toast and preview. The last
line equals the dinner's counts in the kitchen box.

### Mockup — kitchen box ✅ signed off 2026-10-16

The mockup lives in the `KitchenPreparation.vue` header. Code: `WaitlistQueueSummarySchema.lines`, the bookings store's
`selectedDinnerWaitlist`, `COMPONENTS.kitchen.queue`. Specs: `KitchenPreparation.nuxt.spec` (TIL SALG box),
`bookings.nuxt.spec` (the queue's lines).

## Waitlist notifications

Planned. `WAITLIST_JOINED`, `WAITLIST_TICKET_ASSIGNED`, `WAITLIST_EXTRA_PORTION`, `WAITLIST_BUILDUP`, `TICKET_SOLD` are templates in
`app/config/notificationTemplates.ts` and events in `server/utils/sender/events/waitlist.ts`, sent after the booking
action from its outcomes. The package is one serial e2e that joins a queue, releases a ticket and portions,
crosses the buildup threshold and asserts each event writes its Delivery row.

## Decisions

**2026-10-05**
- One Prisma migration package for the push; the push earns v0.9; sizing is t-shirt.
- The push starts from the framework corner: a research spike precedes a major upgrade, and an upgrade removes
  workarounds and follows the framework's own shapes.
- Prisma and zod ride the Prisma bundle pinned at 7.10 and 4.6. Stable framework features only: `enabled` is in.
- A dependency sits in `package.json` while a file imports it; `@vueuse/core` left.
- CI reporting is per tool: vitest reports the unit run, `make test-report` one Playwright suite per call.
- Waitlist: the queue assigns by itself in strict FIFO by portion weight, one ticket per inhabitant; the chef releases
  extra portions; four notification kinds and the chef buildup threshold.
- Chef spending is tracking: expenses stay outside invoicing, and a chef's dinner expenses balance across the season.
- Release-portions is one form with two entries: the [Flere] menu of `ChefMenuCard` and a CTA alert while the queue
  holds entries. The kitchen stats panel's fourth box alternates TIL SALG and VENTELISTE.
- The dinner economy is one collapsed Budget pane: three boxes, the ticket table and the Forbrug entry; ticket types
  read their Danish names through `useTicket`.

**2026-10-06**
- The PRF spike is complete; its findings live in `../feature-proposal-relogin-faceid.md`.

**2026-10-07** (Prisma bundle)
- `TicketWaitlist` carries an unplaced order in its create shape as JSON, keyed by dinner, inhabitant and
  `isGuestTicket`; a guest entry sits on the booking member's `inhabitantId`; portion weights stay the config mapping.
- Partial unique indexes through the `partialIndexes` preview: one regular waitlist entry and one regular order per
  person per dinner.
- The store packages and the majors install run one after the other.

**2026-10-08** (ledger, migration, order uniqueness, ui suite)
- Ledger and expenses share `LedgerEntryType { REGULAR, ADHOC }`: a REGULAR entry hangs off its source, an ADHOC
  entry stands alone with a description.
- `Expense` is its own table, a list per dinner plus basisvarer rows; the payee is a `User` (`paidByUserId`,
  SET NULL) with a `userSnapshot`.
- `DinnerEvent.totalCost` is deprecated; the dinner's cost is the sum of its expense rows (ADR-010 rule 6).
- An adhoc charge's household lives in `orderSnapshot`.
- `strictUndefinedChecks` stays a preview feature; the zod generator emits enums only.
- Migration `0017_roster` adds columns with `ALTER TABLE … ADD COLUMN` and carries the `totalCost` → `Expense` data
  line.
- A unique violation answers 409 (ADR-002, `eventHandlerHelper`); the UI sends the order id for updates (ADR-016).
  The framelding billing import's e2e test is skipped.
- A schema change is followed by a review of the tests and validation comments that encode the old rule, before the
  suites run.
- Dependency policy: tilde ranges in `.npmrc` and `package.json`; Nuxt stays on 4.6.0.
- Local Playwright runs use three workers, CI one.
- One URL writer for the app (ADR-006 § URL Writes); ui specs that interact navigate through `gotoHydrated`
  (`docs/testing.md` Rule 3a) and URL assertions poll.

**2026-10-11**
- Ticket allergies: the ticket signals allergies with `ICONS.allergy` on the card and the compact
  `AllergyTypeDisplay` line in the expanded row. The card's row 1 is three fixed slots: special (state, guest,
  allergy), type, how you eat. The state colour paints the edge and the state glyph; the type colour paints the badge
  and the guest and allergy glyphs.
- One team number: the number in the team's name, else its position in the season's team list plus one
  (`getTeamNumber`); a site that shows a team passes the season's list.
- Season pick: seasons order active, in progress, upcoming, ended (`sortSeasonsByActivePriority`); the pick is the
  first season of that order that has yet to end.
- One breakpoint source: `useTheSlopeDesignSystem` injects the layout's `isMd`; a value that follows the breakpoint
  is a responsive token, behaviour reads `breakpoint`, and the household calendar's open state is `?cal=`.

**2026-10-12**
- Season status: `SEASON_STATUS_GLYPHS` keyed by the four statuses, rendered as a `UBadge` by the season selector and
  the season status display.
- One booking path: a member sends a desired order through the scaffold; the generator decides create or claim by the
  deadline, and the executor claims a released ticket or queues (ADR-016). Waitlist reads are open to a logged-in member.
- Waitlist UI: the queued row shows the wish ghosted (`COMPONENTS.waitlist`) through `DinnerModeSelector`, the
  hourglass takes the state cell, and the save label previews the outcome.
- Tests: one level per behaviour, the lowest that proves it (`docs/testing.md` Rule 0).

**2026-10-13**
- The billing periods and the current period load on request (`loadBillingOverview`); the order snapshot on a
  transaction stays, since a transaction outlives its order.
- A single delete returns the deleted id and a bulk delete the count (ADR-009 rule 7); the team and joker slot deletes
  are single `delete` calls.
- Page composition: the frames stay (`../archived/feature-proposal-framework-adoption.md`).

**2026-10-14** (one booking path, end to end)
- Notification happens after the action: the scaffold and the waiting-list steps do the booking work and return
  outcomes; the caller hands them to the notification service, which picks the channels and decides whether each is
  set in the environment.
- Mail is configured or off: `DEPLOY_URL` is the one source of the site; unset, e-mail is off and logs.
- The scaffold survives a partial failure and reports per person.
- Toast colour B: red as soon as one item failed, green otherwise.
- A ticket sale is its own event: whenever a released ticket gets a new owner, the selling household hears it,
  named with the buying household's shortname (`TICKET_SOLD`). A waiting entry hears when it gets a ticket, a released
  one (`WAITLIST_TICKET_ASSIGNED`, naming seller and buyer) or one of the chef's extra portions
  (`WAITLIST_EXTRA_PORTION`). The chef cooks more; the waiting entries that fit get regular orders.
- Outcomes are one list per event (`joined`, `ticketsSold`, `waitlistTicketsSold`), with no nullable field standing for
  a second meaning; the claim returns the selling household, so the sold mail reaches the household whose ticket it was.
- The ticket history replays system updates; a change between eating modes stays out of it (option A); the nightly
  close is one line for the dinner.

**2026-10-16** (one booking path, end to end)
- The waiting list is one first-come-first-served line per ticket type: a released child ticket goes to the first child
  waiting, whoever waits in the adult line. The sale is `sellTicketsToWaitlist`; a line without supply logs info.
- A sold ticket keeps its price row: the buyer pays its price and eats its portions.
- The kitchen box holds the tickets for sale and the waiting list together (point 4b).
- The kitchen box is one box under the title TIL SALG: the waiting list buys what is for sale. Its waiting-list part
  carries the hourglass and the word VENTELISTE, its portions and its ticket count, without a share.
- One vocabulary across the views: a household frigiver a ticket, the ticket is til salg, someone køber it, the people
  waiting stand på ventelisten. A place is "#n i kø" ("#" throughout); the ticket type names the line: the shorthand
  beside the name in the kitchen ("Emil (B #1)"), the word in a sentence ("Barn: #1 i kø"), "Billettype: Barn" in the
  mail, and the row's ticket beside the place badge in the booking form. A count after a number uses the shorthands
  (4V, 1B).
- The guest form's button names the guests ("Tilmeld gæst", "Tilmeld gæster"); its preview lines name each guest's
  outcome. The guest form opens on Voksen.

**2026-10-17** (one booking path, end to end)
- The kitchen box's waiting list reads like the other boxes' rows: one row per household, in the order its first member
  joined, each person with the place in the line of the ticket type.
- The waiting list's glyph is the Hugeicons hourglass, the set of the role icons: an outline that fills its box like the
  glyphs beside it. Icon use is symmetric: each part of the TIL SALG box carries its glyph beside its kuverter, as the
  allergy line does, the released glyph and the hourglass; the titles and the list headings carry none.
- The preview and the toast read from one word table: the preview names each person's action with its dinners' dates, the
  toast counts per person and closes with the sales to the waiting list and the unchanged orders. A waiting-list place
  reads as the ticket badge names its type, "Voksen #3", in the preview, the toast, the booking form's waiting-list badge
  and the kitchen box.

## Coverage

| Package | Tests |
|---|---|
| Framework upgrades | `npm run pre:all`, `make unit-test`, `npm run test:e2e:api` per cluster |
| Factory, gating, 401 | `../archived/feature-proposal-framework-adoption.md` § Shipped — pointers; the store specs' gated rows; `Login.e2e.spec.ts` |
| Prisma bundle | `migrations.unit.spec.ts`; `household.e2e.spec.ts` (409 for a duplicate pbsId) |
| Joker slot | `jokerSlot.e2e.spec.ts`, `JokerSlotForm.nuxt.spec.ts`, `CookingTeamCard.nuxt.spec.ts` |
| Waitlist | `waitlistAssignment.e2e.spec.ts`, `Waitlist.e2e.spec.ts`; the pieces in `../archived/feature-waitlist.md` |
| Waitlist notifications | planned: the serial e2e of § Waitlist notifications |
| Chef spending | `chef/expenses.e2e.spec.ts`, `ChefExpenses.e2e.spec.ts`, `chef/orderHistory.e2e.spec.ts`, the chef component specs |
| Admin economy loads on request | `bookings.nuxt.spec.ts` (gated reads), `admin-tab.nuxt.spec.ts` |
| Team and joker slot deletes return the deleted id | `team.e2e.spec.ts`, `jokerSlot.e2e.spec.ts`, `plan.nuxt.spec.ts` |
| Validation owns the types | `useBooking.nuxt.spec.ts` (`getNewOrderAction`, `getBookingOptions`) |
| UI packages | the component specs named in their sections |

## Verifications with human eyes

| Check | Where | State |
|---|---|---|
| Visual check per UI package | route → viewport → DS element → expectation, in the PR description | per package |
| PWA install and icon | phone home screen | ✅ 2026-10-13 |
| CI summary | Actions run page: categories, counts, red ui failures, report links | open |

## ADR notes

| ADR | Change in this release |
|---|---|
| ADR-002 | 409 for a unique violation |
| ADR-006 | § URL Parameters and § URL Writes |
| ADR-007 | `storeAsyncData` and `apiRequest`, rules 7 to 10 |
| ADR-009 | rule 7, what a delete returns |
| ADR-010 | rule 6, a deprecated column's value; rule 7, `portions` filled on read |
| ADR-012 | conditional spread in `where`, `Prisma.skip` in `data` |
| ADR-014 | `writeBatchOrEach` |
| ADR-015 | the waitlist clear in daily maintenance; the scaffold's idempotency through the generator; `sellTicketsToWaitlist` |
| ADR-016 | the claim bucket, the queue entry rows, the two deadline sets; rule 9, notification after the action; rule 10, a failed batch retried order by order; rule 11, one line per ticket type |
| ADR-018 | separators; table loading; the usage rules |
