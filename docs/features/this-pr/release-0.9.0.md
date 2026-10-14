# Release 0.9.0

**Status:** In progress | **Date:** 2026-10-05 | **Updated:** 2026-10-13 | **Branch:** `feature/work-roster`

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
| Waitlist | queue, assignment on release, extra portions, one booking path, UI | `../archived/feature-waitlist.md`, ADR-016 | committed (5eedd34, 5f50af2, c151d74, f4892ad) |
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
| Validation owns the types | `TicketType` and the booking row action (`BookingRowActionSchema`) come from `useBookingValidation`; `app/utils/portions.ts` and `useBooking.ts` import them | ADR-001 | signed off |
| DRY sweep | dead code and duplicate token paths removed; the specs share their mount, endpoint and session helpers | `tests/component/testHelpers.ts`, `tests/component/hoistedMocks.ts` | committed (72cf9d9, 6b65a70, b456b2f, 999bdbd, c0beb62, 43876aa) |
| PRF spike | passkey and PRF research with the device protocol | `../feature-proposal-relogin-faceid.md`, `../archived/feature-mobile-native-feel.md` | committed |
| One booking path, end to end | outcomes in, notification out; the scaffold survives a partial failure and reports per person; the waiting list catches up; one client write; preview and toast from one word table; the ticket history follows kuverter | § One booking path, end to end | planned |
| Docs and tooling | the user, chef and admin guides; `docs/ui.md` and the compliance tables compacted; `docs/testing.md` Rule 0; the ui skill and the frontend agent | `docs/`, `.claude/skills/`, `.claude/agents/` | committed (b82852e, 38804ef, 0dfd8eb, 450bcc8) |

## Open before the release

| Item | State |
|---|---|
| One booking path, end to end | planned, § One booking path, end to end; seven points, each signed off on its own |
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
| 1. Mail is configured or off | The notification service decides its channels from the environment; `DEPLOY_URL` unset means e-mail is off, a channel that is off logs the kind and the missing setting and reports not sent; the request fallback goes | ✅ signed off 2026-10-14 |
| 2. Notification after the action | The scaffold and the waiting-list steps send nothing and return outcomes that carry what a notification needs; the caller passes them to the notification service | ⏳ awaiting signoff |
| 3. The scaffold survives a partial failure | Each step's failure lands on its item and the rest runs on; the reply is the executed plan, one item per order, built by the function that builds the preview; counts are grouped from the items | ⏳ awaiting signoff |
| 4. The waiting list catches up | A ticket for sale at a waiting entry's price goes to the first in the waiting list at release, after each scaffold run on its dinners and in daily maintenance; idempotent (ADR-015) | ⏳ awaiting signoff |
| 5. One client write | Every booking write goes through one bookings-store action that refreshes orders, released tickets, the waiting list and the household | ⏳ awaiting signoff |
| 6. Preview and toast from one word table | Future words in the preview, past words in the toast, grouped per person; the toast is red as soon as one item failed, green otherwise | ⏳ awaiting signoff |
| 7. The ticket history follows kuverter | Every audit row replays, system or member alike; a line for each change of kuverter; a system run and the nightly close are one line for the dinner; the replay ends equal to state | ⏳ awaiting signoff |

### Coverage

The preference-change cases (`household/preferences.e2e.spec.ts`, `admin/inhabitant.e2e.spec.ts`,
`serial/admin/scaffold-prebookings.e2e.spec.ts`) release tickets on dinners without a waiting list; the waiting-list
cases release through the member's booking route. The package adds the case that joins them.

| Case | Level |
|---|---|
| GIVEN a dinner past its booking deadline with a waiting entry at a household's ticket price WHEN an admin sets the household's preferences to Ingen THEN the first in the waiting list holds the ticket, the household's orders on open dinners are cancelled, and the reply names each person's counts with no failure | serial API e2e, `scaffold-prebookings.e2e.spec.ts` |
| The same with e-mail off: the booking work completes and the reply carries the outcomes | unit, the scaffold with no `DEPLOY_URL` |

### Mockup — toast and preview ⏳ awaiting signoff

```
Preference change for the household, past the deadline, a waiting list on Monday
  Preview   Du er ved at ændre familiens booking
              Knud: 2 billetter frigives (1 til ventelisten), 4 skifter spisemåde, 14 frameldes
              Lene: 2 billetter frigives, 4 skifter spisemåde, 14 frameldes
  Toast     Alle præferencer opdateret (red: one item failed)
              Knud: 2 billetter frigivet (1 solgt til ventelisten), 4 skiftede spisemåde, 14 frameldt
              Lene: 2 billetter frigivet, 4 skiftede spisemåde, 13 frameldt, 1 fejlede

Grid save after the deadline
  Preview   Anna: 1 køber en ledig billet, 2 skrives på ventelisten
            Gæst af Anna: skrives på ventelisten
  Toast     Bookinger gemt (green)
              Anna: 1 købte en ledig billet, 2 kom på ventelisten (#3, #5)
              Gæst af Anna: kom på ventelisten (#6)

One dinner: a count of 1 drops
  Preview   Anna køber en ledig billet / Peter skrives på ventelisten
  Toast     Anna købte en ledig billet / Peter kom på ventelisten (#2)
```

## Waitlist notifications

Planned. `WAITLIST_JOINED`, `WAITLIST_TICKET_ASSIGNED`, `WAITLIST_BUILDUP` and `WAITLIST_TICKET_SOLD` are templates
in `app/config/notificationTemplates.ts` and events in `server/utils/sender/events/waitlist.ts`, emitted from the
assignment and the scaffold. The package is one serial e2e that joins a queue, releases a ticket and portions,
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
- The ticket history replays system updates; a change between eating modes stays out of it (option A); the nightly
  close is one line for the dinner.

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
| ADR-010 | rule 6, a deprecated column's value |
| ADR-012 | conditional spread in `where`, `Prisma.skip` in `data` |
| ADR-015 | the waitlist clear in daily maintenance; the scaffold's idempotency through the generator |
| ADR-016 | the claim bucket, the queue entry rows, the two deadline sets |
| ADR-018 | separators; the usage rules |
