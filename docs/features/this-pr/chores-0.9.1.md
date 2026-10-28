# 0.9.1 chores

**Status:** Next release | **Date:** 2026-10-08 | **Builds on:** release 0.9 (`archived/release-0.9.0.md` § Prisma bundle)

The release carries no migration; the schema work is in `../release-0.9.3/feature-0.9.3.md`.

QA with human eyes: [qa.md](qa.md). Review defects: [defects.md](defects.md).

## Delivered

| Delivery | Description or spec | Gherkin | Status |
|---|---|---|---|
| Workflow checks | `run:` reads `${{ }}` through `env`; `pre:all` runs CodeQL's Actions queries | – | done 93834f4 |
| Household data access and GET previews | ADR-004 § Access; previews are GETs | – | done 52c5d68 |
| Three faces on a phone (#171) | Three faces below md, five from md | – | done 0b6d7d0, signed off 2026-10-27 |
| One master-detail layout (#169) | `LAYOUTS.masterDetailPage` on the list-and-detail pages | – | done 0b6d7d0, signed off 2026-10-27 |
| Tests at the lowest level | Access cases per `docs/testing.md` Rule 0 | – | done ef54aa6 |
| Ticket counts per person | `personTicketCounts` in `useOrder` for the grid's name cell | – | done 4349c92, 8401b44, a7f6285 |
| UI cases fail on an unexpected API error | An undeclared 4xx or 5xx fails the UI case (`apiErrorGuard.ts`) | – | done 52c5d68, fc87352 |
| Dev-server flakes in CI | Three retry flakes fixed; a dropped D1 connection answers 503 | – | done 4349c92, fc87352 |
| Preferences at an inhabitant's creation | `InhabitantCreateSchema` omits `dinnerPreferences` | – | done 6a0b5e7 |
| User saves and deserializers | Partial save by id; one deserializer per user type | – | done f7a4b6f, signed off 2026-10-27 |
| The job boxes' latest run | Each job box reads its own latest run (`AdminSystem.vue`) | – | done 17c3401, signed off 2026-10-27 |
| Zero-portion tickets get a place | Books and cancels as before the deadline (ADR-016) | – | done 17c3401, signed off 2026-10-27 |
| Tables keep their columns on a phone | Job history and users scroll sideways | – | done d159610, signed off 2026-10-27 |
| Tables key their rows by id | `getRowId`, `useExpandableRow` | – | done ea978dd, d159610, 6a4f22e, 542b274, signed off 2026-10-27 |
| The grid shows the day view's tickets | `BookingGridView.vue` header | – | done ea978dd, aa1e6e3, 002c4ae, 6a4f22e, signed off 2026-10-27 |
| Chef calendar visit | A member opens another team's dinners from the chef calendar; mockups in `pages/chef/index.vue`, `MyTeamSelector.vue` | – | done 002c4ae, fba24af; open: defect 101 |

## In flight

Updated 2026-10-28. Release 0.9 shipped in f5b5205 (#168).

| Delivery | Description or spec | Gherkin | Status |
|---|---|---|---|
| Notification delivery | [feature-notification-delivery.md](feature-notification-delivery.md) | `booking-notifications.feature`, `billing-notifications.feature`, `chef-deadline-notifications.feature`, `delivery-records.feature`, `test-message.feature` (16586f1) | partly committed (8fa59aa, 39e14a6, 16586f1); open: chef deadlines, defects 27, 29–37 |
| Scaffold: a save naming an order bought by another household | § Scaffold: a save naming an order bought by another household | – | specified |
| Minimal test seasons | § Minimal test seasons | – | specified |
| Dates | ADR-017 compliance 8; open: `CountdownTimer.vue:142`, `useBilling.ts:169`, `date-fns` in 19 files, the specs' dates, named formats, stored dinner dates as UTC midnight, factory dates per call | – | partly committed (542b274) |
| Dinner page remounts on claim | § Dinner page remounts on claim | – | specified |
| Delete responses | § Delete responses | – | brief signed 2026-10-28 |
| DRY improvements | § DRY improvements | – | specified |
| AdminTeams loading row | § AdminTeams loading row | – | discovery |
| Avatar ring colours | § Avatar ring colours | – | specified |
| One path for the grid and the day view | § One path for the grid and the day view | – | • partly committed (9e75cef, fba24af, a7f6285): one row-type enum (`BookingRowTypeSchema`), the booking context (`bookingContextOf`) and one price lookup (`findTicketPriceById`) for both views; open: what the views still work out on their own<br>• brief signed 2026-10-28 |

## Dinner page remounts on claim

### Problem

Claiming or resigning a role on `/dinner` swaps the whole page for the loader and mounts it again: `assignRoleToDinner`
in `app/stores/plan.ts` awaits `refreshSelectedSeason()`, the dataset turns `pending`, `isPlanStoreReady` turns false,
and `app/pages/dinner/index.vue` replaces `<UPage>` with `<Loader>` until the refresh resolves.

### Solution

The page shows the loader on first load only; a refresh keeps the mounted tree and the store exposes a separate
`isRefreshing` flag for inline feedback (ADR-007 status computeds).

### TDD

`plan.nuxt`: a refresh after initialization keeps `isPlanStoreReady` true. `Chef.e2e` or `Dinner.e2e`: claiming a role
keeps the page mounted (the calendar keeps its open state, no loader).

### Affected

`app/stores/plan.ts`, `app/pages/dinner/index.vue`.

## Delete responses

### Problem

`deleteMany` on D1 reports the statement's change counter: the adapter returns `meta.changes` (`@prisma/adapter-d1`),
which the runtime computes from SQLite's `total_changes()`, and that total includes the rows a foreign key action
changes. The Heynabo import adds up the counts of `deleteInhabitantsByHeynaboId` and `deleteHouseholdsByHeynaboId`
(`server/utils/heynaboImportService.ts`), whose rows have cascading children, so its report counts the children too.
`DELETE /api/admin/team/assignment/[id]` is a single delete that answers a count; ADR-009 rule 7 gives a single delete
the deleted id.

### Solution

The bulk deletes read the ids they delete before the delete and report that length, as `deleteDinnerEvent` does
(`server/data/financesRepository.ts`). The assignment delete answers the deleted id through `IdSchema`, as the team and joker slot
deletes do.

### TDD

- Serial API: an import that removes an inhabitant with an allergy reports one deleted inhabitant.
- API: the assignment delete case asserts the deleted id; its 404 case stays.

### Affected

`server/data/prismaRepository.ts`, `server/utils/heynaboImportService.ts`, the assignment delete route,
`app/stores/plan.ts`, `tests/e2e/testDataFactories/seasonFactory.ts`, `team.e2e.spec.ts`,
`docs/adr-compliance-backend.md`.

## DRY improvements

### Route and composable leftovers

#### Problem

Six routes still spell a coerced id in a query schema (`order/index.get.ts`, `admin/dinner-event/index.get.ts`,
`admin/team/index.get.ts`, `household/allergy/index.get.ts`, `billing/index.get.ts`, `admin/household/inhabitants/[id].post.ts`
`seasonId`) beside `RouteIdSchema`. `useQueryParam.ts` repeats the normalize-or-default block three times. 
`app/stores/users.ts` exposes no `isEmpty` and `isStoreReady` (ADR-007 r2); `usePermissions.ts` and
`useUserRoles.ts` import `SystemRoleSchema` from the generated layer where ADR-001 routes it through `useCoreValidation`.
`chef/dinner/[id]/order-history.get.ts`, `expenses/index.get.ts` and `expenses/[expenseId].delete.ts` log no success line
(ADR-004).

#### Solution

`RouteIdSchema` / `RouteIdSchema.optional()` in the six query schemas; one `fallback(invalid)` in `useQueryParam`.
The users store gains the two flags with a case each; the two composables import the enum from `useCoreValidation`;
the three chef routes log one `console.info` on success.

#### Affected

The six query routes, the three chef routes, `app/composables/useQueryParam.ts`, `usePermissions.ts`, `useUserRoles.ts`,
`app/stores/users.ts` and its spec, `docs/adr-compliance-backend.md` rows.

### Waitlist chip

#### Problem

`BookingGridView.vue` and `DinnerModeLegend.vue` each spell the same template: a `UChip` on `COMPONENTS.waitlist.chip`
with the hourglass (`COMPONENTS.waitlist.chipIcon`) over the ghosted wish.

#### Solution

One component renders the chip with a slot for the ghosted wish; the grid cell and the legend use it.

#### Affected

`app/components/booking/BookingGridView.vue`, `app/components/dinner/DinnerModeLegend.vue`, their component specs.

### Hand-written types in the design system

#### Problem

`useTheSlopeDesignSystem.ts` still spells types by hand: `ResidencyAlertKind` extracts a hand-written union of alert
kinds, `RESIDENCY_CONFIG` declares an inline shape naming the domain fields `'movedInDate' | 'moveOutDate'`, and
`AlertUi` / `AlertKindConfig` restate Nuxt UI's alert props. The sentences of a closed dinner's supply live in two
homes: `DEADLINE_LABELS.BOOKING_CLOSED.availableText` in `useBooking.ts` and `SUPPLY_WORDS` in `useBookingUi.ts`; the
"ledig / ledige" plural rule is written in `createBookingBadge` and in `GuestBookingForm.vue`.

#### Solution

A key type derives from its token (`keyof typeof`), a domain field name from the validation composable's schema
(`HouseholdSchema.keyof()`), a Nuxt UI shape from the library's prop types (`AlertProps`). The supply sentences and
the plural rule live once, in `useBookingUi`, and both badges and the guest form read them.

#### Affected

`app/composables/useTheSlopeDesignSystem.ts`, `app/composables/useBookingUi.ts`, `app/composables/useBooking.ts`
(`DEADLINE_LABELS`), `app/components/booking/GuestBookingForm.vue`, their specs.

## Notification delivery

Priority: high, issue #170. Status: design awaiting approval (2026-10-25). Spec:
[feature-notification-delivery.md](feature-notification-delivery.md).

## Scaffold: a save naming an order bought by another household

Priority: low. Moved from release 0.9 on 2026-10-19. `POST /api/household/order/scaffold` lists an order that another
household has since bought in `failed`; the case has no e2e (`../adr-compliance-backend.md`, the scaffold row). The
API e2e: a draft naming the order after its sale; the reply lists it in `failed`, and the buying household keeps the
ticket.

## Minimal test seasons

Priority: low. Added 2026-10-19 from the e2e work on `scaffold-prebookings.e2e` (release 0.9, the rule in
`../testing.md` § Strategy: Control the Season, Control the Deadline).

### Problem

These fixtures span more dinners than their cases prove:

| Fixture | Season | The cases prove |
|---|---|---|
| `tests/e2e/ui/serial/DinnerBookingForm.e2e.spec.ts:280`, the past-window season | 14 days of weekdays | the second dinner (two dinners) |
| `tests/e2e/ui/serial/AdminEconomy.e2e.spec.ts:53` | 14 days | a correction of an upcoming order |
| `tests/e2e/ui/serial/DinnerBookingForm.e2e.spec.ts:61` | 14 days | up to the fifth future dinner |
| `tests/e2e/ui/serial/HouseholdBookings.e2e.spec.ts:62` | 14 days of weekdays | the phone month grid's columns |
| `tests/e2e/api/serial/admin/waitlistAssignment.e2e.spec.ts:68` | 10 days | the spec's own dinners; the generated ones go unused |
| `tests/e2e/ui/serial/HouseholdScaffolding.e2e.spec.ts:82`, `HouseholdBookingsCrossHousehold.e2e.spec.ts:54`, `tests/e2e/api/serial/admin/seasonLiveEdit.e2e.spec.ts:46` | 10 days each | a dinner before and one after the deadline |
| `tests/e2e/api/serial/admin/scaffold-prebookings.e2e.spec.ts:624`, the released ticket on a cancelled dinner | the default week | one dinner |

### Solution

Each fixture's season shrinks to the dinners its cases prove; each case is checked green when its season shrinks.

## AdminTeams loading row

Moved from release 0.9 on 2026-10-18. After a season switch the table shows the previous season's teams under the
loading bar; with the loading row, a team save's re-read closes the team detail docked under its row on a phone.
Where: `app/components/admin/AdminTeams.vue:396`, ADR-018 § Table loading. **OPEN:** the loading row with the docked
detail closing, or a docked detail that survives the re-read.

## Avatar ring colours

Moved from release 0.9; brief presented 2026-10-20. `UserListItem` builds `md:ring-${color}` at runtime, which Tailwind
leaves out of the CSS, so from md up the faces on Præferencer and in the allergy alert ring in the text colour. The
token holds one class string per use (`household` warning, `inhabitant` primary, `allergyManager` ocean-500), the prop
takes its key, the raw `"ocean-500"` in `AllergyManagersList.vue:48` goes, and the `UserListItem` spec checks each
key's token. Where: `useTheSlopeDesignSystem.ts` `userListItem.ring`, `UserListItem.vue:143`, `HouseholdCard.vue:308`.

## One path for the grid and the day view

### Problem

The week grid and the day view each work out a person's ticket and waiting-list place, the ticket's price and type,
the mode a cell shows, the planned booking, the guest rows, a row's booking choices and a cancelled dinner with
helpers of their own, so the two views can show different numbers for one dinner.

### Solution

- Both views read each of these through one shared function in the booking composables, and keep no helper of
  their own for them; the row types are one enum.
- The ticket held is a booked ticket's own price and type, else the price for the person's age on the dinner's date
  (The grid shows the day view's tickets, delivered).
- Both views ask for the planned bookings of their dinners that have not started.
- Everything else each view shows stays as it is.
- The open part, signed 2026-10-28: one function each for what a person holds on a dinner, the guest rows, the planned
  bookings of the dinners not started, and a cancelled dinner, the last also for the chef card, the state stepper, the
  menu card and the calendar.

### TDD

- Unit: each shared function, with the cases the views' copies cover.
- `BookingGridView.nuxt.spec.ts`, `DinnerBookingForm.nuxt.spec.ts`: their assertions stay green.

### Affected

`useBooking.ts`, `useBookingUi.ts`, `useTicket.ts`, `BookingGridView.vue`, `DinnerBookingForm.vue`.
